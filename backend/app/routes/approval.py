from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

approval_bp = Blueprint("approvals", __name__)

@approval_bp.route("/<appointment_id>", methods=["POST"], strict_slashes=False)
@token_required
def create_approval(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    existing = db.approvals.find_one({"appointment_id": ObjectId(appointment_id)})
    if existing:
        return jsonify({"error": "Conflict", "detail": "Approval already exists"}), 409
        
    approval = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "doctor_id": appointment.get("doctor_id"),
        "status": "PENDING",
        "approved_by": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = db.approvals.insert_one(approval)
    return jsonify({
        "message": "Approval created successfully",
        "approval_id": str(result.inserted_id),
        "status": "PENDING"
    }), 201

@approval_bp.route("", methods=["GET"], strict_slashes=False)
@approval_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_approvals():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id = request.args.get("patient_id")
    doctor_id = request.args.get("doctor_id")
    
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
        
    approvals = list(db.approvals.find(query).sort("created_at", -1))
    
    # Enrich with details
    for app in approvals:
        if app.get("appointment_id"):
            appt = db.appointments.find_one({"_id": app["appointment_id"]})
            if appt:
                app["doctor_name"] = appt.get("doctor_name")
                app["hospital_name"] = appt.get("hospital_name")
                app["patient_name"] = appt.get("patient_name")
                app["appointment_date"] = appt.get("appointment_date")
                app["appointment_time"] = appt.get("appointment_time")
                app["reason"] = appt.get("reason")
                
    return jsonify(serialize_doc(approvals)), 200

@approval_bp.route("/<approval_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_approval(approval_id):
    db = get_database()
    if not is_valid_object_id(approval_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid approval ID"}), 400
        
    approval = db.approvals.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        return jsonify({"error": "Not Found", "detail": "Approval not found"}), 404
        
    return jsonify(serialize_doc(approval)), 200

@approval_bp.route("/<approval_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_approval(approval_id):
    db = get_database()
    if not is_valid_object_id(approval_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid approval ID"}), 400
        
    data = request.get_json() or {}
    status = (data.get("status") or request.args.get("status", "")).upper()
    
    if status not in {"APPROVED", "REJECTED"}:
        return jsonify({"error": "Validation Error", "detail": "Status must be APPROVED or REJECTED"}), 400
        
    approval = db.approvals.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        return jsonify({"error": "Not Found", "detail": "Approval not found"}), 404
        
    update_data = {
        "status": status,
        "approved_by": g.current_user["_id"],
        "updated_at": datetime.now(timezone.utc),
    }
    if status == "APPROVED":
        update_data["approved_at"] = datetime.now(timezone.utc)
        
    db.approvals.update_one({"_id": ObjectId(approval_id)}, {"$set": update_data})
    
    # Sync with appointment
    if approval.get("appointment_id"):
        db.appointments.update_one(
            {"_id": approval["appointment_id"]},
            {"$set": {"approval_status": status, "status": status, "updated_at": datetime.now(timezone.utc)}}
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
