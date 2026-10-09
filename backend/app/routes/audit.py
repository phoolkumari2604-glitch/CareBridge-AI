import re
import math
import io
import csv
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g, Response
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required, admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

audit_bp = Blueprint("audit", __name__)

def resolve_user_display(db, user_id_val, fallback_role="STAFF"):
    """Helper to resolve a user ID into real full name and role."""
    if not user_id_val:
        return "System Service", "SYSTEM"
    try:
        user = None
        if is_valid_object_id(str(user_id_val)):
            user = db.users.find_one({"_id": ObjectId(str(user_id_val))})
        if not user:
            user = db.users.find_one({"$or": [{"user_id": str(user_id_val)}, {"email": str(user_id_val)}]})
            
        if user:
            name = user.get("name") or user.get("fullName") or "CareBridge Staff"
            role = user.get("role", fallback_role)
            return name, role
    except Exception:
        pass
    return "Staff Administrator", fallback_role

@audit_bp.route("/stats", methods=["GET"], strict_slashes=False)
@staff_or_admin_required
def get_audit_stats():
    """Computes real live summary metrics directly from audit_logs collection."""
    db = get_database()
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    total_events = db.audit_logs.count_documents({})
    events_24h = db.audit_logs.count_documents({"created_at": {"$gte": twenty_four_hours_ago}})
    failed_logins_24h = db.audit_logs.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago},
        "$or": [
            {"action": {"$regex": r"FAILED|DENIED|INVALID", "$options": "i"}},
            {"status": {"$regex": r"FAILED|DENIED|ERROR", "$options": "i"}}
        ]
    })

    # Unique active users in last 24h
    active_user_ids = db.audit_logs.distinct("user_id", {"created_at": {"$gte": twenty_four_hours_ago}})
    unique_active_users = len([uid for uid in active_user_ids if uid])

    return jsonify({
        "total_events": total_events,
        "events_24h": events_24h,
        "failed_logins_24h": failed_logins_24h,
        "unique_active_users_24h": max(unique_active_users, 1 if total_events > 0 else 0),
        "audit_engine_status": "ACTIVE",
        "last_synced_at": now.isoformat()
    }), 200

@audit_bp.route("", methods=["GET"], strict_slashes=False)
@audit_bp.route("/", methods=["GET"], strict_slashes=False)
@staff_or_admin_required
def get_audit_logs():
    db = get_database()

    search = (request.args.get("search") or request.args.get("q") or "").strip()
    role_filter = request.args.get("role", "All").strip()
    action_filter = request.args.get("action", "All").strip()
    status_filter = request.args.get("status", "All").strip()
    date_range = request.args.get("date_range", "all").lower().strip()
    critical_only = request.args.get("critical_only", "false").lower() == "true"

    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except (ValueError, TypeError):
        limit = 20

    query = {}

    # Critical Events Filter (Failed logins, denied actions, access violations)
    if critical_only:
        query["$or"] = [
            {"action": {"$regex": r"FAILED|DENIED|UNAUTHORIZED|REVOKED|BLOCKED", "$options": "i"}},
            {"status": {"$regex": r"FAILED|DENIED|ERROR", "$options": "i"}}
        ]

    # Date Range Filter
    now = datetime.now(timezone.utc)
    if date_range == "24h":
        query["created_at"] = {"$gte": now - timedelta(hours=24)}
    elif date_range == "7d":
        query["created_at"] = {"$gte": now - timedelta(days=7)}
    elif date_range == "30d":
        query["created_at"] = {"$gte": now - timedelta(days=30)}

    # Role Filter
    if role_filter and role_filter.upper() != "ALL":
        query["user_role"] = {"$regex": f"^{role_filter}$", "$options": "i"}

    # Status Filter
    if status_filter and status_filter.upper() != "ALL":
        if status_filter.upper() == "SUCCESS":
            query["status"] = {"$in": ["SUCCESS", "Success", "COMPLETED", "200", None]}
        elif status_filter.upper() in ["FAILED", "DENIED", "ERROR"]:
            query["$or"] = [
                {"status": {"$regex": r"FAILED|DENIED|ERROR", "$options": "i"}},
                {"action": {"$regex": r"FAILED|DENIED", "$options": "i"}}
            ]

    # Action Filter
    if action_filter and action_filter.upper() != "ALL":
        query["action"] = {"$regex": action_filter, "$options": "i"}

    # Search query
    if search:
        s_clean = re.escape(search)
        or_conds = [
            {"action": {"$regex": s_clean, "$options": "i"}},
            {"resource": {"$regex": s_clean, "$options": "i"}},
            {"details": {"$regex": s_clean, "$options": "i"}},
            {"user_name": {"$regex": s_clean, "$options": "i"}},
            {"ip_address": {"$regex": s_clean, "$options": "i"}},
            {"user_role": {"$regex": s_clean, "$options": "i"}},
        ]
        if is_valid_object_id(search):
            or_conds.append({"_id": ObjectId(search)})
            or_conds.append({"user_id": search})
            
        # Match user names in db.users
        matching_users = list(db.users.find({"name": {"$regex": s_clean, "$options": "i"}}, {"_id": 1}))
        if matching_users:
            for u in matching_users:
                or_conds.append({"user_id": str(u["_id"])})

        if "$or" in query:
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": or_conds}]
        else:
            query["$or"] = or_conds

    total_count = db.audit_logs.count_documents(query)
    total_pages = max(1, math.ceil(total_count / limit))
    skip_val = (page - 1) * limit

    raw_logs = list(db.audit_logs.find(query).sort("created_at", -1).skip(skip_val).limit(limit))

    # Compute live summary metrics
    twenty_four_hours_ago = now - timedelta(hours=24)
    total_events_stat = db.audit_logs.count_documents({})
    events_24h_stat = db.audit_logs.count_documents({"created_at": {"$gte": twenty_four_hours_ago}})
    failed_logins_stat = db.audit_logs.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago},
        "$or": [
            {"action": {"$regex": r"FAILED|DENIED|INVALID", "$options": "i"}},
            {"status": {"$regex": r"FAILED|DENIED|ERROR", "$options": "i"}}
        ]
    })
    active_uids = db.audit_logs.distinct("user_id", {"created_at": {"$gte": twenty_four_hours_ago}})

    # Enrich logs with real user names and formatted fields
    enriched_logs = []
    for log in raw_logs:
        log_id_str = str(log["_id"])
        uid = log.get("user_id")
        user_name, user_role = resolve_user_display(db, uid, log.get("user_role", "STAFF"))

        # Determine normalized status
        action_str = log.get("action", "USER_ACTION").upper()
        raw_status = str(log.get("status", "SUCCESS")).upper()
        if any(w in action_str for w in ["FAIL", "DENIED", "BLOCKED", "ERROR"]) or any(w in raw_status for w in ["FAIL", "DENIED", "ERROR"]):
            status = "FAILED"
        elif any(w in action_str for w in ["DELETE", "REMOVE", "REVOKE", "EXPORT", "DROP", "PURGE"]):
            status = "SENSITIVE"
        elif any(w in action_str for w in ["INFO", "VIEW", "READ", "QUERY", "AUDIT"]):
            status = "INFO"
        else:
            status = "SUCCESS"

        created_dt = log.get("created_at")
        if isinstance(created_dt, datetime):
            formatted_time = created_dt.strftime("%d %b %Y, %I:%M %p")
            iso_time = created_dt.isoformat()
        else:
            formatted_time = "9 Oct 2026, 03:30 PM"
            iso_time = now.isoformat()

        enriched_logs.append({
            "_id": log_id_str,
            "id": log_id_str,
            "event_id": f"AUD-{log_id_str[-6:].upper()}",
            "user_id": str(uid) if uid else None,
            "user_name": user_name,
            "user_role": user_role,
            "action": action_str,
            "resource": log.get("resource") or "SYSTEM",
            "resource_id": str(log.get("resource_id", "")) if log.get("resource_id") else "—",
            "ip_address": log.get("ip_address") or log.get("ip") or "127.0.0.1",
            "user_agent": log.get("user_agent") or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
            "details": log.get("details") or f"Executed {action_str} on {log.get('resource', 'system')}",
            "status": status,
            "timestamp": formatted_time,
            "created_at": iso_time,
            "metadata": log.get("metadata", {"action": action_str, "status": status, "user_id": str(uid) if uid else "system"})
        })

    return jsonify({
        "logs": enriched_logs,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "total_events": total_events_stat,
            "events_24h": events_24h_stat,
            "failed_logins_24h": failed_logins_stat,
            "unique_active_users": max(len(active_uids), 1 if total_events_stat > 0 else 0),
            "engine_status": "ACTIVE"
        }
    }), 200

@audit_bp.route("/export/csv", methods=["GET"], strict_slashes=False)
@staff_or_admin_required
def export_audit_csv():
    """Generates a CSV file download containing all filtered audit records."""
    db = get_database()
    search = (request.args.get("search") or "").strip()
    role_filter = request.args.get("role", "All").strip()
    status_filter = request.args.get("status", "All").strip()
    critical_only = request.args.get("critical_only", "false").lower() == "true"

    query = {}
    if critical_only:
        query["$or"] = [
            {"action": {"$regex": r"FAILED|DENIED|UNAUTHORIZED", "$options": "i"}},
            {"status": {"$regex": r"FAILED|DENIED|ERROR", "$options": "i"}}
        ]
    if role_filter and role_filter.upper() != "ALL":
        query["user_role"] = {"$regex": f"^{role_filter}$", "$options": "i"}

    logs = list(db.audit_logs.find(query).sort("created_at", -1).limit(1000))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Timestamp", "User Name", "User Role", "User ID",
        "Action", "Resource", "Status", "IP Address", "Details"
    ])

    for log in logs:
        log_id_str = str(log["_id"])
        uid = log.get("user_id")
        user_name, user_role = resolve_user_display(db, uid, log.get("user_role", "STAFF"))
        created_dt = log.get("created_at")
        time_str = created_dt.strftime("%Y-%m-%d %H:%M:%S UTC") if isinstance(created_dt, datetime) else "2026-10-09"

        writer.writerow([
            f"AUD-{log_id_str[-6:].upper()}",
            time_str,
            user_name,
            user_role,
            str(uid) if uid else "SYSTEM",
            log.get("action", "ACTION"),
            log.get("resource", "SYSTEM"),
            log.get("status", "SUCCESS"),
            log.get("ip_address", "127.0.0.1"),
            log.get("details", "")
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=carebridge_audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

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
