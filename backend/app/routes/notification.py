from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

notification_bp = Blueprint("notifications", __name__)

@notification_bp.route("", methods=["POST"], strict_slashes=False)
@notification_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_notification():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    title = data.get("title")
    message = data.get("message")
    
    if not patient_id or not title or not message:
        return jsonify({"error": "Validation Error", "detail": "patient_id, title, and message are required"}), 400
        
    doc = {
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else patient_id,
        "title": title,
        "message": message,
        "notification_type": data.get("notification_type", "GENERAL"),
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    result = db.notifications.insert_one(doc)
    return jsonify({
        "message": "Notification created successfully",
        "notification_id": str(result.inserted_id)
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
    return jsonify({"patient_id": patient_id, "unread_count": count}), 200

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

@notification_bp.route("/<notification_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_notification(notification_id):
    db = get_database()
    if not is_valid_object_id(notification_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid notification ID"}), 400
    db.notifications.delete_one({"_id": ObjectId(notification_id)})
    return jsonify({"message": "Notification deleted successfully"}), 200
