from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required, admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

audit_bp = Blueprint("audit", __name__)

@audit_bp.route("", methods=["POST"], strict_slashes=False)
@audit_bp.route("/", methods=["POST"], strict_slashes=False)
@staff_or_admin_required
def create_audit():
    db = get_database()
    data = request.get_json() or {}
    
    document = {
        "user_id": str(g.current_user["_id"]),
        "user_role": g.current_user.get("role"),
        "action": data.get("action", "USER_ACTION"),
        "resource": data.get("resource"),
        "resource_id": data.get("resource_id"),
        "details": data.get("details"),
        "created_at": datetime.now(timezone.utc)
    }
    result = db.audit_logs.insert_one(document)
    return jsonify({
        "id": str(result.inserted_id),
        "message": "Audit log recorded"
    }), 201

@audit_bp.route("", methods=["GET"], strict_slashes=False)
@audit_bp.route("/", methods=["GET"], strict_slashes=False)
@staff_or_admin_required
def get_audit_logs():
    db = get_database()
    logs = list(db.audit_logs.find().sort("created_at", -1).limit(200))
    return jsonify(serialize_doc(logs)), 200

@audit_bp.route("/<log_id>", methods=["GET"], strict_slashes=False)
@staff_or_admin_required
def get_audit_log(log_id):
    db = get_database()
    if not is_valid_object_id(log_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid audit log ID"}), 400
    log = db.audit_logs.find_one({"_id": ObjectId(log_id)})
    if not log:
        return jsonify({"error": "Not Found", "detail": "Audit log not found"}), 404
    return jsonify(serialize_doc(log)), 200

@audit_bp.route("/<log_id>", methods=["DELETE"], strict_slashes=False)
@admin_required
def delete_audit_log(log_id):
    db = get_database()
    if not is_valid_object_id(log_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid audit log ID"}), 400
    db.audit_logs.delete_one({"_id": ObjectId(log_id)})
    return jsonify({"message": "Audit log deleted successfully"}), 200
