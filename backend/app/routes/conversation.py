from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.conversation import (
    ConversationMessageCreate,
    ConversationMessageResponse,
)

router = APIRouter(
    prefix="/ai-assistant",
    tags=["AI Assistant"],
)


def check_patient_access(patient_id: str, current_user: dict, db):
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    patient = db.patients.find_one({"_id": ObjectId(patient_id)})

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.get("role") == "PATIENT":
        owns_patient = (
            patient.get("user_id") == str(current_user["_id"])
            or patient.get("email") == current_user.get("email")
        )

        if not owns_patient:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own AI conversation history",
            )

    return patient


@router.post(
    "/history",
    response_model=ConversationMessageResponse,
)
def save_conversation_message(
    request: ConversationMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    check_patient_access(
        request.patient_id,
        current_user,
        db,
    )

    if request.sender not in {"USER", "AI"}:
        raise HTTPException(
            status_code=400,
            detail="sender must be USER or AI",
        )

    document = {
        "patient_id": ObjectId(request.patient_id),
        "message": request.message,
        "sender": request.sender,
        "created_at": datetime.now(timezone.utc),
    }

    result = db.ai_conversations.insert_one(document)

    return {
        "id": str(result.inserted_id),
        "patient_id": request.patient_id,
        "message": request.message,
        "sender": request.sender,
        "created_at": document["created_at"].isoformat(),
    }


@router.get(
    "/history/{patient_id}",
    response_model=list[ConversationMessageResponse],
)
def get_conversation_history(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    check_patient_access(
        patient_id,
        current_user,
        db,
    )

    messages = list(
        db.ai_conversations
        .find({"patient_id": ObjectId(patient_id)})
        .sort("created_at", 1)
        .limit(100)
    )

    return [
        {
            "id": str(message["_id"]),
            "patient_id": patient_id,
            "message": message["message"],
            "sender": message["sender"],
            "created_at": (
                message["created_at"].isoformat()
                if message.get("created_at")
                else None
            ),
        }
        for message in messages
    ]


@router.delete("/history/{message_id}")
def delete_conversation_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(message_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid message ID",
        )

    message = db.ai_conversations.find_one(
        {"_id": ObjectId(message_id)}
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Conversation message not found",
        )

    patient_id = str(message["patient_id"])

    check_patient_access(
        patient_id,
        current_user,
        db,
    )

    result = db.ai_conversations.delete_one(
        {"_id": ObjectId(message_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Conversation message not found",
        )

    return {
        "message": "Conversation message deleted successfully"
    }
