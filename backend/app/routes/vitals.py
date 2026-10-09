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
        
    now = datetime.now(timezone.utc)
    vital_doc = {
        "patient_id": ObjectId(patient_id),
        "recorded_at": now,
        "created_at": now
    }

    # Parse and validate numerical vitals
    try:
        if "heart_rate" in data and data["heart_rate"] is not None and data["heart_rate"] != "":
            hr = int(data["heart_rate"])
            if hr < 30 or hr > 250:
                return jsonify({"error": "Validation Error", "detail": "Heart rate must be between 30 and 250 BPM"}), 400
            vital_doc["heart_rate"] = hr

        if "systolic_bp" in data and data["systolic_bp"] is not None and data["systolic_bp"] != "":
            sbp = int(data["systolic_bp"])
            if sbp < 50 or sbp > 300:
                return jsonify({"error": "Validation Error", "detail": "Systolic BP must be between 50 and 300 mmHg"}), 400
            vital_doc["systolic_bp"] = sbp

        if "diastolic_bp" in data and data["diastolic_bp"] is not None and data["diastolic_bp"] != "":
            dbp = int(data["diastolic_bp"])
            if dbp < 30 or dbp > 200:
                return jsonify({"error": "Validation Error", "detail": "Diastolic BP must be between 30 and 200 mmHg"}), 400
            vital_doc["diastolic_bp"] = dbp

        if "spo2" in data and data["spo2"] is not None and data["spo2"] != "":
            spo2 = float(data["spo2"])
            if spo2 < 50 or spo2 > 100:
                return jsonify({"error": "Validation Error", "detail": "SpO2 must be between 50% and 100%"}), 400
            vital_doc["spo2"] = spo2

        if "temperature" in data and data["temperature"] is not None and data["temperature"] != "":
            temp = float(data["temperature"])
            # Convert if provided in Fahrenheit (> 60) to Celsius
            if temp > 60:
                temp = round((temp - 32) * 5 / 9, 1)
            if temp < 30.0 or temp > 45.0:
                return jsonify({"error": "Validation Error", "detail": "Temperature must be between 30.0°C and 45.0°C"}), 400
            vital_doc["temperature"] = temp

        if "blood_sugar" in data and data["blood_sugar"] is not None and data["blood_sugar"] != "":
            bs = float(data["blood_sugar"])
            if bs < 20 or bs > 600:
                return jsonify({"error": "Validation Error", "detail": "Blood sugar must be between 20 and 600 mg/dL"}), 400
            vital_doc["blood_sugar"] = bs

        if "notes" in data:
            vital_doc["notes"] = str(data["notes"]).strip()
    except (ValueError, TypeError) as e:
        return jsonify({"error": "Validation Error", "detail": f"Invalid vital reading format: {str(e)}"}), 400

    result = db.vital_signs.insert_one(vital_doc)
    
    # Update last vitals timestamp on patient document
    db.patients.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {"last_vitals_at": now, "updated_at": now}}
    )

    serialized = serialize_doc(vital_doc)
    serialized["vital_id"] = str(result.inserted_id)

    return jsonify({
        "message": "Vital signs recorded successfully",
        "vital_id": str(result.inserted_id),
        "vital": serialized
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
