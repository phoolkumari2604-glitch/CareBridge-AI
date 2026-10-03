from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, UTC

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
    require_admin,
)

router = APIRouter(
    prefix="/opd-pass",
    tags=["Digital OPD Pass"],
)


@router.post("/{appointment_id}")
def create_opd_pass(
    appointment_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment ID"
        )

    appointment = db.appointments.find_one(
        {"_id": ObjectId(appointment_id)}
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    existing_pass = db.opd_passes.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    if existing_pass:
        raise HTTPException(
            status_code=409,
            detail="OPD pass already exists"
        )

    pass_number = (
        f"OPD-{datetime.utcnow().strftime('%Y%m%d')}-"
        f"{str(appointment['_id'])[-6:].upper()}"
    )

    opd_pass = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "hospital_id": appointment["hospital_id"],
        "doctor_id": appointment["doctor_id"],
        "pass_number": pass_number,
        "status": "ACTIVE",
        "created_at":datetime.now(UTC),
        "updated_at":datetime.now(UTC),
    }

    result = db.opd_passes.insert_one(opd_pass)

    return {
        "message": "Digital OPD pass created successfully",
        "opd_pass_id": str(result.inserted_id),
        "pass_number": pass_number,
        "status": "ACTIVE",
    }


@router.get("/")
def get_opd_passes(
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    passes = list(db.opd_passes.find())

    for opd_pass in passes:
        opd_pass["_id"] = str(opd_pass["_id"])
        opd_pass["appointment_id"] = str(
            opd_pass["appointment_id"]
        )
        opd_pass["patient_id"] = str(
            opd_pass["patient_id"]
        )
        opd_pass["hospital_id"] = str(
            opd_pass["hospital_id"]
        )
        opd_pass["doctor_id"] = str(
            opd_pass["doctor_id"]
        )

    return passes


@router.get("/{opd_pass_id}")
def get_opd_pass(
    opd_pass_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(opd_pass_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid OPD pass ID"
        )

    opd_pass = db.opd_passes.find_one(
        {"_id": ObjectId(opd_pass_id)}
    )

    if not opd_pass:
        raise HTTPException(
            status_code=404,
            detail="OPD pass not found"
        )

    if current_user.get("role") == "PATIENT":

        patient_id = str(opd_pass["patient_id"])
        current_user_id = str(current_user["_id"])

        patient = db.patients.find_one(
            {"_id": ObjectId(patient_id)}
        )

        owns_record = (
            patient
            and (
                patient.get("user_id") == current_user_id
                or patient.get("email")
                == current_user.get("email")
            )
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own OPD pass"
            )

    opd_pass["_id"] = str(opd_pass["_id"])
    opd_pass["appointment_id"] = str(
        opd_pass["appointment_id"]
    )
    opd_pass["patient_id"] = str(
        opd_pass["patient_id"]
    )
    opd_pass["hospital_id"] = str(
        opd_pass["hospital_id"]
    )
    opd_pass["doctor_id"] = str(
        opd_pass["doctor_id"]
    )

    return opd_pass


@router.put("/{opd_pass_id}")
def update_opd_pass(
    opd_pass_id: str,
    status: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(opd_pass_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid OPD pass ID"
        )

    status = status.upper()

    if status not in {
        "ACTIVE",
        "USED",
        "EXPIRED",
        "CANCELLED",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid OPD pass status"
        )

    result = db.opd_passes.update_one(
        {"_id": ObjectId(opd_pass_id)},
        {
            "$set": {
                "status": status,
                "updated_at":datetime.now(UTC),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="OPD pass not found"
        )

    return {
        "message": "OPD pass updated successfully",
        "opd_pass_id": opd_pass_id,
        "status": status,
    }


@router.delete("/{opd_pass_id}")
def delete_opd_pass(
    opd_pass_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(opd_pass_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid OPD pass ID"
        )

    result = db.opd_passes.delete_one(
        {"_id": ObjectId(opd_pass_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="OPD pass not found"
        )

    return {
        "message": "OPD pass deleted successfully"
    }

