import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_database
from app.utils.security import hash_password

def update_user():
    db = get_database()
    pw_hash = hash_password("CareBridge#2026!Secure")
    
    # 1. Update user account
    db.users.update_one(
        {"email": "phoolkumari2604@gmail.com"},
        {"$set": {
            "password_hash": pw_hash,
            "status": "active",
            "email_verified": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "role": "ADMIN",
            "is_primary_admin": True
        }},
        upsert=True
    )
    
    user = db.users.find_one({"email": "phoolkumari2604@gmail.com"})
    uid = str(user["_id"])
    
    # 2. Link Patient Profile
    db.patients.update_one(
        {"email": "phoolkumari2604@gmail.com"},
        {"$set": {
            "user_id": uid,
            "status": "Active"
        }}
    )
    
    # 3. Link Doctor Profile
    db.doctors.update_one(
        {"email": "phoolkumari2604@gmail.com"},
        {"$set": {
            "user_id": uid,
            "status": "AVAILABLE"
        }}
    )
    
    # 4. Clear any rate limits
    db.login_rate_limits.delete_many({})
    
    print("[SUCCESS] phoolkumari2604@gmail.com initialized and activated successfully!")
    print(f"  User ID: {uid}")
    print(f"  Role: ADMIN")
    print(f"  Status: active")
    print(f"  Email Verified: True")

if __name__ == "__main__":
    update_user()
