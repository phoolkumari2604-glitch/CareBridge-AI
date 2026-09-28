from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)

from app.schemas.health_records import (
    HealthRecordCreate,
    HealthRecordUpdate,
)


router = APIRouter(
    prefix="/health-records",
    tags=["Health Records"],
)


@router.post("/")
def create_health_record(
    record: HealthRecordCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(record.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(record.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only add records for yourself",
            )

    data = record.model_dump()

    data["patient_id"] = ObjectId(record.patient_id)
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()

    result = db.health_records.insert_one(data)

    return {
        "message": "Health record created successfully",
        "record_id": str(result.inserted_id),
    }


@router.get("/{patient_id}")
def get_health_records(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

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
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own health records",
            )

    records = list(
        db.health_records.find(
            {"patient_id": ObjectId(patient_id)}
        ).sort("created_at", -1)
    )

    for record in records:
        record["_id"] = str(record["_id"])
        record["patient_id"] = str(record["patient_id"])

    return records


@router.get("/{patient_id}/latest")
def get_latest_health_record(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

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
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own health records",
            )

    record = db.health_records.find_one(
        {"patient_id": ObjectId(patient_id)},
        sort=[("created_at", -1)],
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="No health records found",
        )

    record["_id"] = str(record["_id"])
    record["patient_id"] = str(record["patient_id"])

    return record


@router.put("/{record_id}")
def update_health_record(
    record_id: str,
    record: HealthRecordUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(record_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid health record ID",
        )

    existing = db.health_records.find_one(
        {"_id": ObjectId(record_id)}
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Health record not found",
        )

    patient = db.patients.find_one(
        {"_id": existing["patient_id"]}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own health records",
            )

    data = {
        key: value
        for key, value in record.model_dump().items()
        if value is not None
    }

    data["updated_at"] = datetime.utcnow()

    result = db.health_records.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": data},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Health record not found",
        )

    return {
        "message": "Health record updated successfully"
    }


@router.delete("/{record_id}")
def delete_health_record(
    record_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(record_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid health record ID",
        )

    result = db.health_records.delete_one(
        {"_id": ObjectId(record_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Health record not found",
        )

    return {
        "message": "Health record deleted successfully"
    }
