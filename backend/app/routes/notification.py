from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def check_patient_access(
    patient_id: str,
    current_user: dict,
    db,
):
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if current_user.get("role") == "PATIENT":
        owns_patient = (
            patient.get("user_id") == str(current_user["_id"])
            or patient.get("email") == current_user.get("email")
        )

        if not owns_patient:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own notifications",
            )

    return patient


@router.post(
    "/",
    response_model=NotificationResponse,
)
def create_notification(
    request: NotificationCreate,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(request.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(request.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    now = datetime.now(timezone.utc)

    document = {
        "patient_id": ObjectId(request.patient_id),
        "title": request.title,
        "message": request.message,
        "notification_type": request.notification_type,
        "is_read": False,
        "created_at": now,
    }

    result = db.notifications.insert_one(document)

    return {
        "id": str(result.inserted_id),
        "patient_id": request.patient_id,
        "title": request.title,
        "message": request.message,
        "notification_type": request.notification_type,
        "is_read": False,
        "created_at": now.isoformat(),
    }


@router.get(
    "/{patient_id}",
    response_model=list[NotificationResponse],
)
def get_patient_notifications(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    check_patient_access(
        patient_id,
        current_user,
        db,
    )

    notifications = list(
        db.notifications.find(
            {"patient_id": ObjectId(patient_id)}
        )
        .sort("created_at", -1)
        .limit(100)
    )

    return [
        {
            "id": str(notification["_id"]),
            "patient_id": patient_id,
            "title": notification["title"],
            "message": notification["message"],
            "notification_type": notification["notification_type"],
            "is_read": notification.get("is_read", False),
            "created_at": (
                notification["created_at"].isoformat()
                if notification.get("created_at")
                else None
            ),
        }
        for notification in notifications
    ]


@router.get(
    "/{patient_id}/unread-count",
)
def get_unread_notification_count(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    check_patient_access(
        patient_id,
        current_user,
        db,
    )

    count = db.notifications.count_documents(
        {
            "patient_id": ObjectId(patient_id),
            "is_read": False,
        }
    )

    return {
        "patient_id": patient_id,
        "unread_count": count,
    }


@router.put(
    "/{notification_id}",
    response_model=NotificationResponse,
)
def update_notification(
    notification_id: str,
    request: NotificationUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(notification_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid notification ID",
        )

    notification = db.notifications.find_one(
        {"_id": ObjectId(notification_id)}
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    patient_id = str(notification["patient_id"])

    check_patient_access(
        patient_id,
        current_user,
        db,
    )

    update_data = {}

    if request.is_read is not None:
        update_data["is_read"] = request.is_read

    if update_data:
        db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": update_data},
        )

    updated = db.notifications.find_one(
        {"_id": ObjectId(notification_id)}
    )

    return {
        "id": str(updated["_id"]),
        "patient_id": str(updated["patient_id"]),
        "title": updated["title"],
        "message": updated["message"],
        "notification_type": updated["notification_type"],
        "is_read": updated.get("is_read", False),
        "created_at": (
            updated["created_at"].isoformat()
            if updated.get("created_at")
            else None
        ),
    }


@router.delete(
    "/{notification_id}",
)
def delete_notification(
    notification_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(notification_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid notification ID",
        )

    result = db.notifications.delete_one(
        {"_id": ObjectId(notification_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return {
        "message": "Notification deleted successfully"
    }
