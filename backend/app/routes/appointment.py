import re
import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

appointment_bp = Blueprint("appointments", __name__)

@appointment_bp.route("", methods=["POST"], strict_slashes=False)
@appointment_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_appointment():
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}
    
    patient_id = data.get("patient_id")
    hospital_id = data.get("hospital_id")
    doctor_id = data.get("doctor_id")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")
    reason = (data.get("reason") or "General Consultation").strip()
    
    if not patient_id or not doctor_id or not appointment_date or not appointment_time:
        return jsonify({
            "error": "Validation Error",
            "detail": "patient_id, doctor_id, appointment_date, and appointment_time are required"
        }), 400
        
    if not is_valid_object_id(patient_id) or not is_valid_object_id(doctor_id):
        return jsonify({
            "error": "Validation Error",
            "detail": "Invalid ID format for patient or doctor"
        }), 400
        
    # Check patient
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    # Check doctor
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    # Check or resolve hospital
    if not hospital_id and doctor.get("hospital_id"):
        hospital_id = str(doctor["hospital_id"])
    elif not hospital_id:
        # Check if any default hospital exists
        hosp = db.hospitals.find_one()
        if hosp:
            hospital_id = str(hosp["_id"])
            
    hospital = None
    if hospital_id and is_valid_object_id(hospital_id):
        hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        
    # Prevent duplicate active slot booking for the same doctor
    existing = db.appointments.find_one({
        "doctor_id": ObjectId(doctor_id),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "status": {"$in": ["PENDING", "APPROVED", "CONFIRMED"]}
    })
    if existing:
        return jsonify({"error": "Conflict", "detail": "This doctor already has a booked consultation in this time slot."}), 409
        
    booking_code = f"APT-{str(ObjectId())[-6:].upper()}"
    
    appointment_doc = {
        "booking_id": booking_code,
        "patient_id": ObjectId(patient_id),
        "hospital_id": ObjectId(hospital_id) if hospital_id and is_valid_object_id(hospital_id) else None,
        "doctor_id": ObjectId(doctor_id),
        "doctor_name": doctor.get("name", "Medical Specialist"),
        "hospital_name": hospital.get("name", doctor.get("hospital_name", doctor.get("hospital", "CareBridge General Hospital"))),
        "patient_name": patient.get("name", "Registered Patient"),
        "patient_phone": patient.get("phone", ""),
        "patient_email": patient.get("email", ""),
        "specialty": doctor.get("specialty", "General Medicine"),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "reason": reason,
        "status": "APPROVED" if current_user.get("role") in ["STAFF", "ADMIN", "DOCTOR"] else "PENDING",
        "approval_status": "APPROVED" if current_user.get("role") in ["STAFF", "ADMIN", "DOCTOR"] else "PENDING",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.appointments.insert_one(appointment_doc)
    appointment_doc["_id"] = result.inserted_id
    
    # Also auto-create approval record
    try:
        approval_doc = {
            "appointment_id": result.inserted_id,
            "patient_id": ObjectId(patient_id),
            "doctor_id": ObjectId(doctor_id),
            "doctor_name": appointment_doc["doctor_name"],
            "patient_name": appointment_doc["patient_name"],
            "hospital_name": appointment_doc["hospital_name"],
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "reason": reason,
            "status": appointment_doc["approval_status"],
            "approved_by": current_user["_id"] if appointment_doc["approval_status"] == "APPROVED" else None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        db.approvals.insert_one(approval_doc)
    except Exception as e:
        print("Warning: could not auto-create approval doc:", e)
        
    return jsonify({
        "message": "Appointment booked successfully",
        "appointment_id": str(result.inserted_id),
        "booking_id": booking_code,
        "status": appointment_doc["status"],
        "appointment": serialize_doc(appointment_doc)
    }), 201

@appointment_bp.route("", methods=["GET"], strict_slashes=False)
@appointment_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_appointments():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id_arg = request.args.get("patient_id")
    doctor_id_arg = request.args.get("doctor_id")
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
        elif patient_id_arg and is_valid_object_id(patient_id_arg):
            query["patient_id"] = ObjectId(patient_id_arg)
    else:
        if patient_id_arg and is_valid_object_id(patient_id_arg):
            query["patient_id"] = ObjectId(patient_id_arg)
            
    if doctor_id_arg and is_valid_object_id(doctor_id_arg):
        query["doctor_id"] = ObjectId(doctor_id_arg)
        
    # Search logic
    if search:
        s_clean = re.escape(search)
        or_conds = [
            {"patient_name": {"$regex": s_clean, "$options": "i"}},
            {"doctor_name": {"$regex": s_clean, "$options": "i"}},
            {"specialty": {"$regex": s_clean, "$options": "i"}},
            {"reason": {"$regex": s_clean, "$options": "i"}},
            {"booking_id": {"$regex": s_clean, "$options": "i"}},
            {"patient_phone": {"$regex": s_clean, "$options": "i"}},
            {"patient_email": {"$regex": s_clean, "$options": "i"}},
        ]
        
        # Check if search term matches patient ID or appointment ID
        if is_valid_object_id(search):
            or_conds.append({"_id": ObjectId(search)})
            or_conds.append({"patient_id": ObjectId(search)})
            
        # Match flexible phone digits
        digits = re.sub(r"\D", "", search)
        if digits:
            digit_pattern = r"[\s\-\+\(\)]*".join(list(digits))
            or_conds.append({"patient_phone": {"$regex": digit_pattern, "$options": "i"}})
            
        query["$or"] = or_conds
        
    # Compute base counts before status filtering for stats badges
    base_query = {k: v for k, v in query.items()}
    total_count = db.appointments.count_documents(base_query)
    
    approved_q = {**base_query, "status": {"$in": ["APPROVED", "CONFIRMED"]}}
    pending_q = {**base_query, "status": "PENDING"}
    completed_q = {**base_query, "status": "COMPLETED"}
    cancelled_q = {**base_query, "status": "CANCELLED"}
    
    approved_count = db.appointments.count_documents(approved_q)
    pending_count = db.appointments.count_documents(pending_q)
    completed_count = db.appointments.count_documents(completed_q)
    cancelled_count = db.appointments.count_documents(cancelled_q)
    
    # Status filter
    if status_arg and status_arg.upper() != "ALL":
        stat_upper = status_arg.upper()
        if stat_upper in ["APPROVED", "CONFIRMED"]:
            query["status"] = {"$in": ["APPROVED", "CONFIRMED"]}
        else:
            query["status"] = stat_upper
            
    filtered_total = db.appointments.count_documents(query)
    total_pages = max(1, math.ceil(filtered_total / limit)) if limit > 0 else 1
    skip_val = (page - 1) * limit if limit > 0 else 0
    
    cursor = db.appointments.find(query).sort("created_at", -1)
    if limit > 0:
        cursor = cursor.skip(skip_val).limit(limit)
        
    appointments = list(cursor)
    
    # Enrich missing patient and doctor names safely
    for appt in appointments:
        if not appt.get("booking_id"):
            appt["booking_id"] = f"APT-{str(appt['_id'])[-6:].upper()}"
            
        if (not appt.get("patient_name") or appt.get("patient_name") == "string") and appt.get("patient_id"):
            pat = db.patients.find_one({"_id": appt["patient_id"]})
            if pat and pat.get("name") and pat.get("name") != "string":
                appt["patient_name"] = pat.get("name")
                appt["patient_phone"] = pat.get("phone", "")
                appt["patient_email"] = pat.get("email", "")
            else:
                appt["patient_name"] = "Registered Patient"
                
        if not appt.get("patient_phone") and appt.get("patient_id"):
            pat = db.patients.find_one({"_id": appt["patient_id"]})
            if pat:
                appt["patient_phone"] = pat.get("phone", "")
                appt["patient_email"] = pat.get("email", "")
                
        if not appt.get("doctor_name") and appt.get("doctor_id"):
            doc = db.doctors.find_one({"_id": appt["doctor_id"]})
            if doc:
                appt["doctor_name"] = doc.get("name")
                appt["specialty"] = doc.get("specialty")
                appt["hospital_name"] = doc.get("hospital_name") or doc.get("hospital")
            else:
                appt["doctor_name"] = "CareBridge Specialist"
                
        if not appt.get("hospital_name") and appt.get("hospital_id"):
            hosp = db.hospitals.find_one({"_id": appt["hospital_id"]})
            if hosp:
                appt["hospital_name"] = hosp.get("name")
            else:
                appt["hospital_name"] = "CareBridge General Hospital"
                
    serialized = serialize_doc(appointments)
    
    # Return structured pagination response
    return jsonify({
        "appointments": serialized,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "total": total_count,
            "approved": approved_count,
            "pending": pending_count,
            "completed": completed_count,
            "cancelled": cancelled_count
        }
    }), 200

@appointment_bp.route("/<appointment_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    if not appt.get("booking_id"):
        appt["booking_id"] = f"APT-{str(appt['_id'])[-6:].upper()}"
        
    if not appt.get("patient_name") and appt.get("patient_id"):
        pat = db.patients.find_one({"_id": appt["patient_id"]})
        if pat:
            appt["patient_name"] = pat.get("name")
            appt["patient_phone"] = pat.get("phone")
            appt["patient_email"] = pat.get("email")
            
    if not appt.get("doctor_name") and appt.get("doctor_id"):
        doc = db.doctors.find_one({"_id": appt["doctor_id"]})
        if doc:
            appt["doctor_name"] = doc.get("name")
            appt["specialty"] = doc.get("specialty")
            
    return jsonify(serialize_doc(appt)), 200

@appointment_bp.route("/<appointment_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    existing = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    data = request.get_json() or {}
    data.pop("_id", None)
    
    current_user = g.current_user
    if current_user.get("role") == "PATIENT":
        data.pop("approval_status", None)
        
    if "status" in data:
        data["status"] = data["status"].upper()
        if data["status"] in ["APPROVED", "CONFIRMED"]:
            data["approval_status"] = "APPROVED"
        elif data["status"] == "CANCELLED":
            data["approval_status"] = "REJECTED"
            
    if "patient_id" in data and is_valid_object_id(data["patient_id"]):
        data["patient_id"] = ObjectId(data["patient_id"])
    if "doctor_id" in data and is_valid_object_id(data["doctor_id"]):
        data["doctor_id"] = ObjectId(data["doctor_id"])
    if "hospital_id" in data and is_valid_object_id(data["hospital_id"]):
        data["hospital_id"] = ObjectId(data["hospital_id"])
        
    data["updated_at"] = datetime.now(timezone.utc)
    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": data})
    
    # Sync with approvals collection if it exists
    if "status" in data:
        sync_status = "APPROVED" if data["status"] in ["APPROVED", "CONFIRMED"] else ("REJECTED" if data["status"] == "CANCELLED" else data["status"])
        db.approvals.update_one(
            {"appointment_id": ObjectId(appointment_id)},
            {"$set": {"status": sync_status, "updated_at": datetime.now(timezone.utc)}}
        )
        
    updated_doc = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    return jsonify({
        "message": "Appointment updated successfully",
        "appointment": serialize_doc(updated_doc)
    }), 200

@appointment_bp.route("/<appointment_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    result = db.appointments.delete_one({"_id": ObjectId(appointment_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    # Also delete approval record if present
    db.approvals.delete_one({"appointment_id": ObjectId(appointment_id)})
    return jsonify({"message": "Appointment deleted/cancelled successfully"}), 200
