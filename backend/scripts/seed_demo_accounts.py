import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_database
from app.utils.security import hash_password
from app.models.user import create_user_document


DEMO_ACCOUNTS = [
    {
        "name": "Aarav Patel",
        "email": "patient@carebridge.ai",
        "password": os.getenv("DEMO_PATIENT_PASSWORD", "CareBridge#Pt2026!Secure"),
        "role": "PATIENT",
        "phone": "+91 98201 44521",
        "patient_code": "482019",
    },
    {
        "name": "Dr. Rajesh Sharma",
        "email": "doctor@carebridge.ai",
        "password": os.getenv("DEMO_DOCTOR_PASSWORD", "CareBridge#Doc2026!Secure"),
        "role": "DOCTOR",
        "phone": "+91 98201 11223",
        "staff_id": "200001",
    },
    {
        "name": "Meera Nair",
        "email": "staff@carebridge.ai",
        "password": os.getenv("DEMO_STAFF_PASSWORD", "CareBridge#Staff2026!Admin"),
        "role": "STAFF",
        "phone": "+91 98201 33445",
        "staff_id": "300001",
    },
]


def seed_demo_accounts(db=None):
    if db is None:
        db = get_database()

    now = datetime.now(timezone.utc)

    for acct in DEMO_ACCOUNTS:
        email = acct["email"].strip().lower()
        pw_hash = hash_password(acct["password"])
        existing = db.users.find_one({"email": email})

        if existing:
            update_fields = {
                "name": acct["name"],
                "role": acct["role"],
                "password_hash": pw_hash,
                "email_verified": True,
                "require_email_verification": False,
                "status": "active",
                "failed_login_attempts": 0,
                "locked_until": None,
                "updated_at": now,
            }
            if acct.get("staff_id"):
                update_fields["staff_id"] = acct["staff_id"]
                update_fields["staffId"] = acct["staff_id"]
            db.users.update_one({"_id": existing["_id"]}, {"$set": update_fields})
            user_id = str(existing["_id"])
        else:
            doc = create_user_document(
                name=acct["name"],
                email=email,
                password_hash=pw_hash,
                role=acct["role"],
                phone=acct["phone"],
            )
            doc["email_verified"] = True
            doc["require_email_verification"] = False
            doc["status"] = "active"
            doc["failed_login_attempts"] = 0
            doc["locked_until"] = None
            if acct.get("staff_id"):
                doc["staff_id"] = acct["staff_id"]
                doc["staffId"] = acct["staff_id"]
            res = db.users.insert_one(doc)
            user_id = str(res.inserted_id)

        if acct["role"] == "PATIENT":
            pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
            if not pat:
                db.patients.insert_one({
                    "user_id": user_id,
                    "name": acct["name"],
                    "email": email,
                    "phone": acct["phone"],
                    "patient_code": acct.get("patient_code", "482019"),
                    "patientId": acct.get("patient_code", "482019"),
                    "patient_id_code": f"PT-{acct.get('patient_code', '482019')}",
                    "age": 34,
                    "gender": "Male",
                    "blood_group": "O+",
                    "status": "Active",
                    "created_at": now,
                })

    try:
        db.login_rate_limits.delete_many({})
    except Exception:
        pass

    return True


if __name__ == "__main__":
    seed_demo_accounts()
    print("[Seed] Demo accounts (patient@carebridge.ai, doctor@carebridge.ai, staff@carebridge.ai) verified and ready.")
