from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id, parse_object_id

patient_bp = Blueprint("patients", __name__)

@patient_bp.route("", methods=["POST"], strict_slashes=False)
@patient_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_patient():
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}
    
    name = data.get("name") or current_user.get("name")
    if not name:
        return jsonify({"error": "Validation Error", "detail": "Patient name is required"}), 400
    
    patient_doc = {
        "user_id": str(current_user["_id"]),
        "name": name,
        "email": data.get("email") or current_user.get("email"),
        "phone": data.get("phone") or current_user.get("phone"),
        "age": data.get("age"),
        "gender": data.get("gender"),
        "blood_group": data.get("blood_group"),
        "emergency_contact": data.get("emergency_contact"),
        "allergies": data.get("allergies", []),
        "medical_history": data.get("medical_history", []),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.patients.insert_one(patient_doc)
    return jsonify({
        "message": "Patient created successfully",
        "patient_id": str(result.inserted_id)
    }), 201

@patient_bp.route("", methods=["GET"], strict_slashes=False)
@patient_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_patients():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    # If patient, return only their record in a list
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patients = list(db.patients.find({
            "$or": [{"user_id": user_id}, {"email": email}]
        }))
    else:
        patients = list(db.patients.find())
        
    return jsonify(serialize_doc(patients)), 200

@patient_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient(patient_id):
    db = get_database()
    current_user = g.current_user
    
    if not is_valid_object_id(patient_id):
        # Fallback search by user_id
        patient = db.patients.find_one({"user_id": patient_id})
        if not patient:
            return jsonify({"error": "Not Found", "detail": "Invalid patient ID or patient not found"}), 404
    else:
        patient = db.patients.find_one({"_id": ObjectId(patient_id)})
        
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    if current_user.get("role") == "PATIENT":
        user_id = str(current_user["_id"])
        owns_record = (
            patient.get("user_id") == user_id
            or patient.get("email") == current_user.get("email")
        )
        if not owns_record:
            return jsonify({"error": "Forbidden", "detail": "You can only access your own patient record"}), 403
            
    return jsonify(serialize_doc(patient)), 200

@patient_bp.route("/<patient_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_patient(patient_id):
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}
    
    query = {"_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"user_id": patient_id}
    existing = db.patients.find_one(query)
    
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    if current_user.get("role") == "PATIENT":
        user_id = str(current_user["_id"])
        owns_record = (
            existing.get("user_id") == user_id
            or existing.get("email") == current_user.get("email")
        )
        if not owns_record:
            return jsonify({"error": "Forbidden", "detail": "You can only update your own patient record"}), 403
            
    data.pop("_id", None)
    data.pop("user_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    db.patients.update_one(query, {"$set": data})
    return jsonify({"message": "Patient updated successfully"}), 200

@patient_bp.route("/<patient_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_patient(patient_id):
    db = get_database()
    query = {"_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"user_id": patient_id}
    result = db.patients.delete_one(query)
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
    return jsonify({"message": "Patient deleted successfully"}), 200
