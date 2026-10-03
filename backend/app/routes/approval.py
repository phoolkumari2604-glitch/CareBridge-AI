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
    prefix="/approvals",
    tags=["Approvals"],
)


@router.post("/{appointment_id}")
def create_approval(
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

    existing = db.approvals.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Approval already exists"
        )

    approval = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "status": "PENDING",
        "approved_by": None,
        "created_at":datetime.now(UTC),
        "updated_at":datetime.now(UTC),
    }

    result = db.approvals.insert_one(approval)

    return {
        "message": "Approval created successfully",
        "approval_id": str(result.inserted_id),
        "status": "PENDING",
    }


@router.get("/")
def get_approvals(
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    approvals = list(db.approvals.find())

    for approval in approvals:
        approval["_id"] = str(approval["_id"])
        approval["appointment_id"] = str(
            approval["appointment_id"]
        )
        approval["patient_id"] = str(
            approval["patient_id"]
        )

        if approval.get("approved_by"):
            approval["approved_by"] = str(
                approval["approved_by"]
            )

    return approvals


@router.get("/{approval_id}")
def get_approval(
    approval_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(approval_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid approval ID"
        )

    approval = db.approvals.find_one(
        {"_id": ObjectId(approval_id)}
    )

    if not approval:
        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    if current_user.get("role") == "PATIENT":

        patient_id = str(approval["patient_id"])
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
                detail="You can only access your own approval"
            )

    approval["_id"] = str(approval["_id"])
    approval["appointment_id"] = str(
        approval["appointment_id"]
    )
    approval["patient_id"] = str(
        approval["patient_id"]
    )

    if approval.get("approved_by"):
        approval["approved_by"] = str(
            approval["approved_by"]
        )

    return approval


@router.put("/{approval_id}")
def update_approval(
    approval_id: str,
    status: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    if not ObjectId.is_valid(approval_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid approval ID"
        )

    status = status.upper()

    if status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be APPROVED or REJECTED"
        )

    approval = db.approvals.find_one(
        {"_id": ObjectId(approval_id)}
    )

    if not approval:
        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    update_data = {
        "status": status,
        "approved_by": current_user["_id"],
        "updated_at":datetime.now(UTC),
    }

    if status == "APPROVED":
        update_data["approved_at"] =datetime.now(UTC)

    result = db.approvals.update_one(
        {"_id": ObjectId(approval_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    # -----------------------------------------
    # Synchronize appointment approval status
    # -----------------------------------------
    if status == "APPROVED":

        db.appointments.update_one(
            {"_id": approval["appointment_id"]},
            {
                "$set": {
                    "approval_status": "APPROVED",
                    "updated_at":datetime.now(UTC),
                }
            }
        )

    elif status == "REJECTED":

        db.appointments.update_one(
            {"_id": approval["appointment_id"]},
            {
                "$set": {
                    "approval_status": "REJECTED",
                    "updated_at":datetime.now(UTC),
                }
            }
        )

    return {
        "message": f"Approval {status.lower()} successfully",
        "approval_id": approval_id,
        "status": status,
    }


@router.delete("/{approval_id}")
def delete_approval(
    approval_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(approval_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid approval ID"
        )

    result = db.approvals.delete_one(
        {"_id": ObjectId(approval_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    return {
        "message": "Approval deleted successfully"
    }

