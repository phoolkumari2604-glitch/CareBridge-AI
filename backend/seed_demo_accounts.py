import sys
from datetime import datetime, UTC
from bson import ObjectId

from app.core.database import connect_to_mongodb, get_database
from app.core.security import hash_password
from app.models.user import create_user_document

def seed_demo_accounts():
    print("Connecting to MongoDB...")
    connect_to_mongodb()
    db = get_database()

    # 1. DEMO PATIENT
    patient_email = "patient@carebridge.ai"
    patient_password = "Patient@123"
    patient_name = "Demo Patient"
    patient_phone = "+91 9876543210"

    print(f"Seeding demo patient: {patient_email}")
    db.users.delete_many({"email": patient_email})
    
    patient_user = create_user_document(
        name=patient_name,
        email=patient_email,
        password_hash=hash_password(patient_password),
        role="PATIENT",
        phone=patient_phone,
    )
    user_res = db.users.insert_one(patient_user)
    patient_user_id = str(user_res.inserted_id)

    # Patient record in patients collection
    db.patients.delete_many({"email": patient_email})
    patient_doc = {
        "name": patient_name,
        "email": patient_email,
        "phone": patient_phone,
        "age": 32,
        "gender": "Female",
        "blood_group": "O+",
        "user_id": patient_user_id,
        "created_at": datetime.now(UTC),
    }
    pat_res = db.patients.insert_one(patient_doc)
    patient_id = str(pat_res.inserted_id)

    # Health Profile
    db.health_profiles.delete_many({"patient_id": patient_id})
    db.health_profiles.insert_one({
        "patient_id": patient_id,
        "blood_type": "O+",
        "allergies": ["Penicillin", "Peanuts"],
        "chronic_conditions": ["Mild Asthma"],
        "medications": ["Salbutamol Inhaler as needed"],
        "emergency_contact": "+91 98765 00000 (Spouse)",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    })

    # Latest Vitals in vital_signs collection
    db.vital_signs.delete_many({"patient_id": patient_id})
    db.vital_signs.insert_one({
        "patient_id": patient_id,
        "heart_rate": 74,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 98,
        "temperature": 36.8,
        "blood_sugar": 95,
        "recorded_at": datetime.now(UTC),
        "created_at": datetime.now(UTC),
    })

    # Health Records
    db.health_records.delete_many({"patient_id": patient_id})
    db.health_records.insert_many([
        {
            "patient_id": patient_id,
            "diagnosis": "Routine Annual Health Checkup",
            "doctor": "Dr. Ananya Sharma",
            "doctor_name": "Ananya Sharma",
            "record_type": "Checkup",
            "treatment": "Maintain balanced diet, regular exercise, continue asthma inhaler as needed.",
            "notes": "Patient is in overall healthy state with normal respiratory sounds.",
            "created_at": datetime.now(UTC),
        },
        {
            "patient_id": patient_id,
            "diagnosis": "Allergy Assessment",
            "doctor": "Dr. Priya Reddy",
            "doctor_name": "Priya Reddy",
            "record_type": "Consultation",
            "treatment": "Avoid known allergens, keep antihistamine on hand.",
            "notes": "Skin prick test confirmed mild response to peanuts.",
            "created_at": datetime.now(UTC),
        }
    ])

    # Notifications
    db.notifications.delete_many({"patient_id": patient_id})
    db.notifications.insert_many([
        {
            "patient_id": patient_id,
            "title": "Welcome to CareBridge AI",
            "message": "Your patient account is active and connected to continuous health monitoring.",
            "notification_type": "SYSTEM",
            "is_read": False,
            "created_at": datetime.now(UTC),
        },
        {
            "patient_id": patient_id,
            "title": "Upcoming Consultation Reminder",
            "message": "You have an upcoming consultation with Dr. Ananya Sharma on Oct 04, 2026 at 10:30 AM.",
            "notification_type": "APPOINTMENT",
            "is_read": False,
            "created_at": datetime.now(UTC),
        },
        {
            "patient_id": patient_id,
            "title": "Vitals Synced Successfully",
            "message": "Your latest vitals have been recorded and evaluated as normal.",
            "notification_type": "HEALTH",
            "is_read": True,
            "created_at": datetime.now(UTC),
        }
    ])

    # 2. DEMO DOCTOR
    doctor_email = "doctor@carebridge.ai"
    doctor_password = "Doctor@123"
    print(f"Seeding demo doctor: {doctor_email}")
    db.users.delete_many({"email": doctor_email})
    db.users.insert_one(create_user_document(
        name="Dr. Ananya Sharma",
        email=doctor_email,
        password_hash=hash_password(doctor_password),
        role="DOCTOR",
        phone="+91 9876543211",
    ))

    # 3. DEMO STAFF / ADMIN
    staff_email = "staff@carebridge.ai"
    staff_password = "Staff@123"
    print(f"Seeding demo staff: {staff_email}")
    db.users.delete_many({"email": staff_email})
    db.users.insert_one(create_user_document(
        name="Staff Admin",
        email=staff_email,
        password_hash=hash_password(staff_password),
        role="STAFF",
        phone="+91 9876543212",
    ))

    print("\n[OK] Successfully seeded demo accounts!")
    print(f"  Patient: {patient_email} / {patient_password} (Patient ID: {patient_id})")
    print(f"  Doctor:  {doctor_email} / {doctor_password}")
    print(f"  Staff:   {staff_email} / {staff_password}")

if __name__ == "__main__":
    seed_demo_accounts()
