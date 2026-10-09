import re
import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

approval_bp = Blueprint("approvals", __name__)

@approval_bp.route("/bulk-approve", methods=["POST"], strict_slashes=False)
@token_required
def bulk_approve():
    db = get_database()
    data = request.get_json() or {}
    approval_ids = data.get("approval_ids", [])
    
    if not approval_ids or not isinstance(approval_ids, list):
        return jsonify({"error": "Validation Error", "detail": "approval_ids list is required"}), 400
        
    valid_ids = [ObjectId(aid) for aid in approval_ids if is_valid_object_id(aid)]
    if not valid_ids:
        return jsonify({"error": "Validation Error", "detail": "No valid IDs provided"}), 400
        
    now = datetime.now(timezone.utc)
    res = db.approvals.update_many(
        {"_id": {"$in": valid_ids}},
        {"$set": {
            "status": "APPROVED",
            "approved_by": g.current_user["_id"],
            "approved_at": now,
            "updated_at": now
        }}
    )
    
    # Sync with appointments
    approvals = list(db.approvals.find({"_id": {"$in": valid_ids}}))
    appt_ids = [a["appointment_id"] for a in approvals if a.get("appointment_id")]
    if appt_ids:
        db.appointments.update_many(
            {"_id": {"$in": appt_ids}},
            {"$set": {"approval_status": "APPROVED", "status": "APPROVED", "updated_at": now}}
        )
        
    return jsonify({
        "message": f"Successfully approved {res.modified_count} requests",
        "modified_count": res.modified_count
    }), 200

@approval_bp.route("/bulk-reject", methods=["POST"], strict_slashes=False)
@token_required
def bulk_reject():
    db = get_database()
    data = request.get_json() or {}
    approval_ids = data.get("approval_ids", [])
    reason = (data.get("reason") or "Bulk clearance rejection by clinical staff.").strip()
    
    if not approval_ids or not isinstance(approval_ids, list):
        return jsonify({"error": "Validation Error", "detail": "approval_ids list is required"}), 400
        
    valid_ids = [ObjectId(aid) for aid in approval_ids if is_valid_object_id(aid)]
    if not valid_ids:
        return jsonify({"error": "Validation Error", "detail": "No valid IDs provided"}), 400
        
    now = datetime.now(timezone.utc)
    res = db.approvals.update_many(
        {"_id": {"$in": valid_ids}},
        {"$set": {
            "status": "REJECTED",
            "rejection_reason": reason,
            "approved_by": g.current_user["_id"],
            "rejected_at": now,
            "updated_at": now
        }}
    )
    
    # Sync with appointments
    approvals = list(db.approvals.find({"_id": {"$in": valid_ids}}))
    appt_ids = [a["appointment_id"] for a in approvals if a.get("appointment_id")]
    if appt_ids:
        db.appointments.update_many(
            {"_id": {"$in": appt_ids}},
            {"$set": {"approval_status": "REJECTED", "status": "CANCELLED", "updated_at": now}}
        )
        
    return jsonify({
        "message": f"Successfully rejected {res.modified_count} requests",
        "modified_count": res.modified_count
    }), 200

@approval_bp.route("", methods=["GET"], strict_slashes=False)
@approval_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_approvals():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id = request.args.get("patient_id")
    doctor_id = request.args.get("doctor_id")
    status_arg = request.args.get("status")
    search = request.args.get("search", "").strip()
    
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
        
    try:
        limit = int(request.args.get("limit", 10))
    except (ValueError, TypeError):
        limit = 10
        
    query = {}
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patient = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if patient:
            query["patient_id"] = patient["_id"]
        elif patient_id and is_valid_object_id(patient_id):
            query["patient_id"] = ObjectId(patient_id)
    else:
        if patient_id and is_valid_object_id(patient_id):
            query["patient_id"] = ObjectId(patient_id)
            
    if doctor_id and is_valid_object_id(doctor_id):
        query["doctor_id"] = ObjectId(doctor_id)
        
    # Search logic
    if search:
        s_clean = re.escape(search)
        or_conds = [
            {"patient_name": {"$regex": s_clean, "$options": "i"}},
            {"doctor_name": {"$regex": s_clean, "$options": "i"}},
            {"hospital_name": {"$regex": s_clean, "$options": "i"}},
            {"reason": {"$regex": s_clean, "$options": "i"}},
        ]
        if is_valid_object_id(search):
            or_conds.append({"_id": ObjectId(search)})
            or_conds.append({"appointment_id": ObjectId(search)})
        query["$or"] = or_conds
        
    # Compute base stats
    base_query = {k: v for k, v in query.items()}
    total_count = db.approvals.count_documents(base_query)
    pending_count = db.approvals.count_documents({**base_query, "status": "PENDING"})
    approved_count = db.approvals.count_documents({**base_query, "status": "APPROVED"})
    rejected_count = db.approvals.count_documents({**base_query, "status": "REJECTED"})
    
    # Status filter
    if status_arg and status_arg.upper() != "ALL":
        query["status"] = status_arg.upper()
        
    filtered_total = db.approvals.count_documents(query)
    total_pages = max(1, math.ceil(filtered_total / limit)) if limit > 0 else 1
    skip_val = (page - 1) * limit if limit > 0 else 0
    
    cursor = db.approvals.find(query).sort("created_at", -1)
    if limit > 0:
        cursor = cursor.skip(skip_val).limit(limit)
        
    approvals = list(cursor)
    
    # Enrich with appointment, patient, and doctor details
    for app in approvals:
        if app.get("appointment_id"):
            appt = db.appointments.find_one({"_id": app["appointment_id"]})
            if appt:
                app["doctor_name"] = appt.get("doctor_name", app.get("doctor_name", "Medical Doctor"))
                app["hospital_name"] = appt.get("hospital_name", app.get("hospital_name", "CareBridge Hospital"))
                app["patient_name"] = appt.get("patient_name", app.get("patient_name", "Patient"))
                app["appointment_date"] = appt.get("appointment_date")
                app["appointment_time"] = appt.get("appointment_time")
                app["reason"] = appt.get("reason")
                app["booking_id"] = appt.get("booking_id", f"APT-{str(appt['_id'])[-6:].upper()}")
                
        if not app.get("booking_id"):
            app["booking_id"] = f"APP-{str(app['_id'])[-6:].upper()}"
            
        if app.get("patient_id"):
            pat = db.patients.find_one({"_id": app["patient_id"]})
            if pat:
                app["patient_phone"] = pat.get("phone", "—")
                app["patient_email"] = pat.get("email", "—")
                app["patient_id_code"] = pat.get("patient_id_code", f"PT-{str(pat['_id'])[-6:].upper()}")
                
    serialized = serialize_doc(approvals)
    return jsonify({
        "approvals": serialized,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "total": total_count,
            "pending": pending_count,
            "approved": approved_count,
            "rejected": rejected_count
        }
    }), 200

@approval_bp.route("/<approval_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_approval(approval_id):
    db = get_database()
    if not is_valid_object_id(approval_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid approval ID"}), 400
        
    approval = db.approvals.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        return jsonify({"error": "Not Found", "detail": "Approval not found"}), 404
        
    if approval.get("appointment_id"):
        appt = db.appointments.find_one({"_id": approval["appointment_id"]})
        if appt:
            approval["doctor_name"] = appt.get("doctor_name")
            approval["patient_name"] = appt.get("patient_name")
            approval["hospital_name"] = appt.get("hospital_name")
            approval["appointment_date"] = appt.get("appointment_date")
            approval["appointment_time"] = appt.get("appointment_time")
            approval["reason"] = appt.get("reason")
            
    return jsonify(serialize_doc(approval)), 200

@approval_bp.route("/<approval_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_approval(approval_id):
    db = get_database()
    if not is_valid_object_id(approval_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid approval ID"}), 400
        
    data = request.get_json() or {}
    status = (data.get("status") or request.args.get("status", "")).upper()
    reason = data.get("rejection_reason") or data.get("reason", "")
    
    if status not in {"APPROVED", "REJECTED", "PENDING"}:
        return jsonify({"error": "Validation Error", "detail": "Status must be APPROVED, REJECTED or PENDING"}), 400
        
    approval = db.approvals.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        return jsonify({"error": "Not Found", "detail": "Approval not found"}), 404
        
    now = datetime.now(timezone.utc)
    update_data = {
        "status": status,
        "approved_by": g.current_user["_id"],
        "updated_at": now,
    }
    if status == "APPROVED":
        update_data["approved_at"] = now
    elif status == "REJECTED":
        update_data["rejected_at"] = now
        if reason:
            update_data["rejection_reason"] = reason
            
    db.approvals.update_one({"_id": ObjectId(approval_id)}, {"$set": update_data})
    
    # Sync with appointment
    if approval.get("appointment_id"):
        appt_status = "APPROVED" if status == "APPROVED" else ("CANCELLED" if status == "REJECTED" else "PENDING")
        db.appointments.update_one(
            {"_id": approval["appointment_id"]},
            {"$set": {"approval_status": status, "status": appt_status, "updated_at": now}}
        )
        
    return jsonify({
        "message": f"Approval {status.lower()} successfully",
        "approval_id": approval_id,
        "status": status
    }), 200

@approval_bp.route("/<approval_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_approval(approval_id):
    db = get_database()
    if not is_valid_object_id(approval_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid approval ID"}), 400
        
    result = db.approvals.delete_one({"_id": ObjectId(approval_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Approval not found"}), 404
    return jsonify({"message": "Approval deleted successfully"}), 200
