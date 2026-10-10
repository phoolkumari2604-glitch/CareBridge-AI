import json
import time
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, Response
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

notification_bp = Blueprint("notifications", __name__)

@notification_bp.route("", methods=["GET"], strict_slashes=False)
@notification_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_all_notifications():
    db = get_database()
    patient_id = request.args.get("patient_id")
    current_user = getattr(g, "current_user", None) or {}
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    role = (current_user.get("role") or "").upper()

    query = {}
    if patient_id:
        p_obj = ObjectId(patient_id) if is_valid_object_id(patient_id) else None
        query = {"$or": [q for q in [{"patient_id": p_obj}, {"patient_id": patient_id}] if q["patient_id"] is not None]}
    elif role == "PATIENT" and user_id:
        u_obj = ObjectId(user_id) if is_valid_object_id(user_id) else None
        or_conds = [{"patient_id": user_id}, {"user_id": user_id}]
        if u_obj:
            or_conds.extend([{"patient_id": u_obj}, {"user_id": u_obj}])
        query = {"$or": or_conds}

    try:
        limit = max(1, min(100, int(request.args.get("limit", 50))))
    except (ValueError, TypeError):
        limit = 50

    notifications = list(db.notifications.find(query).sort("created_at", -1).limit(limit))
    return jsonify(serialize_doc(notifications)), 200

@notification_bp.route("", methods=["POST"], strict_slashes=False)
@notification_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_notification():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    title = data.get("title")
    message = data.get("message")
    severity = data.get("severity", "INFO").upper()
    
    if not patient_id or not title or not message:
        return jsonify({"error": "Validation Error", "detail": "patient_id, title, and message are required"}), 400
        
    doc = {
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else patient_id,
        "title": title,
        "message": message,
        "notification_type": data.get("notification_type", "GENERAL").upper(),
        "severity": severity if severity in {"CRITICAL", "WARNING", "INFO"} else "INFO",
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = db.notifications.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return jsonify({
        "message": "Notification created successfully",
        "notification_id": str(result.inserted_id),
        "notification": serialize_doc(doc)
    }), 201

@notification_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient_notifications(patient_id):
    db = get_database()
    query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
    notifications = list(db.notifications.find(query).sort("created_at", -1).limit(100))
    return jsonify(serialize_doc(notifications)), 200

@notification_bp.route("/<patient_id>/unread-count", methods=["GET"], strict_slashes=False)
@token_required
def get_unread_count(patient_id):
    db = get_database()
    query = {
        "is_read": False,
        "$or": [
            {"patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else None},
            {"patient_id": patient_id}
        ]
    }
    count = db.notifications.count_documents(query)
    
    # Calculate counters by category
    p_query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
    apts_count = db.notifications.count_documents({**p_query, "notification_type": {"$regex": "APPOINTMENT", "$options": "i"}})
    queue_count = db.notifications.count_documents({**p_query, "notification_type": {"$regex": "QUEUE", "$options": "i"}})
    health_count = db.notifications.count_documents({**p_query, "notification_type": {"$regex": "HEALTH|ALERT|VITAL", "$options": "i"}})
    
    return jsonify({
        "patient_id": patient_id,
        "unread_count": count,
        "appointments_count": apts_count,
        "queue_count": queue_count,
        "health_count": health_count
    }), 200

@notification_bp.route("/<notification_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_notification(notification_id):
    db = get_database()
    if not is_valid_object_id(notification_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid notification ID"}), 400
        
    data = request.get_json() or {}
    is_read = data.get("is_read", True)
    
    db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": is_read, "updated_at": datetime.now(timezone.utc)}}
    )
    return jsonify({"message": "Notification updated successfully"}), 200

@notification_bp.route("/<patient_id>/mark-all-read", methods=["PUT"], strict_slashes=False)
@token_required
def mark_all_as_read(patient_id):
    db = get_database()
    query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
    db.notifications.update_many(
        query,
        {"$set": {"is_read": True, "updated_at": datetime.now(timezone.utc)}}
    )
    return jsonify({"message": "All notifications marked as read"}), 200

@notification_bp.route("/<patient_id>/clear-all", methods=["DELETE"], strict_slashes=False)
@token_required
def clear_all_notifications(patient_id):
    db = get_database()
    query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
    res = db.notifications.delete_many(query)
    return jsonify({"message": "All notifications cleared", "deleted_count": res.deleted_count}), 200

@notification_bp.route("/<notification_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_notification(notification_id):
    db = get_database()
    if not is_valid_object_id(notification_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid notification ID"}), 400
    db.notifications.delete_one({"_id": ObjectId(notification_id)})
    return jsonify({"message": "Notification deleted successfully"}), 200

@notification_bp.route("/simulate-alert", methods=["POST"], strict_slashes=False)
@token_required
def simulate_test_alert():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    severity = data.get("severity", "WARNING").upper()
    notif_type = data.get("notification_type", "HEALTH_ALERT").upper()
    title = data.get("title", f"Simulated {severity.capitalize()} Clinical Alert")
    message = data.get("message", f"Test telemetry trigger: Physiological telemetry update with {severity.lower()} severity notification.")

    if not patient_id:
        return jsonify({"error": "Validation Error", "detail": "patient_id is required"}), 400

    doc = {
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else patient_id,
        "title": title,
        "message": message,
        "notification_type": notif_type,
        "severity": severity if severity in {"CRITICAL", "WARNING", "INFO"} else "WARNING",
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = db.notifications.insert_one(doc)
    doc["id"] = str(result.inserted_id)

    return jsonify({
        "message": "Simulated alert dispatched successfully",
        "notification": serialize_doc(doc)
    }), 201

@notification_bp.route("/<patient_id>/stream", methods=["GET"], strict_slashes=False)
def stream_notifications(patient_id):
    """
    Server-Sent Events (SSE) stream endpoint for real-time notification push and live counter updates.
    """
    def event_stream():
        db = get_database()
        p_query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
        
        # Initial connect heartbeat
        yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'patient_id': patient_id, 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        
        last_check = datetime.now(timezone.utc)
        
        for _ in range(60): # Keep connection open for a cycle
            time.sleep(3)
            # Check for new notifications since last_check
            new_notifs = list(db.notifications.find({**p_query, "created_at": {"$gt": last_check}}).sort("created_at", -1))
            if new_notifs:
                last_check = datetime.now(timezone.utc)
                for n in new_notifs:
                    yield f"event: notification\ndata: {json.dumps(serialize_doc(n))}\n\n"
            else:
                # Send periodic ping
                yield f": heartbeat {int(time.time())}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")
