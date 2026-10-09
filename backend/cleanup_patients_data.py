import os
import sys
import re
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.core.database import get_database

def cleanup_and_seed_patients():
    app = create_app()
    with app.app_context():
        db = get_database()
        print("Starting Patient Data Cleanup...")

        # 1. Identify and delete placeholder records with literal 'string' or empty/broken data
        placeholder_filter = {
            "$or": [
                {"name": "string"},
                {"name": {"$regex": r"^string$", "$options": "i"}},
                {"phone": "string"},
                {"phone": {"$regex": r"^string$", "$options": "i"}},
                {"gender": "string"},
                {"gender": {"$regex": r"^string$", "$options": "i"}},
                {"blood_group": "string"},
                {"blood_group": {"$regex": r"^string$", "$options": "i"}},
                {"name": {"$regex": r"^flask_test_patient", "$options": "i"}},
                {"name": {"$regex": r"^Test Patient [0-9A-F]{8}", "$options": "i"}},
                {"name": {"$regex": r"^Feature Patient [0-9A-F]{8}", "$options": "i"}},
                {"name": {"$regex": r"^OPD Patient [0-9A-F]{8}", "$options": "i"}},
                {"name": {"$regex": r"^(Health Record Patient|Notification Patient|Vitals Test Patient|Flask Test Patient|Staff Alert Patient|Health Alert Patient)$", "$options": "i"}},
                {"email": {"$regex": r"@carebridge\.test$", "$options": "i"}},
                {"email": {"$regex": r"^(healthrecord_|notification_patient_|vitals_patient_|staff_patient_|patient_)[0-9a-f]+@example\.com$", "$options": "i"}}
            ]
        }

        # Find matching patient IDs
        junk_patients = list(db.patients.find(placeholder_filter))
        junk_patient_ids = [p["_id"] for p in junk_patients]
        junk_user_ids = [p.get("user_id") for p in junk_patients if p.get("user_id")]

        print(f"Found {len(junk_patients)} junk patient records to clean up.")

        # Delete junk patients
        if junk_patient_ids:
            res_p = db.patients.delete_many({"_id": {"$in": junk_patient_ids}})
            print(f"Deleted {res_p.deleted_count} junk patient records.")

        # Delete associated junk users (make sure not to delete demo patient or staff/doctor)
        protected_emails = ["patient@carebridge.ai", "doctor@carebridge.ai", "staff@carebridge.ai", "admin@carebridge.ai"]
        if junk_user_ids:
            user_obj_ids = [ObjectId(uid) for uid in junk_user_ids if ObjectId.is_valid(uid)]
            res_u = db.users.delete_many({
                "_id": {"$in": user_obj_ids},
                "email": {"$nin": protected_emails}
            })
            print(f"Deleted {res_u.deleted_count} junk user accounts.")

        # Also clean junk users matching test emails
        res_u_extra = db.users.delete_many({
            "email": {"$nin": protected_emails},
            "$or": [
                {"email": {"$regex": r"@carebridge\.test$", "$options": "i"}},
                {"email": {"$regex": r"^(healthrecord_|notification_patient_|vitals_patient_|staff_patient_|patient_)[0-9a-f]+@example\.com$", "$options": "i"}}
            ]
        })
        if res_u_extra.deleted_count > 0:
            print(f"Deleted {res_u_extra.deleted_count} additional test users.")

        # Clean invalid values in existing valid records (replace "string" with None)
        valid_patients = list(db.patients.find())
        for p in valid_patients:
            updates = {}
            if p.get("blood_group") in ["string", "None", None, ""]:
                updates["blood_group"] = "O+"
            if p.get("gender") in ["string", "None", None, ""]:
                updates["gender"] = "Other"
            if p.get("status") not in ["Active", "Pending", "Inactive"]:
                updates["status"] = "Active"
            if not p.get("created_at"):
                updates["created_at"] = datetime.now(timezone.utc) - timedelta(days=5)
            if updates:
                db.patients.update_one({"_id": p["_id"]}, {"$set": updates})

        # Ensure we have realistic sample clinical patients for staff review
        now = datetime.now(timezone.utc)
        sample_patients = [
            {
                "name": "Ramesh Kumar",
                "email": "ramesh.kumar@carebridge.org",
                "phone": "+91 9876543101",
                "age": 48,
                "gender": "Male",
                "blood_group": "B+",
                "emergency_contact": "+91 9876543199 (Wife)",
                "allergies": ["Penicillin", "Sulfa Drugs"],
                "medical_history": ["Hypertension (2018)", "Type 2 Diabetes (2020)"],
                "status": "Active",
                "created_at": now - timedelta(days=12),
                "updated_at": now - timedelta(days=2)
            },
            {
                "name": "Sunita Devi",
                "email": "sunita.devi@carebridge.org",
                "phone": "+91 9876543102",
                "age": 36,
                "gender": "Female",
                "blood_group": "A+",
                "emergency_contact": "+91 9876543198 (Husband)",
                "allergies": ["Aspirin"],
                "medical_history": ["Asthma", "Mild Anemia"],
                "status": "Active",
                "created_at": now - timedelta(days=8),
                "updated_at": now - timedelta(days=1)
            },
            {
                "name": "Rajesh Verma",
                "email": "rajesh.verma@carebridge.org",
                "phone": "+91 9876543103",
                "age": 55,
                "gender": "Male",
                "blood_group": "O+",
                "emergency_contact": "+91 9876543197 (Son)",
                "allergies": [],
                "medical_history": ["Post-CABG (2021)", "Hyperlipidemia"],
                "status": "Active",
                "created_at": now - timedelta(days=6),
                "updated_at": now - timedelta(days=1)
            },
            {
                "name": "Priya Nair",
                "email": "priya.nair@carebridge.org",
                "phone": "+91 9876543104",
                "age": 28,
                "gender": "Female",
                "blood_group": "AB+",
                "emergency_contact": "+91 9876543196 (Mother)",
                "allergies": ["Dust Mites", "Pollen"],
                "medical_history": ["Allergic Rhinitis"],
                "status": "Pending",
                "created_at": now - timedelta(days=4),
                "updated_at": now - timedelta(days=4)
            },
            {
                "name": "Amit Patel",
                "email": "amit.patel@carebridge.org",
                "phone": "+91 9876543105",
                "age": 42,
                "gender": "Male",
                "blood_group": "O-",
                "emergency_contact": "+91 9876543195 (Brother)",
                "allergies": ["Iodine Contrast"],
                "medical_history": ["Kidney Stones (2019)"],
                "status": "Active",
                "created_at": now - timedelta(days=2),
                "updated_at": now - timedelta(days=2)
            },
            {
                "name": "Vikram Malhotra",
                "email": "vikram.malhotra@carebridge.org",
                "phone": "+91 9876543106",
                "age": 63,
                "gender": "Male",
                "blood_group": "A-",
                "emergency_contact": "+91 9876543194 (Daughter)",
                "allergies": ["NSAIDs"],
                "medical_history": ["Chronic Kidney Disease Stage 2", "Hypertension"],
                "status": "Active",
                "created_at": now - timedelta(hours=18),
                "updated_at": now - timedelta(hours=18)
            },
            {
                "name": "Meera Joshi",
                "email": "meera.joshi@carebridge.org",
                "phone": "+91 9876543107",
                "age": 31,
                "gender": "Female",
                "blood_group": "B-",
                "emergency_contact": "+91 9876543193 (Spouse)",
                "allergies": [],
                "medical_history": ["Hypothyroidism"],
                "status": "Inactive",
                "created_at": now - timedelta(days=20),
                "updated_at": now - timedelta(days=10)
            },
            {
                "name": "Anil Deshmukh",
                "email": "anil.deshmukh@carebridge.org",
                "phone": "+91 9876543108",
                "age": 51,
                "gender": "Male",
                "blood_group": "AB-",
                "emergency_contact": "+91 9876543192 (Son)",
                "allergies": ["Latex"],
                "medical_history": ["Osteoarthritis", "Pre-Diabetes"],
                "status": "Active",
                "created_at": now - timedelta(hours=5),
                "updated_at": now - timedelta(hours=5)
            }
        ]

        # Check and insert sample clinical patients if not existing
        for sp in sample_patients:
            existing = db.patients.find_one({"$or": [{"phone": sp["phone"]}, {"email": sp["email"]}]})
            if not existing:
                db.patients.insert_one(sp)
                print(f"Inserted clinical sample patient: {sp['name']}")

        total_patients = db.patients.count_documents({})
        print(f"\nCleanup Complete! Total clean patients in MongoDB: {total_patients}")

if __name__ == "__main__":
    cleanup_and_seed_patients()
