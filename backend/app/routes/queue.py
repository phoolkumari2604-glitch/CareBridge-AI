from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, UTC

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.queue import QueueCreate, QueueUpdate


router = APIRouter(
    prefix="/queue",
    tags=["Live Queue"]
)


@router.post("/")
def create_queue_entry(
    queue: QueueCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # 1. Validate appointment ID
    if not ObjectId.is_valid(queue.appointment_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment ID"
        )

    # 2. Find appointment
    appointment = db.appointments.find_one(
        {"_id": ObjectId(queue.appointment_id)}
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    # 3. Appointment must be approved
    if appointment.get("approval_status") != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Only approved appointments can enter the queue"
        )

    # 4. Check OPD pass
    opd_pass = db.opd_passes.find_one(
        {"appointment_id": ObjectId(queue.appointment_id)}
    )

    if not opd_pass:
        raise HTTPException(
            status_code=400,
            detail="Digital OPD pass not found"
        )

    # 5. Check whether patient is already in queue
    existing_queue = db.queue.find_one(
        {"appointment_id": ObjectId(queue.appointment_id)}
    )

    if existing_queue:
        raise HTTPException(
            status_code=409,
            detail="Appointment is already in the queue"
        )

    # 6. Generate next token number
    last_queue = db.queue.find_one(
        {
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "status": {
                "$in": [
                    "WAITING",
                    "CALLED",
                    "IN_CONSULTATION"
                ]
            }
        },
        sort=[("token_number", -1)]
    )

    if last_queue:
        token_number = last_queue["token_number"] + 1
    else:
        token_number = 1

    # 7. Create queue entry
    data = {
        "appointment_id": appointment["_id"],
        "opd_pass_id": opd_pass["_id"],
        "patient_id": appointment["patient_id"],
        "hospital_id": appointment["hospital_id"],
        "doctor_id": appointment["doctor_id"],
        "token_number": token_number,
        "status": "WAITING",
        "created_at":datetime.now(UTC),
        "updated_at":datetime.now(UTC)
    }

    # 8. Save queue entry
    result = db.queue.insert_one(data)

    return {
        "message": "Patient added to live queue successfully",
        "queue_id": str(result.inserted_id),
        "appointment_id": queue.appointment_id,
        "token_number": token_number,
        "status": "WAITING"
    }


@router.get("/")
def get_queue(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    queue_entries = list(
        db.queue.find().sort("token_number", 1)
    )

    for entry in queue_entries:
        entry["_id"] = str(entry["_id"])
        entry["appointment_id"] = str(entry["appointment_id"])
        entry["opd_pass_id"] = str(entry["opd_pass_id"])
        entry["patient_id"] = str(entry["patient_id"])
        entry["hospital_id"] = str(entry["hospital_id"])
        entry["doctor_id"] = str(entry["doctor_id"])

    return queue_entries


@router.get("/{queue_id}")
def get_queue_entry(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # Validate queue ID
    if not ObjectId.is_valid(queue_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid queue ID"
        )

    # Find queue entry
    entry = db.queue.find_one(
        {"_id": ObjectId(queue_id)}
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found"
        )

    # Calculate patients ahead
    patients_ahead = db.queue.count_documents(
        {
            "hospital_id": entry["hospital_id"],
            "doctor_id": entry["doctor_id"],
            "status": {
                "$in": [
                    "WAITING",
                    "CALLED",
                    "IN_CONSULTATION"
                ]
            },
            "token_number": {
                "$lt": entry["token_number"]
            }
        }
    )

    # Convert ObjectIds to strings
    entry["_id"] = str(entry["_id"])
    entry["appointment_id"] = str(entry["appointment_id"])
    entry["opd_pass_id"] = str(entry["opd_pass_id"])
    entry["patient_id"] = str(entry["patient_id"])
    entry["hospital_id"] = str(entry["hospital_id"])
    entry["doctor_id"] = str(entry["doctor_id"])

    # Add queue information
    entry["patients_ahead"] = patients_ahead
    entry["queue_position"] = patients_ahead + 1

    return entry


@router.put("/{queue_id}")
def update_queue_entry(
    queue_id: str,
    queue: QueueUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # Validate queue ID
    if not ObjectId.is_valid(queue_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid queue ID"
        )

    # Check queue entry
    existing_entry = db.queue.find_one(
        {"_id": ObjectId(queue_id)}
    )

    if not existing_entry:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found"
        )

    # Allowed queue statuses
    allowed_statuses = [
        "WAITING",
        "CALLED",
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED"
    ]

    if queue.status is not None:
        if queue.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid queue status"
            )

    # Prepare update
    data = {
        key: value
        for key, value in queue.model_dump().items()
        if value is not None
    }

    data["updated_at"] =datetime.now(UTC)

    # Update MongoDB
    result = db.queue.update_one(
        {"_id": ObjectId(queue_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found"
        )

    return {
        "message": "Queue status updated successfully"
    }


@router.delete("/{queue_id}")
def delete_queue_entry(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # Validate queue ID
    if not ObjectId.is_valid(queue_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid queue ID"
        )

    result = db.queue.delete_one(
        {"_id": ObjectId(queue_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found"
        )

    return {
        "message": "Queue entry deleted successfully"
    }

