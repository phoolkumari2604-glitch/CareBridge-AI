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
    current_user = g.current_user
    data = request.get_json() or {}
    patient_id_raw = str(data.get("patient_id") or "").strip()
    
    if not patient_id_raw:
        return jsonify({"error": "Validation Error", "detail": "Valid patient_id or patient_code is required"}), 400
        
    patient = None
    if is_valid_object_id(patient_id_raw):
        patient = db.patients.find_one({"_id": ObjectId(patient_id_raw)})
    
    if not patient:
        patient = db.patients.find_one({
            "$or": [
                {"patient_code": patient_id_raw},
                {"patient_id_code": patient_id_raw},
                {"patientId": patient_id_raw}
            ]
        })
        
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404

    target_patient_id = patient["_id"]
    now = datetime.now(timezone.utc)
    
    rec_at_str = data.get("recorded_at")
    recorded_at = now
    if rec_at_str:
        try:
            recorded_at = datetime.fromisoformat(str(rec_at_str).replace("Z", "+00:00"))
        except Exception:
            recorded_at = now

    recorder_name = current_user.get("name") or "Medical Staff"
    if current_user.get("role") == "DOCTOR" and not recorder_name.startswith("Dr."):
        recorder_name = f"Dr. {recorder_name}"

    vital_doc = {
        "patient_id": target_patient_id,
        "patient_code": patient.get("patient_code", str(target_patient_id)[-6:]),
        "patient_name": patient.get("name", "Patient"),
        "recorded_by_id": str(current_user["_id"]),
        "recorded_by_name": data.get("recorded_by") or recorder_name,
        "recorded_at": recorded_at,
        "created_at": now
    }

    is_critical = False
    critical_reasons = []

    # Parse and validate numerical vitals
    try:
        if "heart_rate" in data and data["heart_rate"] is not None and data["heart_rate"] != "":
            hr = int(data["heart_rate"])
            if hr < 20 or hr > 260:
                return jsonify({"error": "Validation Error", "detail": "Heart rate must be between 20 and 260 BPM"}), 400
            vital_doc["heart_rate"] = hr
            if hr < 40 or hr > 130:
                is_critical = True
                critical_reasons.append(f"HR {hr} bpm")

        if "systolic_bp" in data and data["systolic_bp"] is not None and data["systolic_bp"] != "":
            sbp = int(data["systolic_bp"])
            if sbp < 40 or sbp > 320:
                return jsonify({"error": "Validation Error", "detail": "Systolic BP must be between 40 and 320 mmHg"}), 400
            vital_doc["systolic_bp"] = sbp
            if sbp >= 180 or sbp <= 75:
                is_critical = True
                critical_reasons.append(f"Sys BP {sbp} mmHg")

        if "diastolic_bp" in data and data["diastolic_bp"] is not None and data["diastolic_bp"] != "":
            dbp = int(data["diastolic_bp"])
            if dbp < 20 or dbp > 220:
                return jsonify({"error": "Validation Error", "detail": "Diastolic BP must be between 20 and 220 mmHg"}), 400
            vital_doc["diastolic_bp"] = dbp
            if dbp >= 120 or dbp <= 45:
                is_critical = True
                critical_reasons.append(f"Dia BP {dbp} mmHg")

        if "spo2" in data and data["spo2"] is not None and data["spo2"] != "":
            spo2 = float(data["spo2"])
            if spo2 < 40 or spo2 > 100:
                return jsonify({"error": "Validation Error", "detail": "SpO2 must be between 40% and 100%"}), 400
            vital_doc["spo2"] = spo2
            if spo2 < 90:
                is_critical = True
                critical_reasons.append(f"SpO₂ {spo2}%")

        if "temperature" in data and data["temperature"] is not None and data["temperature"] != "":
            temp = float(data["temperature"])
            if temp > 60:
                temp = round((temp - 32) * 5 / 9, 1)
            if temp < 28.0 or temp > 46.0:
                return jsonify({"error": "Validation Error", "detail": "Temperature must be between 28.0°C and 46.0°C"}), 400
            vital_doc["temperature"] = temp
            if temp >= 39.0 or temp <= 34.5:
                is_critical = True
                critical_reasons.append(f"Temp {temp}°C")

        if "blood_sugar" in data and data["blood_sugar"] is not None and data["blood_sugar"] != "":
            bs = float(data["blood_sugar"])
            if bs < 10 or bs > 700:
                return jsonify({"error": "Validation Error", "detail": "Blood sugar must be between 10 and 700 mg/dL"}), 400
            vital_doc["blood_sugar"] = bs
            if bs >= 280 or bs <= 50:
                is_critical = True
                critical_reasons.append(f"Blood Sugar {bs} mg/dL")

        if "weight" in data and data["weight"] is not None and data["weight"] != "":
            try:
                vital_doc["weight"] = float(data["weight"])
            except Exception:
                pass

        if "notes" in data:
            vital_doc["notes"] = str(data["notes"]).strip()
    except (ValueError, TypeError) as e:
        return jsonify({"error": "Validation Error", "detail": f"Invalid vital reading format: {str(e)}"}), 400

    result = db.vital_signs.insert_one(vital_doc)
    
    # Update last vitals timestamp on patient document
    db.patients.update_one(
        {"_id": target_patient_id},
        {"$set": {"last_vitals_at": now, "updated_at": now}}
    )

    # If critical reading, create automatic emergency notification
    if is_critical:
        p_code = patient.get("patient_code", str(target_patient_id)[-6:])
        time_str = now.strftime("%H:%M")
        alert_msg = f"Critical: {patient.get('name', 'Patient')} (ID {p_code}) - {', '.join(critical_reasons)} at {time_str}"
        
        # Insert into notifications collection for all attending doctors/staff
        db.notifications.insert_one({
            "type": "EMERGENCY",
            "severity": "CRITICAL",
            "title": f"Critical Telemetry Alert: {patient.get('name', 'Patient')}",
            "message": alert_msg,
            "patient_id": str(target_patient_id),
            "patient_code": p_code,
            "patient_name": patient.get("name", "Patient"),
            "vital_id": str(result.inserted_id),
            "link": f"/doctor/health-monitoring?patientId={str(target_patient_id)}",
            "is_read": False,
            "is_acknowledged": False,
            "created_at": now
        })

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
    target_obj_id = None
    if is_valid_object_id(patient_id):
        target_obj_id = ObjectId(patient_id)
    else:
        pat = db.patients.find_one({"$or": [{"patient_code": str(patient_id)}, {"patient_id_code": str(patient_id)}]})
        if pat:
            target_obj_id = pat["_id"]

    if not target_obj_id:
        return jsonify([]), 200
        
    vitals = list(db.vital_signs.find({"patient_id": target_obj_id}).sort("recorded_at", -1))
    return jsonify(serialize_doc(vitals)), 200

@vitals_bp.route("/<patient_id>/latest", methods=["GET"], strict_slashes=False)
@token_required
def get_latest_vitals(patient_id):
    db = get_database()
    target_obj_id = None
    if is_valid_object_id(patient_id):
        target_obj_id = ObjectId(patient_id)
    else:
        pat = db.patients.find_one({"$or": [{"patient_code": str(patient_id)}, {"patient_id_code": str(patient_id)}]})
        if pat:
            target_obj_id = pat["_id"]

    if not target_obj_id:
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
        
    vital = db.vital_signs.find_one(
        {"patient_id": target_obj_id},
        sort=[("recorded_at", -1)]
    )
    if not vital:
        return jsonify({
            "patient_id": str(target_obj_id),
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
@token_required
def delete_vitals(vital_id):
    db = get_database()
    if not is_valid_object_id(vital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid vital ID"}), 400
    res = db.vital_signs.delete_one({"_id": ObjectId(vital_id)})
    if res.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Vital signs record not found"}), 404
    return jsonify({"message": "Vital signs deleted successfully"}), 200
