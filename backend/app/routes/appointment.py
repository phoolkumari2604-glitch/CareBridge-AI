from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, UTC

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_staff_or_admin,
)
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
)


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)


# ============================================================
# CREATE APPOINTMENT
# PATIENT -> OWN PATIENT RECORD ONLY
# STAFF/ADMIN -> ANY PATIENT
# ============================================================

@router.post("/")
def create_appointment(
    appointment: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # --------------------------------------------------------
    # Validate patient ID
    # --------------------------------------------------------

    if not ObjectId.is_valid(appointment.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID"
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(appointment.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # --------------------------------------------------------
    # Patient ownership protection
    # --------------------------------------------------------

    if current_user.get("role") == "PATIENT":

        current_user_id = str(
            current_user["_id"]
        )

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email")
            == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only create appointments for your own patient record"
            )

    # --------------------------------------------------------
    # Validate hospital
    # --------------------------------------------------------

    if not ObjectId.is_valid(
        appointment.hospital_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    hospital = db.hospitals.find_one(
        {
            "_id": ObjectId(
                appointment.hospital_id
            )
        }
    )

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    # --------------------------------------------------------
    # Validate doctor
    # --------------------------------------------------------

    if not ObjectId.is_valid(
        appointment.doctor_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    doctor = db.doctors.find_one(
        {
            "_id": ObjectId(
                appointment.doctor_id
            )
        }
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    # --------------------------------------------------------
    # Doctor must belong to selected hospital
    # --------------------------------------------------------

    if doctor.get("hospital_id") != ObjectId(
        appointment.hospital_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Doctor does not belong to the selected hospital"
        )

    # --------------------------------------------------------
    # Doctor status
    # --------------------------------------------------------

    if doctor.get(
        "status",
        "AVAILABLE"
    ) != "AVAILABLE":

        raise HTTPException(
            status_code=400,
            detail="Doctor is currently unavailable"
        )

    # --------------------------------------------------------
    # Appointment slot validation
    # --------------------------------------------------------

    available_slots = doctor.get(
        "available_slots",
        []
    )

    if (
        appointment.appointment_time
        not in available_slots
    ):
        raise HTTPException(
            status_code=400,
            detail="Selected appointment time is not available"
        )

    # --------------------------------------------------------
    # Prevent duplicate appointment
    # --------------------------------------------------------

    existing_appointment = db.appointments.find_one(
        {
            "doctor_id": ObjectId(
                appointment.doctor_id
            ),
            "appointment_date":
                appointment.appointment_date,
            "appointment_time":
                appointment.appointment_time,
            "status": {
                "$in": [
                    "PENDING",
                    "APPROVED"
                ]
            }
        }
    )

    if existing_appointment:
        raise HTTPException(
            status_code=409,
            detail="This appointment slot is already booked"
        )

    # --------------------------------------------------------
    # Prepare appointment
    # --------------------------------------------------------

    data = {
        "patient_id": ObjectId(
            appointment.patient_id
        ),
        "hospital_id": ObjectId(
            appointment.hospital_id
        ),
        "doctor_id": ObjectId(
            appointment.doctor_id
        ),
        "appointment_date":
            appointment.appointment_date,
        "appointment_time":
            appointment.appointment_time,
        "reason":
            appointment.reason,
        "status":
            "PENDING",
        "approval_status":
            "PENDING",
        "created_at":
           datetime.now(UTC),
        "updated_at":
           datetime.now(UTC)
    }

    result = db.appointments.insert_one(
        data
    )

    return {
        "message":
            "Appointment created successfully",
        "appointment_id":
            str(result.inserted_id),
        "status":
            "PENDING",
        "approval_status":
            "PENDING"
    }


# ============================================================
# GET ALL APPOINTMENTS
# STAFF + ADMIN ONLY
# ============================================================

@router.get("/")
def get_appointments(
    current_user: dict = Depends(
        require_staff_or_admin
    ),
):
    db = get_database()

    appointments = list(
        db.appointments.find()
    )

    for appointment in appointments:

        appointment["_id"] = str(
            appointment["_id"]
        )

        appointment["patient_id"] = str(
            appointment["patient_id"]
        )

        appointment["hospital_id"] = str(
            appointment["hospital_id"]
        )

        appointment["doctor_id"] = str(
            appointment["doctor_id"]
        )

    return appointments


# ============================================================
# GET APPOINTMENT BY ID
# PATIENT -> OWN APPOINTMENT
# STAFF/ADMIN -> ANY APPOINTMENT
# ============================================================

@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    db = get_database()

    if not ObjectId.is_valid(
        appointment_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment ID"
        )

    appointment = db.appointments.find_one(
        {
            "_id": ObjectId(
                appointment_id
            )
        }
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    # --------------------------------------------------------
    # Patient ownership protection
    # --------------------------------------------------------

    if current_user.get("role") == "PATIENT":

        patient_id = str(
            appointment["patient_id"]
        )

        current_user_id = str(
            current_user["_id"]
        )

        patient = db.patients.find_one(
            {
                "_id": ObjectId(
                    patient_id
                )
            }
        )

        owns_record = (
            patient
            and (
                patient.get("user_id")
                == current_user_id
                or patient.get("email")
                == current_user.get("email")
            )
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own appointment"
            )

    appointment["_id"] = str(
        appointment["_id"]
    )

    appointment["patient_id"] = str(
        appointment["patient_id"]
    )

    appointment["hospital_id"] = str(
        appointment["hospital_id"]
    )

    appointment["doctor_id"] = str(
        appointment["doctor_id"]
    )

    return appointment


# ============================================================
# UPDATE APPOINTMENT
# PATIENT -> OWN APPOINTMENT
# STAFF/ADMIN -> ANY APPOINTMENT
# ============================================================

@router.put("/{appointment_id}")
def update_appointment(
    appointment_id: str,
    appointment: AppointmentUpdate,
    current_user: dict = Depends(
        get_current_user
    ),
):
    db = get_database()

    if not ObjectId.is_valid(
        appointment_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment ID"
        )

    existing_appointment = db.appointments.find_one(
        {
            "_id": ObjectId(
                appointment_id
            )
        }
    )

    if not existing_appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    # --------------------------------------------------------
    # Patient ownership protection
    # --------------------------------------------------------

    if current_user.get("role") == "PATIENT":

        patient_id = str(
            existing_appointment["patient_id"]
        )

        current_user_id = str(
            current_user["_id"]
        )

        patient = db.patients.find_one(
            {
                "_id": ObjectId(
                    patient_id
                )
            }
        )

        owns_record = (
            patient
            and (
                patient.get("user_id")
                == current_user_id
                or patient.get("email")
                == current_user.get("email")
            )
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own appointment"
            )

    # --------------------------------------------------------
    # Prepare update data
    # --------------------------------------------------------

    data = {
        key: value
        for key, value in appointment.model_dump().items()
        if value is not None
    }

    # --------------------------------------------------------
    # Patients cannot manually modify workflow status
    # --------------------------------------------------------

    if current_user.get("role") == "PATIENT":

        data.pop("status", None)
        data.pop("approval_status", None)

    data["updated_at"] =datetime.now(UTC)

    result = db.appointments.update_one(
        {
            "_id": ObjectId(
                appointment_id
            )
        },
        {
            "$set": data
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return {
        "message":
            "Appointment updated successfully"
    }


# ============================================================
# DELETE APPOINTMENT
# PATIENT -> OWN APPOINTMENT
# STAFF/ADMIN -> ANY APPOINTMENT
# ============================================================

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    current_user: dict = Depends(
        get_current_user
    ),
):
    db = get_database()

    if not ObjectId.is_valid(
        appointment_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment ID"
        )

    existing_appointment = db.appointments.find_one(
        {
            "_id": ObjectId(
                appointment_id
            )
        }
    )

    if not existing_appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    # --------------------------------------------------------
    # Patient ownership protection
    # --------------------------------------------------------

    if current_user.get("role") == "PATIENT":

        patient_id = str(
            existing_appointment["patient_id"]
        )

        current_user_id = str(
            current_user["_id"]
        )

        patient = db.patients.find_one(
            {
                "_id": ObjectId(
                    patient_id
                )
            }
        )

        owns_record = (
            patient
            and (
                patient.get("user_id")
                == current_user_id
                or patient.get("email")
                == current_user.get("email")
            )
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own appointment"
            )

    result = db.appointments.delete_one(
        {
            "_id": ObjectId(
                appointment_id
            )
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return {
        "message":
            "Appointment deleted successfully"
    }

