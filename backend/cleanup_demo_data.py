import os
import sys
import secrets
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "carebridge_ai")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "phoolkumari2603@gmail.com").strip().lower()
ADMIN_NAME = os.getenv("ADMIN_NAME", "Phool Kumari")

def clean_database():
    print(f"Connecting to MongoDB at {MONGO_URI}, database '{DB_NAME}'...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # 1. Purge fake test hospitals
    print("\n[1/4] Cleaning test hospitals...")
    res_hosp = db.hospitals.delete_many({
        "$or": [
            {"name": {"$regex": r"Appointment Test Hospital|Approval Test Hospital|string", "$options": "i"}},
            {"phone": "9000000030"},
            {"phone": {"$exists": False}},
            {"name": {"$exists": False}}
        ]
    })
    print(f"  -> Removed {res_hosp.deleted_count} junk/test hospital documents.")

    # 2. Clean up junk patients/appointments
    print("\n[2/4] Cleaning test patients & appointments...")
    res_pat = db.patients.delete_many({
        "$or": [
            {"name": "string"},
            {"email": "string"}
        ]
    })
    print(f"  -> Removed {res_pat.deleted_count} junk patient documents.")
    
    res_app = db.appointments.delete_many({
        "$or": [
            {"patient_name": "string"},
            {"doctor_name": "string"}
        ]
    })
    print(f"  -> Removed {res_app.deleted_count} junk appointment documents.")

    # 3. Clean up legacy/demo accounts if requested
    print("\n[3/4] Checking demo users...")
    demo_emails = [
        "admin.demo@carebridge.ai",
        "doctor.demo@carebridge.ai",
        "staff.demo@carebridge.ai",
        "patient.demo@carebridge.ai",
        "test@carebridge.ai"
    ]
    res_demo = db.users.delete_many({"email": {"$in": demo_emails}})
    print(f"  -> Removed {res_demo.deleted_count} placeholder demo accounts.")

    # 4. Bootstrap / Ensure Admin
    print(f"\n[4/4] Verifying primary admin account ({ADMIN_EMAIL})...")
    from app.utils.security import hash_password
    
    admin = db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        initial_pw = "CareBridge@2026Admin!"
        pw_hash = hash_password(initial_pw)
        admin_doc = {
            "name": ADMIN_NAME,
            "email": ADMIN_EMAIL,
            "password_hash": pw_hash,
            "role": "ADMIN",
            "phone": "+91 9876543210",
            "staff_id": "100001",
            "staffId": "100001",
            "status": "active",
            "email_verified": True,
            "is_primary_admin": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        db.users.insert_one(admin_doc)
        print(f"  -> Created primary admin: {ADMIN_EMAIL}")
        print(f"  -> Temporary Password: {initial_pw}")
    else:
        db.users.update_one(
            {"_id": admin["_id"]},
            {"$set": {
                "name": ADMIN_NAME,
                "role": "ADMIN",
                "status": "active",
                "email_verified": True,
                "is_primary_admin": True,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        print(f"  -> Primary admin {ADMIN_EMAIL} is active with role ADMIN.")

    # Summary
    print("\n================ DATABASE AUDIT SUMMARY ================")
    print(f"  Total Users:        {db.users.count_documents({})}")
    print(f"  Admins:             {db.users.count_documents({'role': 'ADMIN'})}")
    print(f"  Doctors:            {db.users.count_documents({'role': 'DOCTOR'})}")
    print(f"  Staff:              {db.users.count_documents({'role': 'STAFF'})}")
    print(f"  Patients:           {db.users.count_documents({'role': 'PATIENT'})}")
    print(f"  Hospitals:          {db.hospitals.count_documents({})}")
    print(f"  Appointments:       {db.appointments.count_documents({})}")
    print("========================================================\n")

if __name__ == "__main__":
    clean_database()
