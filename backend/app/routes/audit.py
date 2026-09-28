from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_database
from app.core.dependencies import require_admin, require_staff_or_admin
from app.schemas.audit import AuditLogResponse


router = APIRouter(
    prefix="/audit-logs",
    tags=["Security & Audit"],
)


@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    action: str,
    resource: str | None = None,
    resource_id: str | None = None,
    details: str | None = None,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    document = {
        "user_id": str(current_user["_id"]),
        "user_role": current_user.get("role"),
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "details": details,
        "created_at": datetime.now(timezone.utc),
    }

    result = db.audit_logs.insert_one(document)

    return {
        "id": str(result.inserted_id),
        "user_id": document["user_id"],
        "user_role": document["user_role"],
        "action": document["action"],
        "resource": document["resource"],
        "resource_id": document["resource_id"],
        "details": document["details"],
        "created_at": document["created_at"].isoformat(),
    }


@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    logs = list(
        db.audit_logs.find()
        .sort("created_at", -1)
        .limit(200)
    )

    return [
        {
            "id": str(log["_id"]),
            "user_id": log.get("user_id"),
            "user_role": log.get("user_role"),
            "action": log.get("action"),
            "resource": log.get("resource"),
            "resource_id": log.get("resource_id"),
            "details": log.get("details"),
            "created_at": (
                log["created_at"].isoformat()
                if log.get("created_at")
                else None
            ),
        }
        for log in logs
    ]


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(log_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid audit log ID",
        )

    log = db.audit_logs.find_one(
        {"_id": ObjectId(log_id)}
    )

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found",
        )

    return {
        "id": str(log["_id"]),
        "user_id": log.get("user_id"),
        "user_role": log.get("user_role"),
        "action": log.get("action"),
        "resource": log.get("resource"),
        "resource_id": log.get("resource_id"),
        "details": log.get("details"),
        "created_at": (
            log["created_at"].isoformat()
            if log.get("created_at")
            else None
        ),
    }


@router.delete("/{log_id}")
def delete_audit_log(
    log_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(log_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid audit log ID",
        )

    result = db.audit_logs.delete_one(
        {"_id": ObjectId(log_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found",
        )

    return {
        "message": "Audit log deleted successfully"
    }
