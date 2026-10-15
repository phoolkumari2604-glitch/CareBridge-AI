from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.audit_service import log_audit_action

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
    abnormal_alerts = []

    # Parse and validate numerical vitals
    try:
        if "heart_rate" in data and data["heart_rate"] is not None and data["heart_rate"] != "":
            hr = int(data["heart_rate"])
            if hr < 20 or hr > 260:
                return jsonify({"error": "Validation Error", "detail": "Heart rate must be between 20 and 260 BPM"}), 400
            vital_doc["heart_rate"] = hr
            if hr < 50 or hr > 130:
                is_critical = True
                critical_reasons.append(f"HR {hr} BPM")
                abnormal_alerts.append({
                    "vital_key": "heart_rate",
                    "vital_label": "Heart Rate",
                    "value": f"{hr} BPM",
                    "normal_range": "60–100 BPM",
                    "severity": "CRITICAL",
                    "message": f"Heart Rate {hr} BPM (normal 60–100) – {'Severe Tachycardia' if hr > 130 else 'Severe Bradycardia'}",
                    "urgency": "Urgent clinical assessment & ECG evaluation indicated"
                })
            elif hr > 100 or hr < 60:
                abnormal_alerts.append({
                    "vital_key": "heart_rate",
                    "vital_label": "Heart Rate",
                    "value": f"{hr} BPM",
                    "normal_range": "60–100 BPM",
                    "severity": "WARNING",
                    "message": f"Heart Rate {hr} BPM (normal 60–100) – {'Elevated' if hr > 100 else 'Low'}",
                    "urgency": "Evaluate hydration, exertion, anxiety, or medication status"
                })

        if "systolic_bp" in data and data["systolic_bp"] is not None and data["systolic_bp"] != "":
            sbp = int(data["systolic_bp"])
            if sbp < 40 or sbp > 320:
                return jsonify({"error": "Validation Error", "detail": "Systolic BP must be between 40 and 320 mmHg"}), 400
            vital_doc["systolic_bp"] = sbp

        if "diastolic_bp" in data and data["diastolic_bp"] is not None and data["diastolic_bp"] != "":
            dbp = int(data["diastolic_bp"])
            if dbp < 20 or dbp > 220:
                return jsonify({"error": "Validation Error", "detail": "Diastolic BP must be between 20 and 220 mmHg"}), 400
            vital_doc["diastolic_bp"] = dbp

        sbp_val = vital_doc.get("systolic_bp")
        dbp_val = vital_doc.get("diastolic_bp")
        if sbp_val is not None:
            bp_str = f"{sbp_val}/{dbp_val}" if dbp_val is not None else f"{sbp_val}"
            if sbp_val >= 180 or (dbp_val is not None and dbp_val >= 120):
                is_critical = True
                critical_reasons.append(f"Sys BP {sbp_val} mmHg")
                abnormal_alerts.append({
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "CRITICAL",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – Stage 2 Hypertensive Crisis",
                    "urgency": "Immediate emergency evaluation and antihypertensive management"
                })
            elif sbp_val < 90 or (dbp_val is not None and dbp_val < 50):
                is_critical = True
                critical_reasons.append(f"Hypotension BP {bp_str} mmHg")
                abnormal_alerts.append({
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "CRITICAL",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – Hypotension",
                    "urgency": "Assess hemodynamic stability, fluid status, or shock signs"
                })
            elif sbp_val >= 140 or (dbp_val is not None and dbp_val >= 90):
                abnormal_alerts.append({
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "WARNING",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – High Blood Pressure (Stage 1)",
                    "urgency": "Repeat blood pressure reading; monitor medication adherence"
                })
            elif sbp_val > 120 or (dbp_val is not None and dbp_val > 80):
                abnormal_alerts.append({
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "WARNING",
                    "message": f"BP {bp_str} mmHg – Prehypertension / Elevated",
                    "urgency": "Lifestyle and dietary monitoring recommended"
                })

        if "spo2" in data and data["spo2"] is not None and data["spo2"] != "":
            spo2 = float(data["spo2"])
            if spo2 < 40 or spo2 > 100:
                return jsonify({"error": "Validation Error", "detail": "SpO2 must be between 40% and 100%"}), 400
            vital_doc["spo2"] = spo2
            if spo2 < 90:
                is_critical = True
                critical_reasons.append(f"SpO₂ {spo2}%")
                abnormal_alerts.append({
                    "vital_key": "spo2",
                    "vital_label": "Blood Oxygen (SpO₂)",
                    "value": f"{spo2}%",
                    "normal_range": "95–100%",
                    "severity": "CRITICAL",
                    "message": f"SpO₂ {spo2}% (normal 95–100%) – Critical Hypoxia",
                    "urgency": "Stat oxygen administration & urgent clinical respiratory evaluation required"
                })
            elif spo2 < 95:
                abnormal_alerts.append({
                    "vital_key": "spo2",
                    "vital_label": "Blood Oxygen (SpO₂)",
                    "value": f"{spo2}%",
                    "normal_range": "95–100%",
                    "severity": "WARNING",
                    "message": f"SpO₂ {spo2}% (normal 95–100%) – Mild Hypoxemia",
                    "urgency": "Monitor respiratory status and oxygenation trend"
                })

        if "temperature" in data and data["temperature"] is not None and data["temperature"] != "":
            temp = float(data["temperature"])
            if temp > 60:
                temp = round((temp - 32) * 5 / 9, 1)
            if temp < 28.0 or temp > 46.0:
                return jsonify({"error": "Validation Error", "detail": "Temperature must be between 28.0°C and 46.0°C"}), 400
            vital_doc["temperature"] = temp
            if temp >= 39.5 or temp <= 35.0:
                is_critical = True
                critical_reasons.append(f"Temp {temp}°C")
                abnormal_alerts.append({
                    "vital_key": "temperature",
                    "vital_label": "Body Temperature",
                    "value": f"{temp}°C",
                    "normal_range": "36.1–37.2°C",
                    "severity": "CRITICAL",
                    "message": f"Temp {temp}°C – {'Severe Pyrexia / High Fever' if temp >= 39.5 else 'Hypothermia'}",
                    "urgency": "Urgent antipyretic or thermal stabilization indicated"
                })
            elif temp >= 38.0:
                abnormal_alerts.append({
                    "vital_key": "temperature",
                    "vital_label": "Body Temperature",
                    "value": f"{temp}°C",
                    "normal_range": "36.1–37.2°C",
                    "severity": "WARNING",
                    "message": f"Temp {temp}°C – Elevated Temperature / Fever",
                    "urgency": "Monitor temperature trajectory and clinical symptoms"
                })
            elif temp > 37.2 or temp < 36.1:
                abnormal_alerts.append({
                    "vital_key": "temperature",
                    "vital_label": "Body Temperature",
                    "value": f"{temp}°C",
                    "normal_range": "36.1–37.2°C",
                    "severity": "WARNING",
                    "message": f"Temp {temp}°C – Mild Temperature Variation",
                    "urgency": "Routine thermal monitoring"
                })

        if "blood_sugar" in data and data["blood_sugar"] is not None and data["blood_sugar"] != "":
            bs = float(data["blood_sugar"])
            if bs < 10 or bs > 700:
                return jsonify({"error": "Validation Error", "detail": "Blood sugar must be between 10 and 700 mg/dL"}), 400
            vital_doc["blood_sugar"] = bs
            if bs >= 250 or bs <= 50:
                is_critical = True
                critical_reasons.append(f"Blood Sugar {bs} mg/dL")
                abnormal_alerts.append({
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Glucose",
                    "value": f"{bs} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "CRITICAL",
                    "message": f"Blood Glucose {bs} mg/dL (normal 70–140) – {'Critical Hyperglycemia' if bs >= 250 else 'Severe Hypoglycemia'}",
                    "urgency": "Stat glucose management / emergency evaluation required"
                })
            elif bs > 140 or bs < 70:
                abnormal_alerts.append({
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Glucose",
                    "value": f"{bs} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "WARNING",
                    "message": f"Blood Glucose {bs} mg/dL (normal 70–140) – {'Elevated' if bs > 140 else 'Low'}",
                    "urgency": "Review diabetic regimen, hydration, and nutritional intake"
                })

        if "weight" in data and data["weight"] is not None and data["weight"] != "":
            try:
                vital_doc["weight"] = float(data["weight"])
            except Exception:
                pass

        if "notes" in data:
            vital_doc["notes"] = str(data["notes"]).strip()
    except (ValueError, TypeError) as e:
        return jsonify({"error": "Validation Error", "detail": f"Invalid vital reading format: {str(e)}"}), 400

    # Ensure systolic BP is strictly greater than diastolic BP
    if "systolic_bp" in vital_doc and "diastolic_bp" in vital_doc:
        if vital_doc["systolic_bp"] <= vital_doc["diastolic_bp"]:
            return jsonify({
                "error": "Validation Error",
                "detail": f"Systolic pressure ({vital_doc['systolic_bp']} mmHg) must be higher than diastolic pressure ({vital_doc['diastolic_bp']} mmHg)"
            }), 400

    result = db.vital_signs.insert_one(vital_doc)
    vital_id_str = str(result.inserted_id)
    p_code = patient.get("patient_code", str(target_patient_id)[-6:])
    p_name = patient.get("name", "Patient")
    time_str = now.strftime("%H:%M")
    
    # Update last vitals timestamp and patient clinical status on patient document
    patient_status_val = "Critical" if is_critical else "Active"
    db.patients.update_one(
        {"_id": target_patient_id},
        {"$set": {
            "last_vitals_at": now,
            "updated_at": now,
            "status": patient_status_val,
            "clinical_status": "Critical" if is_critical else "Stable",
            "telemetry_status": "Critical" if is_critical else ("Warning" if abnormal_alerts else "Normal")
        }}
    )

    # Find attending or assigned doctor to notify
    assigned_doctor_id = patient.get("primary_doctor_id") or patient.get("doctor_id")
    if not assigned_doctor_id:
        recent_apt = db.appointments.find_one({"patient_id": target_patient_id}, sort=[("appointment_date", -1)])
        if recent_apt and recent_apt.get("doctor_id"):
            assigned_doctor_id = str(recent_apt.get("doctor_id"))

    # Persist safety threshold alerts to db.health_alerts and notify the doctor
    for item in abnormal_alerts:
        alert_doc = {
            "patient_id": target_patient_id,
            "vital_id": vital_id_str,
            "patient_name": p_name,
            "patient_code": p_code,
            "alert_type": "PHYSIOLOGICAL_TELEMETRY",
            "vital_key": item["vital_key"],
            "vital_label": item["vital_label"],
            "value": item["value"],
            "normal_range": item["normal_range"],
            "severity": item["severity"],
            "message": item["message"],
            "urgency": item["urgency"],
            "is_acknowledged": False,
            "created_at": now,
            "updated_at": now
        }
        alert_res = db.health_alerts.insert_one(alert_doc)

        # Audit log for automated system alert
        try:
            log_audit_action(
                db=db,
                user_id="SYSTEM",
                user_role="SYSTEM",
                action="AUTO_VITAL_ALERT",
                resource="HEALTH_ALERT",
                resource_id=str(alert_res.inserted_id),
                details=f"Automated threshold alert for patient {p_name} ({p_code}): {item['vital_label']} = {item['value']} ({item['severity'].upper()})"
            )
        except Exception as audit_err:
            print("Warning: Failed to log vital alert audit:", audit_err)

        # Notify doctor
        doctor_notif = {
            "type": "EMERGENCY" if item["severity"] == "CRITICAL" else "HEALTH_ALERT",
            "notification_type": "HEALTH_ALERT",
            "severity": item["severity"],
            "title": f"{'Critical' if item['severity'] == 'CRITICAL' else 'Abnormal'} Telemetry: {p_name} ({item['vital_label']})",
            "message": f"Patient {p_name} (ID {p_code}): {item['message']}. {item['urgency']} at {time_str}",
            "patient_id": str(target_patient_id),
            "patient_code": p_code,
            "patient_name": p_name,
            "vital_id": vital_id_str,
            "link": f"/doctor/health-monitoring?patientId={str(target_patient_id)}",
            "is_read": False,
            "is_acknowledged": False,
            "created_at": now
        }
        if assigned_doctor_id:
            doctor_notif["doctor_id"] = str(assigned_doctor_id)
        db.notifications.insert_one(doctor_notif)

    serialized = serialize_doc(vital_doc)
    serialized["vital_id"] = vital_id_str

    return jsonify({
        "message": "Vital signs recorded successfully",
        "vital_id": vital_id_str,
        "vital": serialized,
        "alerts_count": len(abnormal_alerts)
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
@vitals_bp.route("/patient/<patient_id>/latest", methods=["GET"], strict_slashes=False)
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
        return jsonify(None), 200
        
    vital = db.vital_signs.find_one(
        {"patient_id": target_obj_id},
        sort=[("recorded_at", -1)]
    )
    if not vital:
        return jsonify(None), 200
        
    return jsonify(serialize_doc(vital)), 200

@vitals_bp.route("/<vital_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_vitals(vital_id):
    db = get_database()
    if not is_valid_object_id(vital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid vital ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    
    if "systolic_bp" in data and "diastolic_bp" in data:
        try:
            if float(data["systolic_bp"]) <= float(data["diastolic_bp"]):
                return jsonify({
                    "error": "Validation Error",
                    "detail": "Systolic BP must be higher than diastolic BP"
                }), 400
        except (ValueError, TypeError):
            pass

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
