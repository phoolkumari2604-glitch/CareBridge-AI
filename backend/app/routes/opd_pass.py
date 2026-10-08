from datetime import datetime, timezone
import secrets
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

opd_pass_bp = Blueprint("opd_pass", __name__)

@opd_pass_bp.route("/<appointment_id>", methods=["POST"], strict_slashes=False)
@token_required
def create_opd_pass(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    existing_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    if existing_pass:
        return jsonify({
            "message": "Digital OPD pass already exists",
            "opd_pass_id": str(existing_pass["_id"]),
            "pass_number": existing_pass.get("pass_number"),
            "status": existing_pass.get("status", "ACTIVE")
        }), 200
        
    pass_number = f"OPD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    opd_pass = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "hospital_id": appointment.get("hospital_id"),
        "doctor_id": appointment.get("doctor_id"),
        "doctor_name": appointment.get("doctor_name"),
        "hospital_name": appointment.get("hospital_name"),
        "patient_name": appointment.get("patient_name"),
        "appointment_date": appointment.get("appointment_date"),
        "appointment_time": appointment.get("appointment_time"),
        "reason": appointment.get("reason"),
        "pass_number": pass_number,
        "status": "ACTIVE",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = db.opd_passes.insert_one(opd_pass)
    return jsonify({
        "message": "Digital OPD pass created successfully",
        "opd_pass_id": str(result.inserted_id),
        "pass_number": pass_number,
        "status": "ACTIVE"
    }), 201

@opd_pass_bp.route("", methods=["GET"], strict_slashes=False)
@opd_pass_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_opd_passes():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id = request.args.get("patient_id")
    query = {}
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patient = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if patient:
            query["patient_id"] = patient["_id"]
        elif patient_id and is_valid_object_id(patient_id):
            query["patient_id"] = ObjectId(patient_id)
    elif patient_id and is_valid_object_id(patient_id):
        query["patient_id"] = ObjectId(patient_id)
        
    passes = list(db.opd_passes.find(query).sort("created_at", -1))
    
    for op in passes:
        if not op.get("doctor_name") and op.get("doctor_id"):
            doc = db.doctors.find_one({"_id": op["doctor_id"]})
            if doc:
                op["doctor_name"] = doc.get("name")
        if not op.get("hospital_name") and op.get("hospital_id"):
            hosp = db.hospitals.find_one({"_id": op["hospital_id"]})
            if hosp:
                op["hospital_name"] = hosp.get("name")
                
    return jsonify(serialize_doc(passes)), 200

@opd_pass_bp.route("/patient/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient_opd_passes(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    passes = list(db.opd_passes.find({"patient_id": ObjectId(patient_id)}).sort("created_at", -1))
    return jsonify(serialize_doc(passes)), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        # Maybe queried by patient_id directly
        passes = list(db.opd_passes.find({"patient_id": opd_pass_id}).sort("created_at", -1))
        if passes:
            return jsonify(serialize_doc(passes[0])), 200
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
        
    opd_pass = db.opd_passes.find_one({"_id": ObjectId(opd_pass_id)})
    if not opd_pass:
        # Check by patient_id
        opd_pass = db.opd_passes.find_one({"patient_id": ObjectId(opd_pass_id)})
        if not opd_pass:
            return jsonify({"error": "Not Found", "detail": "OPD pass not found"}), 404
            
    return jsonify(serialize_doc(opd_pass)), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["PUT"], strict_slashes=False)
@staff_or_admin_required
def update_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
        
    data = request.get_json() or {}
    status = (data.get("status") or request.args.get("status", "")).upper()
    if status not in {"ACTIVE", "USED", "EXPIRED", "CANCELLED"}:
        return jsonify({"error": "Validation Error", "detail": "Invalid status"}), 400
        
    db.opd_passes.update_one(
        {"_id": ObjectId(opd_pass_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    return jsonify({"message": "OPD pass updated successfully", "opd_pass_id": opd_pass_id, "status": status}), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
    result = db.opd_passes.delete_one({"_id": ObjectId(opd_pass_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "OPD pass not found"}), 404
    return jsonify({"message": "OPD pass deleted successfully"}), 200
