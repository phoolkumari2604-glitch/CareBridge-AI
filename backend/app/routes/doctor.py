from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_admin,
)
from app.schemas.doctor import DoctorCreate, DoctorUpdate


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"]
)


# ============================================================
# CREATE DOCTOR
# ADMIN ONLY
# ============================================================

@router.post("/")
def create_doctor(
    doctor: DoctorCreate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    # Check whether hospital exists
    if not ObjectId.is_valid(doctor.hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    hospital = db.hospitals.find_one(
        {"_id": ObjectId(doctor.hospital_id)}
    )

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    data = doctor.model_dump()

    data["hospital_id"] = ObjectId(doctor.hospital_id)
    data["created_at"] = datetime.utcnow()

    result = db.doctors.insert_one(data)

    return {
        "message": "Doctor created successfully",
        "doctor_id": str(result.inserted_id)
    }


# ============================================================
# GET ALL DOCTORS
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/")
def get_doctors(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    doctors = list(db.doctors.find())

    for doctor in doctors:
        doctor["_id"] = str(doctor["_id"])
        doctor["hospital_id"] = str(doctor["hospital_id"])

    return doctors


# ============================================================
# GET SINGLE DOCTOR
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/{doctor_id}")
def get_doctor(
    doctor_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    doctor = db.doctors.find_one(
        {"_id": ObjectId(doctor_id)}
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    doctor["_id"] = str(doctor["_id"])
    doctor["hospital_id"] = str(doctor["hospital_id"])

    return doctor


# ============================================================
# GET DOCTOR AVAILABILITY
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/{doctor_id}/availability")
def get_doctor_availability(
    doctor_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    doctor = db.doctors.find_one(
        {"_id": ObjectId(doctor_id)}
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    return {
        "doctor_id": doctor_id,
        "doctor_name": doctor["name"],
        "available_days": doctor.get(
            "available_days",
            []
        ),
        "available_slots": doctor.get(
            "available_slots",
            []
        ),
        "status": doctor.get(
            "status",
            "AVAILABLE"
        )
    }


# ============================================================
# UPDATE DOCTOR
# ADMIN ONLY
# ============================================================

@router.put("/{doctor_id}")
def update_doctor(
    doctor_id: str,
    doctor: DoctorUpdate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    data = {
        key: value
        for key, value in doctor.model_dump().items()
        if value is not None
    }

    # If hospital_id is being updated,
    # verify that the hospital exists.
    if "hospital_id" in data:

        if not ObjectId.is_valid(
            data["hospital_id"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid hospital ID"
            )

        hospital = db.hospitals.find_one(
            {
                "_id": ObjectId(
                    data["hospital_id"]
                )
            }
        )

        if not hospital:
            raise HTTPException(
                status_code=404,
                detail="Hospital not found"
            )

        data["hospital_id"] = ObjectId(
            data["hospital_id"]
        )

    result = db.doctors.update_one(
        {"_id": ObjectId(doctor_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    return {
        "message": "Doctor updated successfully"
    }


# ============================================================
# DELETE DOCTOR
# ADMIN ONLY
# ============================================================

@router.delete("/{doctor_id}")
def delete_doctor(
    doctor_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    result = db.doctors.delete_one(
        {"_id": ObjectId(doctor_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    return {
        "message": "Doctor deleted successfully"
    }