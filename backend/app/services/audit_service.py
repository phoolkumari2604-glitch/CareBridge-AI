from datetime import datetime, timezone


def log_audit_action(
    db,
    user_id: str,
    user_role: str,
    action: str,
    resource: str | None = None,
    resource_id: str | None = None,
    details: str | None = None,
):
    document = {
        "user_id": user_id,
        "user_role": user_role,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "details": details,
        "created_at": datetime.now(timezone.utc),
    }

    result = db.audit_logs.insert_one(document)

    return str(result.inserted_id)
