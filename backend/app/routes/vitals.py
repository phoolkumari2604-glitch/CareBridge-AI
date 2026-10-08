from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

vitals_bp = Blueprint("vitals", __name__)

@vitals_bp.route("", methods=["POST"], strict_slashes=False)
@vitals_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_vitals():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    
    if not patient_id or not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Valid patient_id is required"}), 400
        
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    data["patient_id"] = ObjectId(patient_id)
    data["recorded_at"] = datetime.now(timezone.utc)
    
    result = db.vital_signs.insert_one(data)
    return jsonify({
        "message": "Vital signs recorded successfully",
        "vital_id": str(result.inserted_id)
    }), 201

@vitals_bp.route("/patient/<patient_id>", methods=["GET"], strict_slashes=False)
@vitals_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_vitals(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    vitals = list(db.vital_signs.find({"patient_id": ObjectId(patient_id)}).sort("recorded_at", -1))
    return jsonify(serialize_doc(vitals)), 200

@vitals_bp.route("/<patient_id>/latest", methods=["GET"], strict_slashes=False)
@token_required
def get_latest_vitals(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    vital = db.vital_signs.find_one(
        {"patient_id": ObjectId(patient_id)},
        sort=[("recorded_at", -1)]
    )
    if not vital:
        # Return default normal vitals object if none yet recorded
        return jsonify({
            "patient_id": patient_id,
            "heart_rate": 72,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "spo2": 98,
            "temperature": 36.8,
            "blood_sugar": 95,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "status": "NORMAL"
        }), 200
        
    return jsonify(serialize_doc(vital)), 200

@vitals_bp.route("/<vital_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_vitals(vital_id):
    db = get_database()
    if not is_valid_object_id(vital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid vital ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    res = db.vital_signs.update_one({"_id": ObjectId(vital_id)}, {"$set": data})
    if res.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Vital signs not found"}), 404
        
    return jsonify({"message": "Vital signs updated successfully"}), 200

@vitals_bp.route("/<vital_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_vitals(vital_id):
    db = get_database()
    if not is_valid_object_id(vital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid vital ID"}), 400
    db.vital_signs.delete_one({"_id": ObjectId(vital_id)})
    return jsonify({"message": "Vital signs deleted successfully"}), 200
