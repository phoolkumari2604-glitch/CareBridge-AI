from fastapi import HTTPException
from bson import ObjectId
from datetime import datetime
import uuid


def run_smartflow(db, appointment_id: str):

    # 1. Validate appointment ID
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

    # 2. Check approval
    if appointment.get("approval_status") != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Appointment is not approved"
        )

    # 3. Check whether OPD pass already exists
    opd_pass = db.opd_passes.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    # 4. Generate OPD pass if it does not exist
    if not opd_pass:

        pass_number = (
            f"OPD-{datetime.utcnow().strftime('%Y%m%d')}-"
            f"{uuid.uuid4().hex[:6].upper()}"
        )

        opd_pass_data = {
            "appointment_id": appointment["_id"],
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "pass_number": pass_number,
            "appointment_date": appointment["appointment_date"],
            "appointment_time": appointment["appointment_time"],
            "status": "ACTIVE",
            "created_at": datetime.utcnow()
        }

        result = db.opd_passes.insert_one(opd_pass_data)

        opd_pass = db.opd_passes.find_one(
            {"_id": result.inserted_id}
        )

    # 5. Check whether patient is already in queue
    queue_entry = db.queue.find_one(
        {"appointment_id": ObjectId(appointment_id)}
    )

    # 6. Add patient to queue if not already present
    if not queue_entry:

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

        queue_data = {
            "appointment_id": appointment["_id"],
            "opd_pass_id": opd_pass["_id"],
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "token_number": token_number,
            "status": "WAITING",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        queue_result = db.queue.insert_one(queue_data)

        queue_entry = db.queue.find_one(
            {"_id": queue_result.inserted_id}
        )

    # 7. Calculate patients ahead
    patients_ahead = db.queue.count_documents(
        {
            "hospital_id": queue_entry["hospital_id"],
            "doctor_id": queue_entry["doctor_id"],
            "status": {
                "$in": [
                    "WAITING",
                    "CALLED",
                    "IN_CONSULTATION"
                ]
            },
            "token_number": {
                "$lt": queue_entry["token_number"]
            }
        }
    )

    # 8. Return complete SmartFlow result
    return {
        "message": "SmartFlow completed successfully",

        "appointment": {
            "appointment_id": str(appointment["_id"]),
            "date": appointment["appointment_date"],
            "time": appointment["appointment_time"],
            "approval_status": appointment["approval_status"]
        },

        "opd_pass": {
            "opd_pass_id": str(opd_pass["_id"]),
            "pass_number": opd_pass["pass_number"],
            "status": opd_pass["status"]
        },

        "queue": {
            "queue_id": str(queue_entry["_id"]),
            "token_number": queue_entry["token_number"],
            "status": queue_entry["status"],
            "patients_ahead": patients_ahead,
            "queue_position": patients_ahead + 1
        }
    }