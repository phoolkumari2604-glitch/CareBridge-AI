from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)

from app.schemas.vitals import (
    VitalSignsCreate,
    VitalSignsUpdate,
)


router = APIRouter(
    prefix="/vitals",
    tags=["Vital Signs"],
)


@router.post("/")
def create_vital_signs(
    vitals: VitalSignsCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(vitals.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(vitals.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    # Patients can add vital signs only for themselves
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only add vital signs for yourself",
            )

    data = vitals.model_dump()

    data["patient_id"] = ObjectId(vitals.patient_id)
    data["recorded_at"] = datetime.utcnow()

    result = db.vital_signs.insert_one(data)

    return {
        "message": "Vital signs recorded successfully",
        "vital_id": str(result.inserted_id),
    }


@router.get("/{patient_id}")
def get_vital_signs(
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

    # Patients can access only their own vital signs
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own vital signs",
            )

    vitals = list(
        db.vital_signs.find(
            {"patient_id": ObjectId(patient_id)}
        ).sort("recorded_at", -1)
    )

    for vital in vitals:
        vital["_id"] = str(vital["_id"])
        vital["patient_id"] = str(vital["patient_id"])

    return vitals


@router.get("/{patient_id}/latest")
def get_latest_vital_signs(
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

    # Patients can access only their own latest vital signs
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own vital signs",
            )

    vital = db.vital_signs.find_one(
        {"patient_id": ObjectId(patient_id)},
        sort=[("recorded_at", -1)],
    )

    if not vital:
        raise HTTPException(
            status_code=404,
            detail="No vital signs found",
        )

    vital["_id"] = str(vital["_id"])
    vital["patient_id"] = str(vital["patient_id"])

    return vital


@router.put("/{vital_id}")
def update_vital_signs(
    vital_id: str,
    vitals: VitalSignsUpdate,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(vital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid vital signs ID",
        )

    existing = db.vital_signs.find_one(
        {"_id": ObjectId(vital_id)}
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Vital signs record not found",
        )

    patient = db.patients.find_one(
        {"_id": existing["patient_id"]}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    data = {
        key: value
        for key, value in vitals.model_dump().items()
        if value is not None
    }

    data["updated_at"] = datetime.utcnow()

    result = db.vital_signs.update_one(
        {"_id": ObjectId(vital_id)},
        {"$set": data},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Vital signs record not found",
        )

    return {
        "message": "Vital signs updated successfully",
    }


@router.delete("/{vital_id}")
def delete_vital_signs(
    vital_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(vital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid vital signs ID",
        )

    result = db.vital_signs.delete_one(
        {"_id": ObjectId(vital_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Vital signs record not found",
        )

    return {
        "message": "Vital signs deleted successfully",
    }