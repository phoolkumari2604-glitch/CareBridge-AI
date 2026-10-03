from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, UTC

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)
from app.schemas.patient import PatientCreate, PatientUpdate


router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


# ============================================================
# CREATE PATIENT
# ============================================================

@router.post("/")
def create_patient(
    patient: PatientCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    data = patient.model_dump()
    data["created_at"] = datetime.now(UTC)

    # Link the patient record to the authenticated user.
    data["user_id"] = str(current_user["_id"])

    result = db.patients.insert_one(data)

    return {
        "message": "Patient created successfully",
        "patient_id": str(result.inserted_id)
    }


# ============================================================
# GET ALL PATIENTS
# STAFF + ADMIN ONLY
# ============================================================

@router.get("/")
def get_patients(
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    patients = list(db.patients.find())

    for patient in patients:
        patient["_id"] = str(patient["_id"])

    return patients


# ============================================================
# GET SINGLE PATIENT
# PATIENT -> OWN RECORD ONLY
# STAFF/ADMIN -> ANY PATIENT
# ============================================================

@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID"
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # PATIENT users can only access their own record.
    if current_user.get("role") == "PATIENT":

        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own patient record"
            )

    patient["_id"] = str(patient["_id"])

    return patient


# ============================================================
# UPDATE PATIENT
# PATIENT -> OWN RECORD ONLY
# STAFF/ADMIN -> ANY PATIENT
# ============================================================

@router.put("/{patient_id}")
def update_patient(
    patient_id: str,
    patient: PatientUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID"
        )

    existing_patient = db.patients.find_one(
        {"_id": ObjectId(patient_id)}
    )

    if not existing_patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # PATIENT users can only update their own record.
    if current_user.get("role") == "PATIENT":

        current_user_id = str(current_user["_id"])

        owns_record = (
            existing_patient.get("user_id") == current_user_id
            or existing_patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own patient record"
            )

    data = {
        key: value
        for key, value in patient.model_dump().items()
        if value is not None
    }

    result = db.patients.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return {
        "message": "Patient updated successfully"
    }


# ============================================================
# DELETE PATIENT
# STAFF + ADMIN ONLY
# ============================================================

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID"
        )

    result = db.patients.delete_one(
        {"_id": ObjectId(patient_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return {
        "message": "Patient deleted successfully"
    }
