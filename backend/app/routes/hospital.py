from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_admin,
)
from app.schemas.hospital import HospitalCreate, HospitalUpdate


router = APIRouter(
    prefix="/hospitals",
    tags=["Hospitals"]
)


# ============================================================
# CREATE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.post("/")
def create_hospital(
    hospital: HospitalCreate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    data = hospital.model_dump()
    data["created_at"] = datetime.utcnow()

    result = db.hospitals.insert_one(data)

    return {
        "message": "Hospital created successfully",
        "hospital_id": str(result.inserted_id)
    }


# ============================================================
# GET ALL HOSPITALS
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/")
def get_hospitals(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    hospitals = list(db.hospitals.find())

    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])

    return hospitals


# ============================================================
# GET SINGLE HOSPITAL
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/{hospital_id}")
def get_hospital(
    hospital_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    hospital = db.hospitals.find_one(
        {"_id": ObjectId(hospital_id)}
    )

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    hospital["_id"] = str(hospital["_id"])

    return hospital


# ============================================================
# UPDATE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.put("/{hospital_id}")
def update_hospital(
    hospital_id: str,
    hospital: HospitalUpdate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    data = {
        key: value
        for key, value in hospital.model_dump().items()
        if value is not None
    }

    result = db.hospitals.update_one(
        {"_id": ObjectId(hospital_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    return {
        "message": "Hospital updated successfully"
    }


# ============================================================
# DELETE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.delete("/{hospital_id}")
def delete_hospital(
    hospital_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    result = db.hospitals.delete_one(
        {"_id": ObjectId(hospital_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    return {
        "message": "Hospital deleted successfully"
    }


# ============================================================
# SEARCH HOSPITALS BY CITY
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/search/by-city")
def search_hospitals_by_city(
    city: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    hospitals = list(
        db.hospitals.find(
            {
                "city": {
                    "$regex": city,
                    "$options": "i"
                }
            }
        )
    )

    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])

    return hospitals