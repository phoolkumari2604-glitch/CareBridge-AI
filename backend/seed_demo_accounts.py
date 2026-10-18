import os
import sys
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app import create_app
from app.core.database import get_database
from app.utils.security import hash_password
from app.models.user import create_user_document


def seed_demo_accounts():
    env = os.getenv("FLASK_ENV", "development").strip().lower()
    allow_seed = os.getenv("ALLOW_DEV_SEED", "false").strip().lower() == "true"
    if env == "production" and not allow_seed:
        print(
            "[ERROR] Refusing to run seed_demo_accounts.py because FLASK_ENV=production. "
            "Set FLASK_ENV=development (or ALLOW_DEV_SEED=true) to seed demo accounts."
        )
        sys.exit(1)

    app = create_app()
    with app.app_context():
        print("Connecting to MongoDB...")
        db = get_database()

        # Clear any lingering IP rate limits in dev
        db.login_rate_limits.delete_many({})

        now = datetime.now(timezone.utc)

        # 1. DEMO PATIENT
        patient_email = os.getenv("DEMO_PATIENT_EMAIL", "patient@carebridge.ai").strip().lower()
        patient_password = os.getenv("DEMO_PATIENT_PASSWORD", "CareBridge#Pt2026!Secure")
        patient_name = "Priya Sharma"
        patient_phone = "+91 9876543210"

        print(f"Seeding patient: {patient_email}")
        db.users.delete_many({"email": patient_email})

        patient_user = create_user_document(
            name=patient_name,
            email=patient_email,
            password_hash=hash_password(patient_password),
            role="PATIENT",
            phone=patient_phone,
            status="active",
            email_verified=True,
        )
        patient_user["patient_code"] = "394762"
        patient_user["patientId"] = "394762"
        user_res = db.users.insert_one(patient_user)
        patient_user_id = str(user_res.inserted_id)

        # Patient record in patients collection (reuse existing _id if present so appointments/passes stay linked)
        existing_pat = (
            db.patients.find_one({"email": patient_email})
            or db.patients.find_one({"name": patient_name})
            or db.patients.find_one({"patient_code": "394762"})
        )
        pat_code = (existing_pat.get("patient_code") if existing_pat else None) or "394762"
        # Ensure no other record conflicts with pat_code
        if existing_pat:
            db.patients.delete_many({"patient_code": pat_code, "_id": {"$ne": existing_pat["_id"]}})
        patient_doc = {
            "name": patient_name,
            "email": patient_email,
            "phone": patient_phone,
            "patient_code": pat_code,
            "patientId": pat_code,
            "patient_id_code": f"PT-{pat_code}",
            "age": 34,
            "gender": "Female",
            "blood_group": "O+",
            "condition": "Type 2 Diabetes & Hypertension",
            "allergies": ["Sulfonamides", "Penicillin"],
            "medical_history": ["Type 2 Diabetes (diagnosed 2021)", "Essential Hypertension"],
            "user_id": patient_user_id,
            "updated_at": now,
        }
        if existing_pat:
            pat_oid = existing_pat["_id"]
            db.patients.update_one({"_id": pat_oid}, {"$set": patient_doc})
            patient_id = str(pat_oid)
        else:
            patient_doc["created_at"] = now
            pat_res = db.patients.insert_one(patient_doc)
            pat_oid = pat_res.inserted_id
            patient_id = str(pat_oid)

        # Health Profile
        db.health_profiles.delete_many({"patient_id": {"$in": [patient_id, pat_oid]}})
        db.health_profiles.insert_one({
            "patient_id": patient_id,
            "blood_type": "O+",
            "allergies": ["Sulfonamides", "Penicillin"],
            "chronic_conditions": ["Type 2 Diabetes", "Hypertension"],
            "medications": ["Metformin 500mg BID", "Amlodipine 5mg OD"],
            "emergency_contact": "+91 98765 00000 (Spouse)",
            "created_at": now,
            "updated_at": now,
        })

        # Latest Vitals in vital_signs collection (ensure at least one clean reading exists)
        if db.vital_signs.count_documents({"patient_id": {"$in": [patient_id, pat_oid]}}) == 0:
            db.vital_signs.insert_one({
                "patient_id": pat_oid,
                "patient_id_str": patient_id,
                "heart_rate": 76,
                "systolic_bp": 122,
                "diastolic_bp": 80,
                "blood_pressure": "122/80",
                "spo2": 98,
                "oxygen_saturation": 98,
                "temperature": 36.8,
                "blood_sugar": 104,
                "recorded_at": now,
                "timestamp": now,
                "created_at": now,
            })

        # Health Records
        if db.health_records.count_documents({"patient_id": {"$in": [patient_id, pat_oid]}}) == 0:
            db.health_records.insert_many([
                {
                    "patient_id": patient_id,
                    "diagnosis": "Routine Annual Health Checkup",
                    "doctor": "Dr. Ananya Sharma",
                    "doctor_name": "Ananya Sharma",
                    "record_type": "Checkup",
                    "treatment": "Maintain balanced diet, regular exercise, continue prescribed medications.",
                    "notes": "Patient is in overall stable condition with normal respiratory sounds.",
                    "created_at": now,
                },
                {
                    "patient_id": patient_id,
                    "diagnosis": "Glycemic & Blood Pressure Review",
                    "doctor": "Dr. Rajeshwari Iyer",
                    "doctor_name": "Rajeshwari Iyer",
                    "record_type": "Consultation",
                    "treatment": "Continue Metformin 500mg and Amlodipine 5mg.",
                    "notes": "HbA1c improved; blood pressure well controlled.",
                    "created_at": now,
                }
            ])

        # Notifications
        if db.notifications.count_documents({"patient_id": {"$in": [patient_id, pat_oid]}}) == 0:
            db.notifications.insert_many([
                {
                    "patient_id": patient_id,
                    "title": "Welcome to CareBridge AI",
                    "message": "Your patient account is active and connected to continuous health monitoring.",
                    "notification_type": "SYSTEM",
                    "is_read": False,
                    "created_at": now,
                },
                {
                    "patient_id": patient_id,
                    "title": "Vitals Synced Successfully",
                    "message": "Your latest vitals have been recorded and evaluated by CareBridge AI.",
                    "notification_type": "HEALTH",
                    "is_read": True,
                    "created_at": now,
                }
            ])

        # 2. DEMO DOCTOR
        doctor_email = os.getenv("DEMO_DOCTOR_EMAIL", "doctor@carebridge.ai").strip().lower()
        doctor_password = os.getenv("DEMO_DOCTOR_PASSWORD", "CareBridge#Doc2026!Secure")
        doctor_name = "Dr. Ananya Sharma"
        doctor_phone = "+91 9876543211"
        print(f"Seeding demo doctor: {doctor_email}")
        db.users.delete_many({"email": doctor_email})
        doc_user = create_user_document(
            name=doctor_name,
            email=doctor_email,
            password_hash=hash_password(doctor_password),
            role="DOCTOR",
            phone=doctor_phone,
            status="active",
            email_verified=True,
        )
        doc_user["staff_id"] = "200101"
        doc_user["staffId"] = "200101"
        doc_user_res = db.users.insert_one(doc_user)
        doctor_user_id = str(doc_user_res.inserted_id)

        existing_doc = db.doctors.find_one(
            {"$or": [{"email": doctor_email}, {"name": {"$regex": "Ananya Sharma", "$options": "i"}}]}
        )
        if existing_doc:
            db.doctors.update_one(
                {"_id": existing_doc["_id"]},
                {"$set": {"user_id": doctor_user_id, "email": doctor_email, "phone": doctor_phone}}
            )
            doctor_id = str(existing_doc["_id"])
        else:
            ins_doc = db.doctors.insert_one({
                "user_id": doctor_user_id,
                "name": doctor_name,
                "email": doctor_email,
                "phone": doctor_phone,
                "specialization": "Cardiology & Internal Medicine",
                "department": "Cardiology",
                "hospital_name": "Apollo Jubilee Hills",
                "available": True,
                "rating": 4.9,
                "created_at": now,
            })
            doctor_id = str(ins_doc.inserted_id)

        # 3. DEMO STAFF
        staff_email = os.getenv("DEMO_STAFF_EMAIL", "staff@carebridge.ai").strip().lower()
        staff_password = os.getenv("DEMO_STAFF_PASSWORD", "CareBridge#Staff2026!Admin")
        print(f"Seeding demo staff: {staff_email}")
        db.users.delete_many({"email": staff_email})
        staff_user = create_user_document(
            name="Staff Admin",
            email=staff_email,
            password_hash=hash_password(staff_password),
            role="STAFF",
            phone="+91 9876543212",
            status="active",
            email_verified=True,
        )
        staff_user["staff_id"] = "300101"
        staff_user["staffId"] = "300101"
        db.users.insert_one(staff_user)

        print("\n[OK] Successfully seeded demo accounts (development mode):")
        print(f"  Patient: {patient_email} (role=PATIENT, patient_id={patient_id})")
        print(f"  Doctor:  {doctor_email} (role=DOCTOR, doctor_id={doctor_id})")
        print(f"  Staff:   {staff_email} (role=STAFF)")


if __name__ == "__main__":
    seed_demo_accounts()

