from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import is_valid_object_id, serialize_doc

health_alerts_bp = Blueprint("health_alerts", __name__)

def evaluate_vitals_telemetry(vitals_list, patient_id_str):
    """
    Evaluates vitals into specific abnormal telemetry alerts with clinical chips,
    normal ranges, severity levels, and specific messages.
    """
    alerts = []
    if not vitals_list:
        return alerts

    for idx, vital in enumerate(vitals_list):
        vital_id = str(vital.get("_id", ""))
        rec = vital.get("recorded_at") or vital.get("created_at")
        ts = rec.isoformat() if hasattr(rec, "isoformat") else datetime.now(timezone.utc).isoformat()
        prev_vital = vitals_list[idx + 1] if idx + 1 < len(vitals_list) else None

        hr = vital.get("heart_rate")
        sys_bp = vital.get("systolic_bp")
        dia_bp = vital.get("diastolic_bp")
        spo2 = vital.get("spo2")
        temp = vital.get("temperature")
        sugar = vital.get("blood_sugar")

        # SpO2 Evaluation
        if spo2 is not None:
            if spo2 < 90:
                alerts.append({
                    "alert_id": f"{vital_id}_spo2",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "spo2",
                    "vital_label": "SpO₂",
                    "value": f"{spo2}%",
                    "normal_range": "95–100%",
                    "severity": "CRITICAL",
                    "message": f"SpO₂ {spo2}% (normal 95–100%) – Critical Hypoxia",
                    "urgency": "Stat O₂ administration & airway evaluation required",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif spo2 < 95:
                alerts.append({
                    "alert_id": f"{vital_id}_spo2",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "spo2",
                    "vital_label": "SpO₂",
                    "value": f"{spo2}%",
                    "normal_range": "95–100%",
                    "severity": "WARNING",
                    "message": f"SpO₂ {spo2}% (normal 95–100%) – Mild Hypoxemia",
                    "urgency": "Monitor respiratory status and oxygenation trend",
                    "recorded_at": ts,
                    "created_at": ts,
                })

        # Heart Rate Evaluation
        if hr is not None:
            if hr > 130:
                alerts.append({
                    "alert_id": f"{vital_id}_hr",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "heart_rate",
                    "vital_label": "Heart rate",
                    "value": f"{hr} bpm",
                    "normal_range": "60–100 bpm",
                    "severity": "CRITICAL",
                    "message": f"Heart rate {hr} bpm (normal 60–100) – Severe Tachycardia",
                    "urgency": "Assess ECG, arrhythmia, hemodynamic stability",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif hr > 100:
                alerts.append({
                    "alert_id": f"{vital_id}_hr",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "heart_rate",
                    "vital_label": "Heart rate",
                    "value": f"{hr} bpm",
                    "normal_range": "60–100 bpm",
                    "severity": "WARNING",
                    "message": f"Heart rate {hr} bpm (normal 60–100) – High",
                    "urgency": "Evaluate hydration, fever, anxiety, or pain",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif hr < 50:
                alerts.append({
                    "alert_id": f"{vital_id}_hr",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "heart_rate",
                    "vital_label": "Heart rate",
                    "value": f"{hr} bpm",
                    "normal_range": "60–100 bpm",
                    "severity": "CRITICAL",
                    "message": f"Heart rate {hr} bpm (normal 60–100) – Severe Bradycardia",
                    "urgency": "Assess perfusion, AV block, and medication effect",
                    "recorded_at": ts,
                    "created_at": ts,
                })

        # Blood Pressure Evaluation
        if sys_bp is not None:
            bp_str = f"{sys_bp}/{dia_bp}" if dia_bp is not None else f"{sys_bp}"
            if sys_bp >= 180 or (dia_bp is not None and dia_bp >= 120):
                alerts.append({
                    "alert_id": f"{vital_id}_bp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "CRITICAL",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – Stage 2 Crisis",
                    "urgency": "Immediate antihypertensive management and organ assessment",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif sys_bp >= 140 or (dia_bp is not None and dia_bp >= 90):
                alerts.append({
                    "alert_id": f"{vital_id}_bp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "WARNING",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – High",
                    "urgency": "Repeat manual blood pressure reading; check adherence",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif sys_bp < 90:
                alerts.append({
                    "alert_id": f"{vital_id}_bp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "bp",
                    "vital_label": "Blood Pressure",
                    "value": f"{bp_str} mmHg",
                    "normal_range": "120/80 mmHg",
                    "severity": "CRITICAL",
                    "message": f"BP {bp_str} mmHg (normal 120/80) – Hypotension",
                    "urgency": "Evaluate volume status, sepsis, or shock",
                    "recorded_at": ts,
                    "created_at": ts,
                })

        # Temperature Evaluation
        if temp is not None:
            t_num = float(temp)
            if t_num > 50:
                t_c = round((t_num - 32) * 5 / 9, 1)
            else:
                t_c = t_num

            if t_c >= 39.5:
                alerts.append({
                    "alert_id": f"{vital_id}_temp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "temp",
                    "vital_label": "Temperature",
                    "value": f"{t_c} °C",
                    "normal_range": "36.5–37.5 °C",
                    "severity": "CRITICAL",
                    "message": f"Temp {t_c} °C – High Fever / Pyrexia",
                    "urgency": "Antipyretics, infectious workup, blood cultures indicated",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif t_c >= 38.0:
                alerts.append({
                    "alert_id": f"{vital_id}_temp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "temp",
                    "vital_label": "Temperature",
                    "value": f"{t_c} °C",
                    "normal_range": "36.5–37.5 °C",
                    "severity": "WARNING",
                    "message": f"Temp {t_c} °C – Elevated Temperature",
                    "urgency": "Monitor temperature trajectory and clinical symptoms",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif t_c < 35.5:
                alerts.append({
                    "alert_id": f"{vital_id}_temp",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "temp",
                    "vital_label": "Temperature",
                    "value": f"{t_c} °C",
                    "normal_range": "36.5–37.5 °C",
                    "severity": "CRITICAL",
                    "message": f"Temp {t_c} °C – Hypothermia",
                    "urgency": "Active warming measures indicated",
                    "recorded_at": ts,
                    "created_at": ts,
                })

        # Blood Sugar Evaluation
        if sugar is not None:
            s_num = float(sugar)
            if s_num < 54:
                alerts.append({
                    "alert_id": f"{vital_id}_sugar",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Sugar",
                    "value": f"{sugar} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "CRITICAL",
                    "message": f"Blood sugar {sugar} mg/dL (normal 70–140) – Severe Hypoglycemia",
                    "urgency": "Stat glucose administration / IV D50W / glucagon required",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif s_num < 70:
                alerts.append({
                    "alert_id": f"{vital_id}_sugar",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Sugar",
                    "value": f"{sugar} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "WARNING",
                    "message": f"Blood sugar {sugar} mg/dL (normal 70–140) – Low",
                    "urgency": "Provide fast-acting carbohydrate oral intake",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif s_num >= 250:
                alerts.append({
                    "alert_id": f"{vital_id}_sugar",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Sugar",
                    "value": f"{sugar} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "CRITICAL",
                    "message": f"Blood sugar {sugar} mg/dL (normal 70–140) – Critical Hyperglycemia",
                    "urgency": "Check urine/blood ketones; evaluate for DKA or HHS",
                    "recorded_at": ts,
                    "created_at": ts,
                })
            elif s_num > 180:
                alerts.append({
                    "alert_id": f"{vital_id}_sugar",
                    "vital_id": vital_id,
                    "patient_id": patient_id_str,
                    "vital_key": "blood_sugar",
                    "vital_label": "Blood Sugar",
                    "value": f"{sugar} mg/dL",
                    "normal_range": "70–140 mg/dL",
                    "severity": "WARNING",
                    "message": f"Blood sugar {sugar} mg/dL (normal 70–140) – High",
                    "urgency": "Review diabetic regimen, hydration, and nutritional intake",
                    "recorded_at": ts,
                    "created_at": ts,
                })

    return alerts

@health_alerts_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@health_alerts_bp.route("/patient/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_health_alerts(patient_id):
    db = get_database()
    pid = None
    if is_valid_object_id(patient_id):
        pid = ObjectId(patient_id)
    else:
        pat = db.patients.find_one({"$or": [{"patient_code": str(patient_id)}, {"patient_id_code": str(patient_id)}]})
        if pat:
            pid = pat["_id"]

    if not pid:
        return jsonify([]), 200

    vitals = list(db.vital_signs.find({"patient_id": pid}).sort("recorded_at", -1))
    
    # 1. Telemetry generated alerts
    telemetry_alerts = evaluate_vitals_telemetry(vitals, str(pid))

    # 2. Database persisted alerts
    db_alerts_cursor = db.health_alerts.find({"$or": [{"patient_id": pid}, {"patient_id": str(pid)}]}).sort("created_at", -1)
    db_alerts = []
    for doc in db_alerts_cursor:
        doc_serialized = serialize_doc(doc)
        db_alerts.append(doc_serialized)

    # Deduplicate alerts
    seen_keys = set()
    merged_alerts = []

    for doc in db_alerts:
        v_id = str(doc.get("vital_id") or doc.get("_id") or "")
        v_key = str(doc.get("vital_key") or doc.get("alert_key") or "")
        key = f"{v_id}_{v_key}" if (v_id and v_key) else str(doc.get("_id") or doc.get("alert_id") or doc.get("message"))
        if key not in seen_keys:
            seen_keys.add(key)
            merged_alerts.append(doc)

    for t_alert in telemetry_alerts:
        v_id = str(t_alert.get("vital_id") or "")
        v_key = str(t_alert.get("vital_key") or "")
        key = f"{v_id}_{v_key}" if (v_id and v_key) else str(t_alert.get("alert_id") or t_alert.get("message"))
        if key not in seen_keys:
            seen_keys.add(key)
            merged_alerts.append(t_alert)

    return jsonify(merged_alerts), 200

@health_alerts_bp.route("/<patient_id>/summary", methods=["GET"], strict_slashes=False)
@health_alerts_bp.route("/summary/<patient_id>", methods=["GET"], strict_slashes=False)
@health_alerts_bp.route("/patient/<patient_id>/summary", methods=["GET"], strict_slashes=False)
@token_required
def get_health_alert_summary(patient_id):
    db = get_database()
    pid = None
    if is_valid_object_id(patient_id):
        pid = ObjectId(patient_id)
    else:
        pat = db.patients.find_one({"$or": [{"patient_code": str(patient_id)}, {"patient_id_code": str(patient_id)}]})
        if pat:
            pid = pat["_id"]

    if not pid:
        return jsonify({
            "patient_id": patient_id,
            "total_alerts": 0,
            "high_alerts": 0,
            "status": "NORMAL",
            "message": "All vital signs are currently within safe adult physiological parameters.",
            "abnormal_chips": []
        }), 200

    vitals = list(db.vital_signs.find({"patient_id": pid}).sort("recorded_at", -1))
    telemetry_alerts = evaluate_vitals_telemetry(vitals, str(pid))

    db_unack_cursor = db.health_alerts.find({
        "$or": [{"patient_id": pid}, {"patient_id": str(pid)}],
        "is_acknowledged": {"$ne": True}
    })
    db_unack = [serialize_doc(doc) for doc in db_unack_cursor]

    # Deduplicate for summary count
    seen_keys = set()
    active_alerts = []
    for doc in db_unack:
        v_id = str(doc.get("vital_id") or doc.get("_id") or "")
        v_key = str(doc.get("vital_key") or doc.get("alert_key") or "")
        key = f"{v_id}_{v_key}" if (v_id and v_key) else str(doc.get("_id") or doc.get("message"))
        if key not in seen_keys:
            seen_keys.add(key)
            active_alerts.append(doc)

    for t_alert in telemetry_alerts:
        v_id = str(t_alert.get("vital_id") or "")
        v_key = str(t_alert.get("vital_key") or "")
        key = f"{v_id}_{v_key}" if (v_id and v_key) else str(t_alert.get("alert_id") or t_alert.get("message"))
        if key not in seen_keys:
            seen_keys.add(key)
            active_alerts.append(t_alert)

    total_alerts = len(active_alerts)
    high_alerts = sum(1 for a in active_alerts if str(a.get("severity", "")).upper() in ["CRITICAL", "HIGH"])

    if active_alerts:
        specific_messages = [a.get("message", "") for a in active_alerts[:2] if a.get("message")]
        summary_message = " | ".join(specific_messages) if specific_messages else "Physiological anomalies detected."
    else:
        summary_message = "All vital signs are currently within safe adult physiological parameters."

    return jsonify({
        "patient_id": str(pid),
        "total_alerts": total_alerts,
        "active_alerts": total_alerts,
        "high_alerts": high_alerts,
        "status": "ALERT" if total_alerts > 0 else "NORMAL",
        "message": summary_message,
        "abnormal_chips": active_alerts[:4]
    }), 200

@health_alerts_bp.route("/<alert_id>/acknowledge", methods=["POST"], strict_slashes=False)
@health_alerts_bp.route("/<alert_id>", methods=["PUT"], strict_slashes=False)
@token_required
def acknowledge_alert(alert_id):
    db = get_database()
    user = g.current_user or {}
    doctor_name = user.get("name") or user.get("full_name") or f"Dr. {user.get('email', 'Physician').split('@')[0]}"
    doctor_id = str(user.get("_id", ""))

    payload = request.get_json(silent=True) or {}
    note = payload.get("note", "").strip()
    now_utc = datetime.now(timezone.utc)

    # 1. Check if alert_id is a valid MongoDB ObjectId in db.health_alerts
    if is_valid_object_id(alert_id):
        res = db.health_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "is_acknowledged": True,
                "acknowledged_by": doctor_name,
                "acknowledged_by_id": doctor_id,
                "acknowledged_at": now_utc,
                "doctor_note": note,
                "status": "ACKNOWLEDGED"
            }}
        )
        if res.matched_count > 0:
            return jsonify({
                "success": True,
                "message": f"Alert acknowledged by {doctor_name}",
                "acknowledged_by": doctor_name,
                "acknowledged_at": now_utc.isoformat(),
                "note": note
            }), 200

    # 2. If alert_id is a composite or patientId (e.g. from telemetry evaluation), record in collection
    patient_id_candidate = payload.get("patient_id")
    if not patient_id_candidate and is_valid_object_id(alert_id):
        patient_id_candidate = alert_id

    pid_obj = ObjectId(patient_id_candidate) if (patient_id_candidate and is_valid_object_id(patient_id_candidate)) else None

    # Upsert or record acknowledgment
    ack_doc = {
        "alert_key": alert_id,
        "patient_id": pid_obj,
        "is_acknowledged": True,
        "acknowledged_by": doctor_name,
        "acknowledged_by_id": doctor_id,
        "acknowledged_at": now_utc,
        "doctor_note": note,
        "status": "ACKNOWLEDGED",
        "created_at": now_utc
    }
    db.health_alerts.update_one(
        {"alert_key": alert_id},
        {"$set": ack_doc},
        upsert=True
    )

    return jsonify({
        "success": True,
        "message": f"Alert acknowledged by {doctor_name}",
        "acknowledged_by": doctor_name,
        "acknowledged_at": now_utc.isoformat(),
        "note": note
    }), 200

@health_alerts_bp.route("/acknowledge-all", methods=["POST"], strict_slashes=False)
@token_required
def acknowledge_all_alerts():
    db = get_database()
    user = g.current_user or {}
    doctor_name = user.get("name") or user.get("full_name") or f"Dr. {user.get('email', 'Physician').split('@')[0]}"
    doctor_id = str(user.get("_id", ""))
    now_utc = datetime.now(timezone.utc)

    payload = request.get_json(silent=True) or {}
    patient_ids = payload.get("patient_ids", [])

    query = {"is_acknowledged": {"$ne": True}}
    if patient_ids:
        valid_objs = [ObjectId(p) for p in patient_ids if is_valid_object_id(p)]
        if valid_objs:
            query["patient_id"] = {"$in": valid_objs}

    result = db.health_alerts.update_many(
        query,
        {"$set": {
            "is_acknowledged": True,
            "acknowledged_by": doctor_name,
            "acknowledged_by_id": doctor_id,
            "acknowledged_at": now_utc,
            "status": "ACKNOWLEDGED"
        }}
    )

    return jsonify({
        "success": True,
        "message": f"Acknowledged {result.modified_count} active alerts",
        "acknowledged_count": result.modified_count,
        "acknowledged_by": doctor_name,
        "acknowledged_at": now_utc.isoformat()
    }), 200

@health_alerts_bp.route("/<alert_id>/escalate", methods=["POST"], strict_slashes=False)
@token_required
def escalate_alert(alert_id):
    db = get_database()
    user = g.current_user or {}
    doctor_name = user.get("name") or user.get("full_name") or f"Dr. {user.get('email', 'Physician').split('@')[0]}"
    doctor_id = str(user.get("_id", ""))
    now_utc = datetime.now(timezone.utc)

    payload = request.get_json(silent=True) or {}
    escalation_reason = payload.get("reason", "Escalated for immediate clinical team review").strip()

    if is_valid_object_id(alert_id):
        db.health_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "status": "ESCALATED",
                "escalated_by": doctor_name,
                "escalated_by_id": doctor_id,
                "escalated_at": now_utc,
                "escalation_reason": escalation_reason
            }}
        )

    return jsonify({
        "success": True,
        "message": f"Alert escalated by {doctor_name}",
        "escalated_by": doctor_name,
        "escalated_at": now_utc.isoformat(),
        "reason": escalation_reason
    }), 200

@health_alerts_bp.route("/<alert_id>/resolve", methods=["POST"], strict_slashes=False)
@token_required
def resolve_alert(alert_id):
    db = get_database()
    user = g.current_user or {}
    doctor_name = user.get("name") or user.get("full_name") or f"Dr. {user.get('email', 'Physician').split('@')[0]}"
    doctor_id = str(user.get("_id", ""))
    now_utc = datetime.now(timezone.utc)

    payload = request.get_json(silent=True) or {}
    resolution_note = payload.get("note", "Resolved after bedside review and stabilization").strip()

    if is_valid_object_id(alert_id):
        db.health_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "status": "RESOLVED",
                "resolved_by": doctor_name,
                "resolved_by_id": doctor_id,
                "resolved_at": now_utc,
                "resolution_note": resolution_note,
                "is_acknowledged": True
            }}
        )

    return jsonify({
        "success": True,
        "message": f"Alert resolved by {doctor_name}",
        "resolved_by": doctor_name,
        "resolved_at": now_utc.isoformat(),
        "note": resolution_note
    }), 200
