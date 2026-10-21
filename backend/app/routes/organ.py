import json
import time
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, Response
from bson import ObjectId

from app.core.database import get_database
from app.utils.decorators import token_required
from app.core.clinical_thresholds import VALID_ORGAN_KEYS
from app.services.organ_service import (
    to_patient_id_filter,
    compute_organ_status,
    get_patient_organ_dossier,
    log_organ_audit,
)

organ_bp = Blueprint("organ_bp", __name__)


def is_authorized_writer():
    """Returns True if the authenticated user has DOCTOR, ADMIN, or clinical staff role."""
    user = getattr(g, "current_user", None) or {}
    role = (user.get("role") or "").strip().upper()
    return role in {"DOCTOR", "ADMIN", "STAFF", "CLINICIAN", "DEVICE_GATEWAY"}


def can_access_patient(patient_id: str) -> bool:
    """Verifies that the requester is a doctor/admin or the actual patient themselves."""
    user = getattr(g, "current_user", None) or {}
    role = (user.get("role") or "").strip().upper()
    if role in {"DOCTOR", "ADMIN", "STAFF", "DEVICE_GATEWAY"}:
        return True

    # Check patient scoping
    user_pid = str(user.get("patient_id") or user.get("id") or user.get("sub") or "")
    pid_str = str(patient_id).strip()
    return user_pid == pid_str or str(user.get("_id") or "") == pid_str


# ============================================================
# 1. GET /api/patients/:id/organs - Full Organ Dossier Payload
# ============================================================
@organ_bp.route("/patients/<patient_id>/organs", methods=["GET"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/organs", methods=["GET"], strict_slashes=False)
@token_required
def get_all_organs(patient_id):
    if not can_access_patient(patient_id):
        return jsonify({"error": "Forbidden", "detail": "You are not authorized to view another patient's organ data."}), 403

    db = get_database()
    dossier = get_patient_organ_dossier(patient_id, db)
    return jsonify({
        "patientId": str(patient_id),
        "organs": dossier,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "success",
    }), 200


# ============================================================
# 2. GET /api/patients/:id/organs/stream - Server-Sent Events (SSE) Live Updates
# ============================================================
@organ_bp.route("/patients/<patient_id>/organs/stream", methods=["GET"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/organs/stream", methods=["GET"], strict_slashes=False)
@token_required
def stream_organ_updates(patient_id):
    if not can_access_patient(patient_id):
        return jsonify({"error": "Forbidden", "detail": "Unauthorized stream subscription."}), 403

    db = get_database()

    def event_stream():
        # Push initial snapshot immediately
        snapshot = get_patient_organ_dossier(patient_id, db)
        yield f"event: organ_snapshot\ndata: {json.dumps({'patientId': str(patient_id), 'organs': snapshot, 'time': datetime.now(timezone.utc).isoformat()})}\n\n"

        # Stream real-time heartbeats and updates
        # Check for updates or push heartbeat every 4 seconds
        last_sent_hash = hash(json.dumps(snapshot, sort_keys=True))
        cycles = 0

        while cycles < 120:  # ~8 minutes stream lifecycle before clean reconnect
            time.sleep(4)
            cycles += 1
            try:
                current_dossier = get_patient_organ_dossier(patient_id, db)
                curr_hash = hash(json.dumps(current_dossier, sort_keys=True))

                if curr_hash != last_sent_hash:
                    last_sent_hash = curr_hash
                    yield f"event: organ_update\ndata: {json.dumps({'patientId': str(patient_id), 'organs': current_dossier, 'time': datetime.now(timezone.utc).isoformat()})}\n\n"
                else:
                    # Heartbeat ping to keep SSE connection alive
                    yield f"event: ping\ndata: {json.dumps({'time': datetime.now(timezone.utc).isoformat()})}\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                break

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# 3. POST /api/patients/:id/telemetry - Record Device / Lab Reading
# ============================================================
@organ_bp.route("/patients/<patient_id>/telemetry", methods=["POST"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/telemetry", methods=["POST"], strict_slashes=False)
@token_required
def record_telemetry(patient_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only authorized clinicians or telemetry devices may record telemetry."}), 403

    db = get_database()
    data = request.get_json(silent=True) or {}

    organ_id = (data.get("organId") or data.get("organ_id") or "").strip().lower()
    indicator_key = (data.get("indicatorKey") or data.get("indicator_key") or data.get("key") or "").strip()
    label = (data.get("label") or indicator_key).strip()
    value = data.get("value")
    unit = (data.get("unit") or "").strip()
    safe_min = data.get("safeMin")
    safe_max = data.get("safeMax")
    note = (data.get("note") or "").strip()
    source = (data.get("source") or "Continuous Telemetry Monitor").strip()

    if not organ_id or organ_id not in VALID_ORGAN_KEYS:
        return jsonify({
            "error": "Validation Error",
            "detail": f"organId must be one of: {', '.join(sorted(VALID_ORGAN_KEYS))}"
        }), 400

    if value is None or str(value).strip() == "":
        return jsonify({"error": "Validation Error", "detail": "value is required for telemetry readings."}), 400

    now = datetime.now(timezone.utc)
    rec_doc = {
        "patientId": str(patient_id),
        "organId": organ_id,
        "indicatorKey": indicator_key or label.lower().replace(" ", "_"),
        "label": label,
        "value": value,
        "unit": unit,
        "safeMin": float(safe_min) if safe_min is not None and str(safe_min).replace(".", "", 1).isdigit() else None,
        "safeMax": float(safe_max) if safe_max is not None and str(safe_max).replace(".", "", 1).isdigit() else None,
        "note": note,
        "source": source,
        "recordedAt": now,
    }

    insert_res = db.patient_telemetry.insert_one(rec_doc)
    rec_doc["_id"] = str(insert_res.inserted_id)

    # Re-compute status and update patient_organs
    new_status, override = compute_organ_status(patient_id, organ_id, db)
    db.patient_organs.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"status": new_status, "updatedAt": now}},
        upsert=True,
    )

    user = getattr(g, "current_user", {})
    log_organ_audit(
        db,
        user.get("id") or user.get("sub"),
        user.get("role", "DOCTOR"),
        "RECORD_TELEMETRY",
        organ_id,
        patient_id,
        f"Recorded {label}: {value} {unit} (Status computed: {new_status})"
    )

    return jsonify({
        "message": "Telemetry recorded successfully",
        "organId": organ_id,
        "status": new_status,
        "organStatus": new_status,
        "telemetry": {
            "id": str(insert_res.inserted_id),
            "indicatorKey": rec_doc["indicatorKey"],
            "label": label,
            "value": value,
            "unit": unit,
            "recordedAt": now.isoformat(),
        }
    }), 201


# ============================================================
# 4. POST /api/patients/:id/findings - Add Clinical Finding
# ============================================================
@organ_bp.route("/patients/<patient_id>/findings", methods=["POST"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/findings", methods=["POST"], strict_slashes=False)
@token_required
def add_finding(patient_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only verified physicians may log clinical findings."}), 403

    db = get_database()
    data = request.get_json(silent=True) or {}

    organ_id = (data.get("organId") or data.get("organ_id") or "").strip().lower()
    title = (data.get("title") or data.get("label") or "").strip()
    description = (data.get("description") or data.get("note") or "").strip()
    severity = (data.get("severity") or "watch").strip().lower()
    x = data.get("x")
    y = data.get("y")

    if not organ_id or organ_id not in VALID_ORGAN_KEYS:
        return jsonify({
            "error": "Validation Error",
            "detail": f"organId must be one of: {', '.join(sorted(VALID_ORGAN_KEYS))}"
        }), 400

    if not title:
        return jsonify({"error": "Validation Error", "detail": "title is required"}), 400

    if severity not in {"watch", "critical", "normal"}:
        return jsonify({"error": "Validation Error", "detail": "severity must be 'watch' or 'critical'"}), 400

    try:
        x_val = float(x)
        y_val = float(y)
        if not (0.0 <= x_val <= 100.0 and 0.0 <= y_val <= 100.0):
            return jsonify({"error": "Validation Error", "detail": "Coordinates x and y must be between 0 and 100 percent."}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Validation Error", "detail": "x and y must be valid numeric percentage coordinates (0 - 100)."}), 400

    user = getattr(g, "current_user", {})
    recorded_by = user.get("name") or f"Dr. {user.get('email', 'Clinician')}"
    now = datetime.now(timezone.utc)

    finding_doc = {
        "patientId": str(patient_id),
        "organId": organ_id,
        "title": title,
        "label": title,
        "description": description,
        "note": description,
        "severity": severity,
        "x": x_val,
        "y": y_val,
        "recordedBy": recorded_by,
        "recordedAt": now,
        "resolvedAt": None,
    }

    insert_res = db.patient_findings.insert_one(finding_doc)
    finding_id = str(insert_res.inserted_id)
    finding_doc["id"] = finding_id

    # If critical finding, insert high-priority clinical notification
    if severity == "critical":
        try:
            db.notifications.insert_one({
                "patient_id": ObjectId(patient_id) if ObjectId.is_valid(str(patient_id)) else str(patient_id),
                "title": f"Critical Organ Finding: {title}",
                "message": f"Critical finding flagged for {organ_id.capitalize()}: {title}. {description}",
                "notification_type": "CLINICAL_ALERT",
                "severity": "CRITICAL",
                "is_read": False,
                "created_at": now,
                "updated_at": now,
            })
        except Exception as e:
            print(f"[Notification Alert Error]: {e}")

    # Re-evaluate status
    new_status, _ = compute_organ_status(patient_id, organ_id, db)
    db.patient_organs.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"status": new_status, "updatedAt": now}},
        upsert=True,
    )

    log_organ_audit(
        db,
        user.get("id") or user.get("sub"),
        user.get("role", "DOCTOR"),
        "ADD_FINDING",
        organ_id,
        patient_id,
        f"Added {severity.upper()} finding '{title}' at ({x_val}%, {y_val}%)"
    )

    return jsonify({
        "message": "Finding added successfully",
        "finding": {
            "id": finding_id,
            "organId": organ_id,
            "title": title,
            "description": description,
            "severity": severity,
            "x": x_val,
            "y": y_val,
            "recordedBy": recorded_by,
            "recordedAt": now.isoformat(),
        },
        "organStatus": new_status,
    }), 201


# ============================================================
# 5. PATCH /api/findings/:id - Update or Resolve Finding
# ============================================================
@organ_bp.route("/findings/<finding_id>", methods=["PATCH"], strict_slashes=False)
@token_required
def update_or_resolve_finding(finding_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only physicians may edit or resolve clinical findings."}), 403

    db = get_database()
    data = request.get_json(silent=True) or {}

    query = {"_id": ObjectId(finding_id)} if ObjectId.is_valid(finding_id) else {"id": finding_id}
    finding = db.patient_findings.find_one(query)
    if not finding:
        return jsonify({"error": "Not Found", "detail": "Finding not found"}), 404

    patient_id = finding.get("patientId")
    organ_id = finding.get("organId")
    now = datetime.now(timezone.utc)

    updates = {}
    if "title" in data or "label" in data:
        updates["title"] = (data.get("title") or data.get("label") or "").strip()
        updates["label"] = updates["title"]
    if "description" in data or "note" in data:
        updates["description"] = (data.get("description") or data.get("note") or "").strip()
        updates["note"] = updates["description"]
    if "severity" in data:
        sev = (data.get("severity") or "").strip().lower()
        if sev in {"watch", "critical", "normal"}:
            updates["severity"] = sev
    if "x" in data and "y" in data:
        try:
            x_val = float(data["x"])
            y_val = float(data["y"])
            if 0.0 <= x_val <= 100.0 and 0.0 <= y_val <= 100.0:
                updates["x"] = x_val
                updates["y"] = y_val
        except (ValueError, TypeError):
            pass

    if "resolved" in data:
        if data["resolved"] is True:
            updates["resolvedAt"] = now
        else:
            updates["resolvedAt"] = None
    elif "resolvedAt" in data:
        updates["resolvedAt"] = now if data["resolvedAt"] else None

    updates["updatedAt"] = now
    db.patient_findings.update_one(query, {"$set": updates})

    # Re-evaluate status
    new_status, _ = compute_organ_status(patient_id, organ_id, db)
    db.patient_organs.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"status": new_status, "updatedAt": now}},
        upsert=True,
    )

    user = getattr(g, "current_user", {})
    action = "RESOLVE_FINDING" if updates.get("resolvedAt") else "UPDATE_FINDING"
    log_organ_audit(
        db,
        user.get("id") or user.get("sub"),
        user.get("role", "DOCTOR"),
        action,
        organ_id,
        patient_id,
        f"{action} for finding {finding_id}"
    )

    return jsonify({
        "message": "Finding updated successfully",
        "findingId": str(finding_id),
        "organStatus": new_status,
        "resolved": updates.get("resolvedAt") is not None,
    }), 200


# ============================================================
# 6. PUT /api/patients/:id/organs/:organId/clinical-state
# ============================================================
@organ_bp.route("/patients/<patient_id>/organs/<organ_id>/clinical-state", methods=["PUT"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/organs/<organ_id>/clinical-state", methods=["PUT"], strict_slashes=False)
@token_required
def update_clinical_state(patient_id, organ_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only verified physicians may update clinical state."}), 403

    organ_id = (organ_id or "").strip().lower()
    if organ_id not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"organId must be one of: {', '.join(sorted(VALID_ORGAN_KEYS))}"}), 400

    data = request.get_json(silent=True) or {}
    text = (data.get("text") or data.get("clinicalState") or data.get("summary") or "").strip()

    db = get_database()
    now = datetime.now(timezone.utc)

    db.patient_clinical_state.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"text": text, "updatedAt": now}},
        upsert=True,
    )

    user = getattr(g, "current_user", {})
    log_organ_audit(
        db,
        user.get("id") or user.get("sub"),
        user.get("role", "DOCTOR"),
        "UPDATE_CLINICAL_STATE",
        organ_id,
        patient_id,
        f"Updated clinical state for {organ_id}"
    )

    return jsonify({
        "message": "Clinical state updated successfully",
        "organId": organ_id,
        "clinicalState": text,
        "updatedAt": now.isoformat(),
    }), 200


# ============================================================
# 7. POST /api/patients/:id/reports - Link Medical Report
# ============================================================
@organ_bp.route("/patients/<patient_id>/reports", methods=["POST"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/reports", methods=["POST"], strict_slashes=False)
@token_required
def upload_organ_report(patient_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only clinicians or diagnostic staff may link medical reports."}), 403

    data = request.get_json(silent=True) or {}
    organ_id = (data.get("organId") or data.get("organ_id") or "").strip().lower()
    title = (data.get("title") or "").strip()
    file_url = (data.get("fileUrl") or data.get("url") or "#").strip()

    if not organ_id or organ_id not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"organId must be one of: {', '.join(sorted(VALID_ORGAN_KEYS))}"}), 400

    if not title:
        return jsonify({"error": "Validation Error", "detail": "title is required"}), 400

    db = get_database()
    now = datetime.now(timezone.utc)

    report_doc = {
        "patientId": str(patient_id),
        "organId": organ_id,
        "title": title,
        "fileUrl": file_url,
        "uploadedAt": now,
    }

    insert_res = db.patient_organ_reports.insert_one(report_doc)
    report_doc["id"] = str(insert_res.inserted_id)

    return jsonify({
        "message": "Report linked successfully",
        "report": {
            "id": str(insert_res.inserted_id),
            "organId": organ_id,
            "title": title,
            "fileUrl": file_url,
            "uploadedAt": now.isoformat(),
        }
    }), 201


# ============================================================
# 8. PUT /api/patients/:id/organs/:organId/status-override
# ============================================================
@organ_bp.route("/patients/<patient_id>/organs/<organ_id>/status-override", methods=["PUT"], strict_slashes=False)
@organ_bp.route("/patient/<patient_id>/organs/<organ_id>/status-override", methods=["PUT"], strict_slashes=False)
@token_required
def set_status_override(patient_id, organ_id):
    if not is_authorized_writer():
        return jsonify({"error": "Forbidden", "detail": "Only physicians may set a clinical status override."}), 403

    organ_id = (organ_id or "").strip().lower()
    if organ_id not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"organId must be one of: {', '.join(sorted(VALID_ORGAN_KEYS))}"}), 400

    data = request.get_json(silent=True) or {}
    override = data.get("statusOverride")
    if override is not None:
        override = str(override).strip().lower()
        if override not in {"no_data", "normal", "watch", "critical"}:
            return jsonify({"error": "Validation Error", "detail": "statusOverride must be 'no_data', 'normal', 'watch', 'critical', or null"}), 400

    db = get_database()
    now = datetime.now(timezone.utc)

    db.patient_organs.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"statusOverride": override, "updatedAt": now}},
        upsert=True,
    )

    new_status, _ = compute_organ_status(patient_id, organ_id, db)
    db.patient_organs.update_one(
        {"patientId": str(patient_id), "organId": organ_id},
        {"$set": {"status": new_status}},
    )

    user = getattr(g, "current_user", {})
    log_organ_audit(
        db,
        user.get("id") or user.get("sub"),
        user.get("role", "DOCTOR"),
        "STATUS_OVERRIDE",
        organ_id,
        patient_id,
        f"Doctor set status override to '{override}' (Resulting status: {new_status})"
    )

    return jsonify({
        "message": "Status override updated successfully",
        "organId": organ_id,
        "statusOverride": override,
        "status": new_status,
        "updatedAt": now.isoformat(),
    }), 200
