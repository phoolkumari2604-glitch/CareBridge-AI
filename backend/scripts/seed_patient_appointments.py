import sys
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app import create_app
from app.core.database import get_database

app = create_app()

with app.app_context():
    db = get_database()
    
    # Find demo patient and doctors
    demo_patient = db.patients.find_one({"email": "patient@carebridge.ai"})
    if not demo_patient:
        print("Demo patient not found!")
        sys.exit(1)
        
    pid = demo_patient["_id"]
    pname = demo_patient.get("name", "Priya Sharma")
    pphone = demo_patient.get("phone", "+91 9876543210")
    pemail = demo_patient.get("email", "patient@carebridge.ai")
    
    doctors = list(db.doctors.find().limit(5))
    if not doctors:
        print("No doctors found!")
        sys.exit(1)
        
    doc1 = doctors[0]
    doc2 = doctors[1] if len(doctors) > 1 else doc1
    doc3 = doctors[2] if len(doctors) > 2 else doc1

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    in_3_days = (now + timedelta(days=3)).strftime("%Y-%m-%d")
    in_8_days = (now + timedelta(days=8)).strftime("%Y-%m-%d")
    last_week = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    last_month = (now - timedelta(days=20)).strftime("%Y-%m-%d")

    # Clean existing test appointments for this patient to prevent duplicate bloat
    db.appointments.delete_many({"patient_id": pid})

    sample_appts = [
        # 1. Today's confirmed appointment (with queue token)
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc1["_id"],
            "doctor_name": doc1.get("name", "Dr. Rajesh Sharma"),
            "specialty": doc1.get("specialty", "Cardiology"),
            "hospital_id": doc1.get("hospital_id"),
            "hospital_name": doc1.get("hospital_name", "CareBridge Super Specialty Hospital"),
            "hospital_address": "CareBridge Medical Enclave, Road No. 36, Jubilee Hills, Hyderabad",
            "hospital_phone": "+91 40 2345 6789",
            "appointment_date": today_str,
            "appointment_time": "04:30 PM",
            "fee": 900,
            "reason": "Cardiovascular followup and routine ECG review",
            "notes": "Patient reports occasional palpitations during exertion. Baseline vitals reviewed.",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "booking_id": "APT-CB101",
            "queue_token": "Q-12",
            "has_opd_pass": True,
            "created_at": now - timedelta(days=2),
            "updated_at": now
        },
        # 2. Tomorrow's confirmed appointment
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc2["_id"],
            "doctor_name": doc2.get("name", "Dr. Priya Patel"),
            "specialty": doc2.get("specialty", "Pulmonology"),
            "hospital_id": doc2.get("hospital_id"),
            "hospital_name": doc2.get("hospital_name", "CareBridge Apollo City Center"),
            "hospital_address": "Apollo Health City Campus, Film Nagar, Hyderabad",
            "hospital_phone": "+91 40 2360 7777",
            "appointment_date": tomorrow_str,
            "appointment_time": "10:30 AM",
            "fee": 750,
            "reason": "Mild respiratory wheezing assessment and spirometry evaluation",
            "notes": "Recommend bringing recent inhaler prescription and peak flow readings.",
            "status": "CONFIRMED",
            "approval_status": "APPROVED",
            "booking_id": "APT-CB102",
            "queue_token": "Q-05",
            "has_opd_pass": True,
            "created_at": now - timedelta(days=1),
            "updated_at": now
        },
        # 3. Later this week: Pending Clearance
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc3["_id"],
            "doctor_name": doc3.get("name", "Dr. Vikram Seth"),
            "specialty": doc3.get("specialty", "Neurology"),
            "hospital_id": doc3.get("hospital_id"),
            "hospital_name": doc3.get("hospital_name", "CareBridge Neuro Institute"),
            "hospital_address": "8-2-293/82, Gachibowli Main Rd, Hyderabad",
            "hospital_phone": "+91 40 4455 6677",
            "appointment_date": in_3_days,
            "appointment_time": "02:00 PM",
            "fee": 1200,
            "reason": "Migraine consultation and sleep study results check",
            "notes": "Awaiting final confirmation from neuro department scheduling desk.",
            "status": "PENDING",
            "approval_status": "PENDING",
            "booking_id": "APT-CB103",
            "created_at": now,
            "updated_at": now
        },
        # 4. Next week: Pending Clearance
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc1["_id"],
            "doctor_name": doc1.get("name", "Dr. Rajesh Sharma"),
            "specialty": doc1.get("specialty", "Cardiology"),
            "hospital_id": doc1.get("hospital_id"),
            "hospital_name": doc1.get("hospital_name", "CareBridge Super Specialty Hospital"),
            "hospital_address": "CareBridge Medical Enclave, Road No. 36, Jubilee Hills, Hyderabad",
            "hospital_phone": "+91 40 2345 6789",
            "appointment_date": in_8_days,
            "appointment_time": "11:00 AM",
            "fee": 900,
            "reason": "Holter monitor attachment & exercise stress test check",
            "status": "PENDING",
            "approval_status": "PENDING",
            "booking_id": "APT-CB104",
            "created_at": now,
            "updated_at": now
        },
        # 5. Completed appointment (last week)
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc2["_id"],
            "doctor_name": doc2.get("name", "Dr. Priya Patel"),
            "specialty": doc2.get("specialty", "Pulmonology"),
            "hospital_id": doc2.get("hospital_id"),
            "hospital_name": doc2.get("hospital_name", "CareBridge Apollo City Center"),
            "hospital_address": "Apollo Health City Campus, Film Nagar, Hyderabad",
            "hospital_phone": "+91 40 2360 7777",
            "appointment_date": last_week,
            "appointment_time": "09:00 AM",
            "fee": 750,
            "reason": "Allergy panel and respiratory intake",
            "notes": "Blood work clear. Advised cetirizine 10mg PRN. Followup in 1 month.",
            "status": "COMPLETED",
            "approval_status": "APPROVED",
            "booking_id": "APT-CB105",
            "rating": 5,
            "patient_feedback": "Dr. Priya was very attentive and the clinic had zero waiting time.",
            "created_at": now - timedelta(days=10),
            "updated_at": now - timedelta(days=7)
        },
        # 6. Cancelled appointment (last month)
        {
            "patient_id": pid,
            "patient_name": pname,
            "patient_email": pemail,
            "patient_phone": pphone,
            "doctor_id": doc3["_id"],
            "doctor_name": doc3.get("name", "Dr. Vikram Seth"),
            "specialty": doc3.get("specialty", "Neurology"),
            "hospital_id": doc3.get("hospital_id"),
            "hospital_name": doc3.get("hospital_name", "CareBridge Neuro Institute"),
            "hospital_address": "8-2-293/82, Gachibowli Main Rd, Hyderabad",
            "hospital_phone": "+91 40 4455 6677",
            "appointment_date": last_month,
            "appointment_time": "03:30 PM",
            "fee": 1200,
            "reason": "Routine headache screening",
            "cancel_reason": "Change of personal schedule",
            "status": "CANCELLED",
            "approval_status": "CANCELLED",
            "booking_id": "APT-CB106",
            "created_at": now - timedelta(days=25),
            "updated_at": now - timedelta(days=22)
        }
    ]

    res = db.appointments.insert_many(sample_appts)
    print(f"Successfully inserted {len(res.inserted_ids)} appointments for Demo Patient ({pemail})!")
