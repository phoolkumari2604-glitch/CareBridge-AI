from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

health_bp = Blueprint("health_profiles", __name__)

@health_bp.route("", methods=["POST"], strict_slashes=False)
@health_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_health_profile():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    
    if not patient_id or not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Valid patient_id is required"}), 400
        
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    existing = db.health_profiles.find_one({"patient_id": ObjectId(patient_id)})
    if existing:
        return jsonify({"error": "Conflict", "detail": "Health profile already exists"}), 409
        
    data["patient_id"] = ObjectId(patient_id)
    data["created_at"] = datetime.now(timezone.utc)
    data["updated_at"] = datetime.now(timezone.utc)
    
    result = db.health_profiles.insert_one(data)
    return jsonify({
        "message": "Health profile created successfully",
        "health_profile_id": str(result.inserted_id)
    }), 201

@health_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_health_profile(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    profile = db.health_profiles.find_one({"patient_id": ObjectId(patient_id)})
    if not profile:
        # Fallback create empty profile for patient
        patient = db.patients.find_one({"_id": ObjectId(patient_id)})
        if patient:
            profile = {
                "patient_id": ObjectId(patient_id),
                "blood_group": patient.get("blood_group", "O+"),
                "allergies": patient.get("allergies", []),
                "chronic_conditions": patient.get("medical_history", []),
                "current_medications": [],
                "emergency_contact": patient.get("emergency_contact", ""),
                "created_at": datetime.now(timezone.utc)
            }
            db.health_profiles.insert_one(profile)
        else:
            return jsonify({"error": "Not Found", "detail": "Health profile not found"}), 404
            
    return jsonify(serialize_doc(profile)), 200

@health_bp.route("/<patient_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_health_profile(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    data.pop("patient_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    result = db.health_profiles.update_one(
        {"patient_id": ObjectId(patient_id)},
        {"$set": data},
        upsert=True
    )
    return jsonify({"message": "Health profile updated successfully"}), 200

@health_bp.route("/<patient_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_health_profile(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
    db.health_profiles.delete_one({"patient_id": ObjectId(patient_id)})
    return jsonify({"message": "Health profile deleted successfully"}), 200
