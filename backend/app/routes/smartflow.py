from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
import secrets

from app.core.database import get_database
from app.core.dependencies import require_staff_or_admin

router = APIRouter(
    prefix="/smartflow",
    tags=["SmartFlow"],
)


@router.post("/{appointment_id}")
def run_smartflow(
    appointment_id: str,
    current_user: dict = Depends(require_staff_or_admin),
):
    db = get_database()

    # -------------------------------------------------
    # VALIDATE APPOINTMENT ID
    # -------------------------------------------------

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

    # -------------------------------------------------
    # 1. APPROVAL
    # -------------------------------------------------

    approval = db.approvals.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    if not approval:
        approval_data = {
            "appointment_id": ObjectId(appointment_id),
            "patient_id": appointment["patient_id"],
            "status": "APPROVED",
            "approved_by": current_user["_id"],
            "approved_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        approval_result = db.approvals.insert_one(
            approval_data
        )

        approval_id = approval_result.inserted_id

    else:
        db.approvals.update_one(
            {"_id": approval["_id"]},
            {
                "$set": {
                    "status": "APPROVED",
                    "approved_by": current_user["_id"],
                    "approved_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            }
        )

        approval_id = approval["_id"]

    # -------------------------------------------------
    # 2. UPDATE APPOINTMENT
    # -------------------------------------------------

    db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {
            "$set": {
                "approval_status": "APPROVED",
                "status": "APPROVED",
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # -------------------------------------------------
    # 3. DIGITAL OPD PASS
    # -------------------------------------------------

    opd_pass = db.opd_passes.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    if not opd_pass:

        pass_number = (
            f"OPD-"
            f"{datetime.utcnow().strftime('%Y%m%d')}-"
            f"{secrets.token_hex(3).upper()}"
        )

        opd_pass_data = {
            "appointment_id": ObjectId(appointment_id),
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "pass_number": pass_number,
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        opd_pass_result = db.opd_passes.insert_one(
            opd_pass_data
        )

        opd_pass = {
            **opd_pass_data,
            "_id": opd_pass_result.inserted_id,
        }

    # -------------------------------------------------
    # 4. LIVE QUEUE
    # -------------------------------------------------

    queue_entry = db.queue.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    if not queue_entry:

        # Get the last active token for the same
        # hospital and doctor.
        last_entry = db.queue.find_one(
            {
                "hospital_id": appointment["hospital_id"],
                "doctor_id": appointment["doctor_id"],
                "status": {
                    "$in": [
                        "WAITING",
                        "CALLED",
                        "IN_CONSULTATION",
                    ]
                },
            },
            sort=[("token_number", -1)],
        )

        if last_entry:
            token_number = last_entry["token_number"] + 1
        else:
            token_number = 1

        queue_data = {
            "appointment_id": ObjectId(appointment_id),
            "opd_pass_id": opd_pass["_id"],
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "token_number": token_number,
            "status": "WAITING",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        queue_result = db.queue.insert_one(
            queue_data
        )

        queue_entry = {
            **queue_data,
            "_id": queue_result.inserted_id,
        }

    # -------------------------------------------------
    # 5. CALCULATE QUEUE POSITION
    # -------------------------------------------------

    patients_ahead = db.queue.count_documents(
        {
            "hospital_id": queue_entry["hospital_id"],
            "doctor_id": queue_entry["doctor_id"],
            "status": {
                "$in": [
                    "WAITING",
                    "CALLED",
                    "IN_CONSULTATION",
                ]
            },
            "token_number": {
                "$lt": queue_entry["token_number"]
            },
        }
    )

    queue_position = patients_ahead + 1

    # -------------------------------------------------
    # 6. RESPONSE
    # -------------------------------------------------

    return {
        "message": "SmartFlow completed successfully",

        "appointment": {
            "appointment_id": appointment_id,
            "date": appointment["appointment_date"],
            "time": appointment["appointment_time"],
            "status": "APPROVED",
            "approval_status": "APPROVED",
        },

        "approval": {
            "approval_id": str(approval_id),
            "status": "APPROVED",
        },

        "opd_pass": {
            "opd_pass_id": str(opd_pass["_id"]),
            "pass_number": opd_pass["pass_number"],
            "status": opd_pass["status"],
        },

        "queue": {
            "queue_id": str(queue_entry["_id"]),
            "opd_pass_id": str(queue_entry["opd_pass_id"]),
            "token_number": queue_entry["token_number"],
            "status": queue_entry["status"],
            "patients_ahead": patients_ahead,
            "queue_position": queue_position,
        },
    }