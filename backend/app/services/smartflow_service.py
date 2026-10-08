from bson import ObjectId
from datetime import datetime, timezone
import uuid

def run_smartflow(db, appointment_id: str):
    if not ObjectId.is_valid(appointment_id):
        raise ValueError("Invalid appointment ID")

    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        raise ValueError("Appointment not found")

    if appointment.get("approval_status") != "APPROVED":
        raise ValueError("Appointment is not approved")

    opd_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    if not opd_pass:
        pass_number = f"OPD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        opd_pass_data = {
            "appointment_id": appointment["_id"],
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "pass_number": pass_number,
            "appointment_date": appointment["appointment_date"],
            "appointment_time": appointment["appointment_time"],
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        result = db.opd_passes.insert_one(opd_pass_data)
        opd_pass = db.opd_passes.find_one({"_id": result.inserted_id})

    queue_entry = db.queue.find_one({"appointment_id": ObjectId(appointment_id)})
    if not queue_entry:
        last_queue = db.queue.find_one(
            {
                "hospital_id": appointment["hospital_id"],
                "doctor_id": appointment["doctor_id"],
                "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}
            },
            sort=[("token_number", -1)]
        )
        token_number = (last_queue["token_number"] + 1) if last_queue else 1
        queue_data = {
            "appointment_id": appointment["_id"],
            "opd_pass_id": opd_pass["_id"],
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment["hospital_id"],
            "doctor_id": appointment["doctor_id"],
            "token_number": token_number,
            "status": "WAITING",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        queue_result = db.queue.insert_one(queue_data)
        queue_entry = db.queue.find_one({"_id": queue_result.inserted_id})

    patients_ahead = db.queue.count_documents({
        "hospital_id": queue_entry["hospital_id"],
        "doctor_id": queue_entry["doctor_id"],
        "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]},
        "token_number": {"$lt": queue_entry["token_number"]}
    })

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