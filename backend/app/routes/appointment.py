from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
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
    reason = data.get("reason", "General Consultation")
    
    if not patient_id or not hospital_id or not doctor_id or not appointment_date or not appointment_time:
        return jsonify({"error": "Validation Error", "detail": "patient_id, hospital_id, doctor_id, appointment_date, and appointment_time are required"}), 400
        
    if not is_valid_object_id(patient_id) or not is_valid_object_id(hospital_id) or not is_valid_object_id(doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid ID format for patient, hospital, or doctor"}), 400
        
    # Check patient
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    # Check doctor
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    # Check hospital
    hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    if not hospital:
        return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404
        
    # Prevent duplicate booking
    existing = db.appointments.find_one({
        "doctor_id": ObjectId(doctor_id),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "status": {"$in": ["PENDING", "APPROVED", "CONFIRMED"]}
    })
    if existing:
        return jsonify({"error": "Conflict", "detail": "This appointment slot is already booked"}), 409
        
    appointment_doc = {
        "patient_id": ObjectId(patient_id),
        "hospital_id": ObjectId(hospital_id),
        "doctor_id": ObjectId(doctor_id),
        "doctor_name": doctor.get("name"),
        "hospital_name": hospital.get("name"),
        "patient_name": patient.get("name"),
        "specialty": doctor.get("specialty"),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "reason": reason,
        "status": "PENDING",
        "approval_status": "PENDING",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.appointments.insert_one(appointment_doc)
    return jsonify({
        "message": "Appointment created successfully",
        "appointment_id": str(result.inserted_id),
        "status": "PENDING",
        "approval_status": "PENDING"
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
        
    if status_arg:
        query["status"] = status_arg.upper()
        
    appointments = list(db.appointments.find(query).sort("created_at", -1))
    
    # Enrich with doctor and hospital names if missing
    for appt in appointments:
        if not appt.get("doctor_name") and appt.get("doctor_id"):
            doc = db.doctors.find_one({"_id": appt["doctor_id"]})
            if doc:
                appt["doctor_name"] = doc.get("name")
                appt["specialty"] = doc.get("specialty")
        if not appt.get("hospital_name") and appt.get("hospital_id"):
            hosp = db.hospitals.find_one({"_id": appt["hospital_id"]})
            if hosp:
                appt["hospital_name"] = hosp.get("name")
        if not appt.get("patient_name") and appt.get("patient_id"):
            pat = db.patients.find_one({"_id": appt["patient_id"]})
            if pat:
                appt["patient_name"] = pat.get("name")
                
    return jsonify(serialize_doc(appointments)), 200

@appointment_bp.route("/<appointment_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
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
        
    data["updated_at"] = datetime.now(timezone.utc)
    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": data})
    return jsonify({"message": "Appointment updated successfully"}), 200

@appointment_bp.route("/<appointment_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    result = db.appointments.delete_one({"_id": ObjectId(appointment_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    return jsonify({"message": "Appointment deleted/cancelled successfully"}), 200
