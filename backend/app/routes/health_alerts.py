from datetime import datetime, timezone
from flask import Blueprint, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import is_valid_object_id

health_alerts_bp = Blueprint("health_alerts", __name__)

@health_alerts_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_health_alerts(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    vitals = list(db.vital_signs.find({"patient_id": ObjectId(patient_id)}).sort("recorded_at", -1))
    alerts = []
    
    for vital in vitals:
        vital_id = str(vital["_id"])
        recorded_at = vital.get("recorded_at")
        ts = recorded_at.isoformat() if hasattr(recorded_at, "isoformat") else datetime.now(timezone.utc).isoformat()
        
        def add_alert(alert_type, severity, message):
            alerts.append({
                "patient_id": patient_id,
                "alert_type": alert_type,
                "severity": severity,
                "message": message,
                "vital_id": vital_id,
                "created_at": ts,
            })
            
        hr = vital.get("heart_rate")
        if hr is not None:
            if hr < 50:
                add_alert("HEART_RATE", "HIGH", "Bradycardia detected: Heart rate is below 50 BPM.")
            elif hr > 120:
                add_alert("HEART_RATE", "HIGH", "Tachycardia detected: Heart rate is above 120 BPM.")
                
        sys = vital.get("systolic_bp")
        dia = vital.get("diastolic_bp")
        if sys is not None and sys >= 140:
            add_alert("BLOOD_PRESSURE", "HIGH", "High systolic blood pressure (>= 140 mmHg).")
        if dia is not None and dia >= 90:
            add_alert("BLOOD_PRESSURE", "HIGH", "High diastolic blood pressure (>= 90 mmHg).")
            
        spo2 = vital.get("spo2")
        if spo2 is not None and spo2 < 94:
            add_alert("SPO2", "CRITICAL" if spo2 < 90 else "HIGH", "Low oxygen saturation (SpO2 < 94%).")
            
        temp = vital.get("temperature")
        if temp is not None and temp >= 38.0:
            add_alert("TEMPERATURE", "HIGH", "Fever detected: Body temperature is >= 38.0°C.")
            
        sugar = vital.get("blood_sugar")
        if sugar is not None:
            if sugar < 70:
                add_alert("BLOOD_SUGAR", "HIGH", "Hypoglycemia: Blood sugar is below 70 mg/dL.")
            elif sugar > 200:
                add_alert("BLOOD_SUGAR", "HIGH", "Hyperglycemia: Blood sugar is above 200 mg/dL.")
                
    return jsonify(alerts), 200

@health_alerts_bp.route("/<patient_id>/summary", methods=["GET"], strict_slashes=False)
@token_required
def get_health_alert_summary(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    vitals = list(db.vital_signs.find({"patient_id": ObjectId(patient_id)}).sort("recorded_at", -1))
    total_alerts = 0
    high_alerts = 0
    
    for vital in vitals:
        hr = vital.get("heart_rate")
        sys = vital.get("systolic_bp")
        dia = vital.get("diastolic_bp")
        spo2 = vital.get("spo2")
        temp = vital.get("temperature")
        sugar = vital.get("blood_sugar")
        
        if hr is not None and (hr < 50 or hr > 120):
            total_alerts += 1; high_alerts += 1
        if sys is not None and sys >= 140:
            total_alerts += 1; high_alerts += 1
        if dia is not None and dia >= 90:
            total_alerts += 1; high_alerts += 1
        if spo2 is not None and spo2 < 94:
            total_alerts += 1; high_alerts += 1
        if temp is not None and temp >= 38.0:
            total_alerts += 1; high_alerts += 1
        if sugar is not None and (sugar < 70 or sugar > 200):
            total_alerts += 1; high_alerts += 1
            
    return jsonify({
        "patient_id": patient_id,
        "total_alerts": total_alerts,
        "high_alerts": high_alerts,
        "status": "ALERT" if total_alerts > 0 else "NORMAL",
        "message": (
            "Potentially concerning vital readings detected. Please review them with a doctor."
            if total_alerts > 0
            else "All vital signs are currently within safe parameters."
        )
    }), 200
