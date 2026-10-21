import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_database
from app.utils.security import hash_password, verify_password
from app.models.user import create_user_document


def seed_staff_user(db=None):
    if db is None:
        db = get_database()

    email = "staff@carebridge.ai"
    raw_password = os.getenv("DEMO_STAFF_PASSWORD", "CareBridge#Staff2026!Admin")
    role = "STAFF"
    name = "Meera Nair"
    phone = "+91 98201 33445"
    staff_id = "300001"
    now = datetime.now(timezone.utc)

    pw_hash = hash_password(raw_password)

    # 1. Reset or insert user document
    existing = db.users.find_one({"email": email})
    if existing:
        update_fields = {
            "name": name,
            "role": role,
            "password_hash": pw_hash,
            "email_verified": True,
            "require_email_verification": False,
            "status": "active",
            "failed_login_attempts": 0,
            "locked_until": None,
            "staff_id": staff_id,
            "staffId": staff_id,
            "phone": phone,
            "updated_at": now,
        }
        db.users.update_one({"_id": existing["_id"]}, {"$set": update_fields})
        user_id = str(existing["_id"])
        print(f"[Seed] Updated existing staff user {email} (ID: {user_id})")
    else:
        doc = create_user_document(
            name=name,
            email=email,
            password_hash=pw_hash,
            role=role,
            phone=phone,
        )
        doc["email_verified"] = True
        doc["require_email_verification"] = False
        doc["status"] = "active"
        doc["failed_login_attempts"] = 0
        doc["locked_until"] = None
        doc["staff_id"] = staff_id
        doc["staffId"] = staff_id
        res = db.users.insert_one(doc)
        user_id = str(res.inserted_id)
        print(f"[Seed] Created new staff user {email} (ID: {user_id})")

    # 2. Reset rate limits collection for local testing
    db.login_rate_limits.update_many(
        {},
        {"$set": {"failed_attempts": 0, "locked_until": None, "updated_at": now}}
    )
    print("[Seed] Reset all login_rate_limits documents")

    # 3. Verification check
    user = db.users.find_one({"email": email})
    assert user is not None, "Staff user not found in database!"
    assert user["role"] == "STAFF", f"Expected role STAFF, got {user['role']}"
    assert user["failed_login_attempts"] == 0, "failed_login_attempts should be 0"
    assert user["locked_until"] is None, "locked_until should be None"
    assert verify_password(raw_password, user["password_hash"]), "Password verification failed!"

    print("==================================================")
    print("STAFF USER SEED & UNLOCK SUCCESSFUL")
    print(f"Email:    {email}")
    print(f"Password: {raw_password}")
    print(f"Role:     {user['role']}")
    print(f"Status:   {user['status']}")
    print(f"Failed:   {user['failed_login_attempts']}")
    print(f"Locked:   {user['locked_until']}")
    print("==================================================")
    return user


if __name__ == "__main__":
    seed_staff_user()
