from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, UTC

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)

from app.schemas.health import (
    HealthProfileCreate,
    HealthProfileUpdate,
)


router = APIRouter(
    prefix="/health-profiles",
    tags=["Health Monitoring"],
)


# ============================================================
# CREATE HEALTH PROFILE
# ============================================================

@router.post("/")
def create_health_profile(
    profile: HealthProfileCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(profile.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(profile.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    # Patients can create only their own health profile
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only create your own health profile",
            )

    # Prevent duplicate health profile
    existing_profile = db.health_profiles.find_one(
        {"patient_id": ObjectId(profile.patient_id)}
    )

    if existing_profile:
        raise HTTPException(
            status_code=409,
            detail="Health profile already exists",
        )

    data = profile.model_dump()

    data["patient_id"] = ObjectId(
        profile.patient_id
    )

    data["created_at"] =datetime.now(UTC)
    data["updated_at"] =datetime.now(UTC)

    result = db.health_profiles.insert_one(data)

    return {
        "message": "Health profile created successfully",
        "health_profile_id": str(result.inserted_id),
    }


# ============================================================
# GET HEALTH PROFILE
# ============================================================

@router.get("/{patient_id}")
def get_health_profile(
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

    # Patients can view only their own profile
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own health profile",
            )

    profile = db.health_profiles.find_one(
        {"patient_id": ObjectId(patient_id)}
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Health profile not found",
        )

    profile["_id"] = str(profile["_id"])
    profile["patient_id"] = str(profile["patient_id"])

    return profile


# ============================================================
# UPDATE HEALTH PROFILE
# ============================================================

@router.put("/{patient_id}")
def update_health_profile(
    patient_id: str,
    profile: HealthProfileUpdate,
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

    # Patients can update only their own profile
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own health profile",
            )

    data = {
        key: value
        for key, value in profile.model_dump().items()
        if value is not None
    }

    data["updated_at"] =datetime.now(UTC)

    result = db.health_profiles.update_one(
        {
            "patient_id": ObjectId(patient_id)
        },
        {
            "$set": data
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Health profile not found",
        )

    return {
        "message": "Health profile updated successfully",
    }


# ============================================================
# DELETE HEALTH PROFILE
# ADMIN ONLY
# ============================================================

@router.delete("/{patient_id}")
def delete_health_profile(
    patient_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    result = db.health_profiles.delete_one(
        {
            "patient_id": ObjectId(patient_id)
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Health profile not found",
        )

    return {
        "message": "Health profile deleted successfully",
    }




    

