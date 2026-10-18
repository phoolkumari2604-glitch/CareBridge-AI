"""
Backfill OPD Passes into MongoDB for existing appointments.
Ensures every appointment has a valid OPD Pass in db.opd_passes
with token, 6-digit OTP, patient_numeric_id (6 digits), doctor, hospital,
appointment date/time, queue number, status, and expiry.
"""

import sys
import os
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.core.database import get_database

app = create_app()

with app.app_context():
    db = get_database()
    now = datetime.now(timezone.utc)
    
    # Ensure patient has 6-digit patient_numeric_id
    demo_patient = db.patients.find_one({"email": "patient@carebridge.ai"})
    if demo_patient:
        pat_num_id = demo_patient.get("patient_numeric_id")
        if not pat_num_id or len(str(pat_num_id)) != 6:
            db.patients.update_one(
                {"_id": demo_patient["_id"]},
                {"$set": {"patient_numeric_id": "104829"}}
            )
            print("Updated demo patient numeric ID to '104829'")

    # Query all appointments for demo patient or all appointments
    appointments = list(db.appointments.find().sort("created_at", -1))
    print(f"Total appointments found in database: {len(appointments)}")

    backfilled_count = 0
    updated_count = 0

    for apt in appointments:
        apt_id = apt["_id"]
        apt_id_str = str(apt_id)
        apt_suffix = apt_id_str[-6:].upper()
        apt_date = apt.get("appointment_date") or "20261017"
        date_clean = apt_date.replace("-", "")
        
        # Standard OPD Pass number convention: OPD-YYYYMMDD-XXXXXX
        expected_pass_number = f"OPD-{date_clean}-{apt_suffix}"
        
        # Resolve patient
        patient = db.patients.find_one({"_id": apt.get("patient_id")}) if apt.get("patient_id") else None
        p_name = apt.get("patient_name") or (patient.get("name") if patient else "Verified Patient")
        p_num_id = (
            str(patient.get("patient_numeric_id"))
            if patient and patient.get("patient_numeric_id") and len(str(patient.get("patient_numeric_id"))) == 6
            else "104829"
        )
        
        # Resolve doctor
        doctor = db.doctors.find_one({"_id": apt.get("doctor_id")}) if apt.get("doctor_id") else None
        d_name = apt.get("doctor_name") or (doctor.get("name") if doctor else "Clinical Specialist")
        specialty = apt.get("specialty") or (doctor.get("specialty") if doctor else "General Medicine")
        
        # Resolve hospital
        hospital = db.hospitals.find_one({"_id": apt.get("hospital_id")}) if apt.get("hospital_id") else None
        h_name = (
            apt.get("hospital_name")
            or (hospital.get("name") if hospital else None)
            or (doctor.get("hospital_name") if doctor else None)
            or "CareBridge Hospital"
        )
        h_address = (
            (hospital.get("address") if hospital else None)
            or (doctor.get("hospital_address") if doctor else None)
            or "CareBridge Health Enclave, Jubilee Hills, Hyderabad"
        )
        
        # Resolve status
        raw_status = (apt.get("status") or apt.get("approval_status") or "ACTIVE").upper()
        if raw_status in ["CANCELLED", "REJECTED"]:
            pass_status = "CANCELLED"
        elif raw_status in ["COMPLETED", "USED"]:
            pass_status = "USED"
        elif raw_status in ["EXPIRED"]:
            pass_status = "EXPIRED"
        else:
            # Active appointments get ACTIVE status
            pass_status = "ACTIVE"
            
        # Parse expiry date (end of appointment date or 30 days)
        try:
            exp_date = datetime.strptime(apt_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except Exception:
            exp_date = now + timedelta(days=30)

        # Generate 6-digit OTP
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        hashed_otp = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
        
        queue_token = apt.get("queue_token") or f"Q-{str(int(apt_suffix, 16) % 900 + 100)}"

        # Check if pass already exists for this appointment
        existing_pass = db.opd_passes.find_one({
            "$or": [
                {"appointment_id": apt_id},
                {"pass_number": expected_pass_number}
            ]
        })

        pass_payload = {
            "appointment_id": apt_id,
            "patient_id": apt.get("patient_id"),
            "patient_numeric_id": p_num_id,
            "patient_name": p_name,
            "doctor_id": apt.get("doctor_id"),
            "doctor_name": d_name,
            "department": specialty,
            "specialty": specialty,
            "hospital_id": apt.get("hospital_id") or (doctor.get("hospital_id") if doctor else None),
            "hospital_name": h_name,
            "hospital_address": h_address,
            "appointment_date": apt_date,
            "appointment_time": apt.get("appointment_time") or "10:00 AM",
            "reason": apt.get("reason", "Outpatient Consultation"),
            "pass_number": expected_pass_number,
            "token": expected_pass_number,
            "status": pass_status,
            "queue_number": queue_token,
            "otp": otp_code,
            "otp_hash": hashed_otp,
            "expiry": exp_date.isoformat(),
            "expires_at": exp_date,
            "checked_in": False,
            "updated_at": now
        }

        if existing_pass:
            # Ensure pass_number and token match expected_pass_number
            db.opd_passes.update_one(
                {"_id": existing_pass["_id"]},
                {"$set": pass_payload}
            )
            updated_count += 1
        else:
            pass_payload["created_at"] = now
            pass_payload["issued_at"] = now
            db.opd_passes.insert_one(pass_payload)
            backfilled_count += 1

        # Also store active OTP record in opd_pass_otps for seamless verify-otp testing
        db.opd_pass_otps.update_many(
            {"pass_number": expected_pass_number},
            {"$set": {"is_used": True}}
        )
        db.opd_pass_otps.insert_one({
            "pass_number": expected_pass_number,
            "hashed_otp": hashed_otp,
            "plain_otp": otp_code,
            "attempts": 0,
            "max_attempts": 5,
            "created_at": now,
            "expires_at": now + timedelta(days=30),  # extended for demo passes
            "masked_contact": "patient's registered contact",
            "is_used": False
        })

    print(f"OPD Passes Backfill Complete: {backfilled_count} created, {updated_count} updated.")
    
    # Verify the 5 active passes for demo patient
    if demo_patient:
        pat_passes = list(db.opd_passes.find({"patient_id": demo_patient["_id"]}))
        print(f"\nDemo Patient now has {len(pat_passes)} OPD passes in db.opd_passes:")
        for p in pat_passes:
            print(f" - {p.get('pass_number')} | Status: {p.get('status')} | Date: {p.get('appointment_date')} | OTP: {p.get('otp')} | Queue: {p.get('queue_number')}")
