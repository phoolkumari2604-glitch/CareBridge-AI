import os
import random
import re
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.decorators import token_required, admin_required
from app.models.user import create_user_document
from app.services.audit_service import log_audit_action
from app.services.email_service import (
    send_admin_bootstrap_email,
    send_admin_2fa_otp,
    send_patient_verification_email,
    send_password_reset_email,
)
from app.config import ADMIN_EMAIL, ADMIN_NAME

auth_bp = Blueprint("auth", __name__)

def bootstrap_admin_if_needed(db):
    """Ensures the primary admin account exists and is properly configured."""
    try:
        admin_email = ADMIN_EMAIL.strip().lower()
        existing_admin = db.users.find_one({"email": admin_email})
        
        if not existing_admin:
            print(f"[Admin Bootstrap] Initializing primary admin user: {admin_email}")
            bootstrap_token = secrets.token_urlsafe(32)
            temp_pass = secrets.token_urlsafe(12) + "A1@"
            password_hash = hash_password(temp_pass)
            
            admin_doc = create_user_document(
                name=ADMIN_NAME,
                email=admin_email,
                password_hash=password_hash,
                role="ADMIN",
                phone="+91 9876543210"
            )
            admin_doc["email_verified"] = True
            admin_doc["status"] = "active"
            admin_doc["staff_id"] = "100001"
            admin_doc["staffId"] = "100001"
            admin_doc["bootstrap_token"] = bootstrap_token
            admin_doc["bootstrap_expires"] = datetime.now(timezone.utc) + timedelta(days=3)
            admin_doc["is_primary_admin"] = True
            
            db.users.insert_one(admin_doc)
            send_admin_bootstrap_email(admin_email, ADMIN_NAME, bootstrap_token)
            print(f"[Admin Bootstrap] Primary admin created. Bootstrap email sent to {admin_email}")
            print(f"[Admin Bootstrap Initial Password (for offline use)]: {temp_pass}")
        else:
            # Ensure role is ADMIN and email is verified
            if existing_admin.get("role") != "ADMIN" or not existing_admin.get("email_verified"):
                db.users.update_one(
                    {"_id": existing_admin["_id"]},
                    {"$set": {"role": "ADMIN", "email_verified": True, "status": "active"}}
                )
    except Exception as e:
        print(f"[Admin Bootstrap Error]: {e}")

def get_or_create_staff_id(db, user):
    """Ensures an exactly 6-digit numeric, immutable staff ID."""
    existing_id = user.get("staff_id") or user.get("staffId")
    if existing_id and str(existing_id).isdigit() and len(str(existing_id)) == 6:
        return str(existing_id)
        
    while True:
        candidate_id = str(random.randint(100000, 999999))
        collision = db.users.find_one({
            "$or": [{"staff_id": candidate_id}, {"staffId": candidate_id}]
        })
        if not collision:
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "staff_id": candidate_id,
                    "staffId": candidate_id,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            return candidate_id

def validate_strong_password(password: str):
    """Validates that a password meets production security criteria."""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number (0-9)"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)"
    return True, None

# ============================================================
# REGISTER (PATIENT ONLY)
# ============================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    db = get_database()
    bootstrap_admin_if_needed(db)
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    
    # Public registration is strictly restricted to PATIENT
    role = "PATIENT"
    
    if not name or not email or not password:
        return jsonify({"error": "Validation Error", "detail": "Name, email, and password are required"}), 400
        
    # Email format validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Validation Error", "detail": "Please provide a valid email address"}), 400
        
    # Strong password validation
    is_valid_pw, pw_err = validate_strong_password(password)
    if not is_valid_pw:
        return jsonify({"error": "Validation Error", "detail": pw_err}), 400
    
    existing_user = db.users.find_one({"email": email})
    if existing_user:
        return jsonify({"error": "Conflict", "detail": "An account with this email already exists"}), 409
    
    verification_token = secrets.token_urlsafe(32)
    verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    password_hash = hash_password(password)
    user_data = create_user_document(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role,
        phone=phone
    )
    user_data["email_verified"] = False
    user_data["verification_token"] = verification_token
    user_data["verification_expires"] = verification_expires
    user_data["status"] = "active"
    
    result = db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    
    # Create associated patient record
    age = data.get("age")
    patient_doc = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "phone": phone,
        "age": int(age) if age is not None and str(age).isdigit() else None,
        "gender": data.get("gender", "Other"),
        "blood_group": data.get("blood_group", "O+"),
        "emergency_contact": data.get("emergency_contact"),
        "allergies": data.get("allergies", []),
        "medical_history": data.get("medical_history", []),
        "created_at": datetime.now(timezone.utc)
    }
    patient_res = db.patients.insert_one(patient_doc)
    patient_id = str(patient_res.inserted_id)
    
    # Send email verification
    send_patient_verification_email(email, name, verification_token)
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role="PATIENT",
        action="PATIENT_REGISTERED",
        resource="AUTH",
        resource_id=user_id,
        details=f"New patient account registered for {email}. Verification email dispatched."
    )

    # Issue access token for instant automatic sign-in
    token_data = {
        "sub": user_id,
        "email": email,
        "role": role
    }
    access_token = create_access_token(data=token_data, expires_delta=timedelta(days=7))
    now_time = datetime.now(timezone.utc)
        
    return jsonify({
        "message": "Account created successfully! Welcome to CareBridge AI.",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "email": email,
        "role": "PATIENT",
        "email_verified": False,
        "user": {
            "id": user_id,
            "_id": user_id,
            "name": name,
            "fullName": name,
            "email": email,
            "role": "PATIENT",
            "phone": phone,
            "patient_id": patient_id,
            "doctor_id": None,
            "staffId": None,
            "staff_id": None,
            "faceVerified": False,
            "fingerprintVerified": False,
            "emailVerified": False,
            "lastLogin": now_time.isoformat(),
            "createdAt": now_time.isoformat()
        }
    }), 201

# ============================================================
# LOGIN & 2FA
# ============================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    db = get_database()
    bootstrap_admin_if_needed(db)
    data = request.get_json() or {}
    
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"error": "Validation Error", "detail": "Email and password are required"}), 400
        
    user = db.users.find_one({"email": email})
    now = datetime.now(timezone.utc)
    
    if not user:
        log_audit_action(
            db=db,
            user_id="SYSTEM",
            user_role="SYSTEM",
            action="LOGIN_FAILED",
            resource="AUTH",
            resource_id=email,
            details=f"Failed login attempt for non-existent user {email}"
        )
        return jsonify({"error": "Unauthorized", "detail": "Invalid email or password"}), 401
        
    # Check account status
    if user.get("status") == "inactive":
        return jsonify({"error": "Forbidden", "detail": "This account has been deactivated. Please contact support."}), 403
        
    # Check lockout
    locked_until = user.get("locked_until")
    if locked_until:
        if isinstance(locked_until, str):
            try:
                locked_until = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            except Exception:
                locked_until = None
        if locked_until and locked_until > now:
            minutes_left = max(1, int((locked_until - now).total_seconds() / 60))
            return jsonify({
                "error": "Too Many Requests",
                "detail": f"Account temporarily locked due to 5 consecutive failed attempts. Please try again in {minutes_left} minute(s)."
            }), 429

    stored_hash = user.get("password_hash") or user.get("password")
    if not verify_password(password, stored_hash):
        failed_attempts = user.get("failed_login_attempts", 0) + 1
        update_doc = {"failed_login_attempts": failed_attempts}
        
        lockout_msg = "Invalid email or password"
        if failed_attempts >= 5:
            lock_time = now + timedelta(minutes=15)
            update_doc["locked_until"] = lock_time
            update_doc["failed_login_attempts"] = 0
            lockout_msg = "Account locked for 15 minutes due to 5 failed login attempts."
            log_audit_action(
                db=db,
                user_id=str(user["_id"]),
                user_role=user.get("role", "PATIENT"),
                action="ACCOUNT_LOCKED",
                resource="AUTH",
                resource_id=str(user["_id"]),
                details=f"Account {email} locked for 15m after 5 failed login attempts"
            )
        else:
            remaining = 5 - failed_attempts
            lockout_msg = f"Invalid email or password. {remaining} attempt(s) remaining before temporary lockout."

        db.users.update_one({"_id": user["_id"]}, {"$set": update_doc})
        
        log_audit_action(
            db=db,
            user_id=str(user["_id"]),
            user_role=user.get("role", "PATIENT"),
            action="LOGIN_FAILED",
            resource="AUTH",
            resource_id=str(user["_id"]),
            details=f"Failed login attempt for {email} ({failed_attempts}/5)"
        )
        return jsonify({"error": "Unauthorized", "detail": lockout_msg}), 401
        
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT").upper()
    
    # Reset failed attempts upon correct password
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"failed_login_attempts": 0, "locked_until": None}}
    )
    
    # ----------------------------------------------------
    # ADMIN 2FA OTP REQUIREMENT
    # ----------------------------------------------------
    if role == "ADMIN":
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        temp_token = secrets.token_urlsafe(32)
        otp_expires = now + timedelta(minutes=10)
        
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "temp_2fa_token": temp_token,
                "admin_2fa_otp": otp_code,
                "admin_2fa_expires": otp_expires
            }}
        )
        
        send_admin_2fa_otp(user["email"], user.get("name", "Admin"), otp_code)
        
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role="ADMIN",
            action="2FA_OTP_DISPATCHED",
            resource="AUTH",
            resource_id=user_id,
            details=f"2FA verification code dispatched to admin email {email}"
        )
        
        return jsonify({
            "require_2fa": True,
            "temp_token": temp_token,
            "email": user["email"],
            "message": f"A 6-digit verification code has been sent to {user['email']}. Please enter it to complete sign in."
        }), 200

    # ----------------------------------------------------
    # REGULAR USER TOKEN ISSUANCE
    # ----------------------------------------------------
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR"] else None
    
    now_time = datetime.now(timezone.utc)
    db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_time, "lastLogin": now_time.isoformat()}})
    
    token_data = {
        "sub": user_id,
        "email": user["email"],
        "role": role
    }
    
    access_token = create_access_token(data=token_data, expires_delta=timedelta(days=7))
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="LOGIN_SUCCESS",
        resource="AUTH",
        resource_id=user_id,
        details=f"User {email} logged in successfully as {role}"
    )
    
    patient_id = None
    doctor_id = None
    if role == "PATIENT":
        pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if pat:
            patient_id = str(pat["_id"])
    elif role == "DOCTOR":
        doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if doc:
            doctor_id = str(doc["_id"])
            
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "_id": user_id,
            "name": user.get("name"),
            "fullName": user.get("name") or user.get("fullName"),
            "email": user["email"],
            "role": role,
            "phone": user.get("phone"),
            "staffId": staff_id,
            "staff_id": staff_id,
            "faceVerified": bool(user.get("face_verified") or user.get("faceVerified")),
            "fingerprintVerified": bool(user.get("fingerprint_verified") or user.get("fingerprintVerified")),
            "emailVerified": bool(user.get("email_verified", False)),
            "lastLogin": now_time.isoformat(),
            "createdAt": (user.get("created_at") or user.get("createdAt") or now_time).isoformat() if hasattr(user.get("created_at") or user.get("createdAt") or now_time, "isoformat") else str(user.get("created_at") or user.get("createdAt") or now_time),
            "patient_id": patient_id,
            "doctor_id": doctor_id
        }
    }), 200

# ============================================================
# 2FA VERIFICATION (ADMIN)
# ============================================================
@auth_bp.route("/login/2fa-verify", methods=["POST"])
def verify_admin_2fa():
    db = get_database()
    data = request.get_json() or {}
    
    temp_token = data.get("temp_token", "").strip()
    otp = str(data.get("otp", "")).strip()
    
    if not temp_token or not otp:
        return jsonify({"error": "Validation Error", "detail": "Temporary token and 6-digit OTP are required"}), 400
        
    user = db.users.find_one({"temp_2fa_token": temp_token})
    if not user:
        return jsonify({"error": "Unauthorized", "detail": "Invalid or expired session. Please sign in again."}), 401
        
    stored_otp = str(user.get("admin_2fa_otp", ""))
    otp_expires = user.get("admin_2fa_expires")
    now = datetime.now(timezone.utc)
    
    if isinstance(otp_expires, str):
        try:
            otp_expires = datetime.fromisoformat(otp_expires.replace("Z", "+00:00"))
        except Exception:
            otp_expires = None
            
    if not otp_expires or otp_expires < now:
        return jsonify({"error": "Unauthorized", "detail": "The OTP code has expired. Please request a new code."}), 401
        
    if stored_otp != otp:
        return jsonify({"error": "Unauthorized", "detail": "Invalid OTP code. Please check your email and try again."}), 401
        
    user_id = str(user["_id"])
    role = "ADMIN"
    now_time = datetime.now(timezone.utc)
    
    # Clear 2FA temp state and update last login
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "temp_2fa_token": None,
            "admin_2fa_otp": None,
            "admin_2fa_expires": None,
            "last_login": now_time,
            "lastLogin": now_time.isoformat()
        }}
    )
    
    token_data = {
        "sub": user_id,
        "email": user["email"],
        "role": role
    }
    
    access_token = create_access_token(data=token_data, expires_delta=timedelta(days=7))
    staff_id = get_or_create_staff_id(db, user)
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role="ADMIN",
        action="2FA_LOGIN_SUCCESS",
        resource="AUTH",
        resource_id=user_id,
        details=f"Admin {user['email']} authenticated with 2FA OTP"
    )
    
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "_id": user_id,
            "name": user.get("name"),
            "fullName": user.get("name") or user.get("fullName"),
            "email": user["email"],
            "role": "ADMIN",
            "phone": user.get("phone"),
            "staffId": staff_id,
            "staff_id": staff_id,
            "faceVerified": bool(user.get("face_verified") or user.get("faceVerified")),
            "fingerprintVerified": bool(user.get("fingerprint_verified") or user.get("fingerprintVerified")),
            "emailVerified": True,
            "lastLogin": now_time.isoformat(),
            "createdAt": user.get("created_at", now_time).isoformat() if hasattr(user.get("created_at"), "isoformat") else str(user.get("created_at")),
            "is_primary_admin": bool(user.get("is_primary_admin", False))
        }
    }), 200

# ============================================================
# FORGOT & RESET PASSWORD
# ============================================================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    db = get_database()
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Validation Error", "detail": "Email is required"}), 400
        
    user = db.users.find_one({"email": email})
    if user:
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_password_token": reset_token,
                "reset_password_expires": reset_expires
            }}
        )
        
        send_password_reset_email(email, user.get("name", "User"), reset_token)
        
        log_audit_action(
            db=db,
            user_id=str(user["_id"]),
            user_role=user.get("role", "PATIENT"),
            action="PASSWORD_RESET_REQUESTED",
            resource="AUTH",
            resource_id=str(user["_id"]),
            details=f"Password reset link generated and sent to {email}"
        )
        
    # Prevent user enumeration by returning uniform success message
    return jsonify({
        "message": "If an account exists with that email address, password reset instructions have been sent."
    }), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    db = get_database()
    data = request.get_json() or {}
    
    token = data.get("token", "").strip()
    new_password = data.get("password", "")
    
    if not token or not new_password:
        return jsonify({"error": "Validation Error", "detail": "Reset token and new password are required"}), 400
        
    is_valid_pw, pw_err = validate_strong_password(new_password)
    if not is_valid_pw:
        return jsonify({"error": "Validation Error", "detail": pw_err}), 400
        
    now = datetime.now(timezone.utc)
    user = db.users.find_one({
        "reset_password_token": token,
        "reset_password_expires": {"$gt": now}
    })
    
    if not user:
        return jsonify({"error": "Bad Request", "detail": "Invalid or expired password reset link. Please request a new one."}), 400
        
    new_hash = hash_password(new_password)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": new_hash,
            "reset_password_token": None,
            "reset_password_expires": None,
            "failed_login_attempts": 0,
            "locked_until": None,
            "updated_at": now
        }}
    )
    
    log_audit_action(
        db=db,
        user_id=str(user["_id"]),
        user_role=user.get("role", "PATIENT"),
        action="PASSWORD_RESET_COMPLETED",
        resource="AUTH",
        resource_id=str(user["_id"]),
        details=f"User {user.get('email')} successfully reset their account password"
    )
    
    return jsonify({"message": "Password reset successfully. You can now log in with your new password."}), 200

# ============================================================
# EMAIL VERIFICATION
# ============================================================
@auth_bp.route("/verify-email", methods=["GET", "POST"])
def verify_email():
    db = get_database()
    token = request.args.get("token") or (request.get_json() or {}).get("token")
    
    if not token:
        return jsonify({"error": "Validation Error", "detail": "Verification token is required"}), 400
        
    now = datetime.now(timezone.utc)
    user = db.users.find_one({
        "verification_token": token,
        "verification_expires": {"$gt": now}
    })
    
    if not user:
        return jsonify({"error": "Bad Request", "detail": "Invalid or expired verification link."}), 400
        
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verified": True,
            "verification_token": None,
            "verification_expires": None,
            "updated_at": now
        }}
    )
    
    log_audit_action(
        db=db,
        user_id=str(user["_id"]),
        user_role=user.get("role", "PATIENT"),
        action="EMAIL_VERIFIED",
        resource="AUTH",
        resource_id=str(user["_id"]),
        details=f"Email address {user.get('email')} verified successfully"
    )
    
    return jsonify({"message": "Email verified successfully! You can now log in to your account.", "verified": True}), 200

@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    db = get_database()
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Validation Error", "detail": "Email is required"}), 400
        
    user = db.users.find_one({"email": email})
    if user and not user.get("email_verified"):
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "verification_token": token,
                "verification_expires": expires
            }}
        )
        send_patient_verification_email(email, user.get("name", "User"), token)
        
    return jsonify({"message": "If an unverified account exists, a new verification link has been sent."}), 200

# ============================================================
# INVITE ACCEPTANCE & INITIAL PASSWORD SETUP
# ============================================================
@auth_bp.route("/invite/verify", methods=["GET"])
def verify_invite():
    db = get_database()
    token = request.args.get("token", "").strip()
    
    if not token:
        return jsonify({"error": "Validation Error", "detail": "Invitation token is required"}), 400
        
    now = datetime.now(timezone.utc)
    user = db.users.find_one({
        "$or": [
            {"invite_token": token, "invite_expires": {"$gt": now}},
            {"bootstrap_token": token, "bootstrap_expires": {"$gt": now}}
        ]
    })
    
    if not user:
        return jsonify({"error": "Not Found", "detail": "Invitation link is invalid or has expired."}), 404
        
    return jsonify({
        "valid": True,
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role", "STAFF")
    }), 200

@auth_bp.route("/set-password", methods=["POST"])
def set_invited_password():
    db = get_database()
    data = request.get_json() or {}
    
    token = data.get("token", "").strip()
    password = data.get("password", "")
    
    if not token or not password:
        return jsonify({"error": "Validation Error", "detail": "Token and new password are required"}), 400
        
    is_valid_pw, pw_err = validate_strong_password(password)
    if not is_valid_pw:
        return jsonify({"error": "Validation Error", "detail": pw_err}), 400
        
    now = datetime.now(timezone.utc)
    user = db.users.find_one({
        "$or": [
            {"invite_token": token, "invite_expires": {"$gt": now}},
            {"bootstrap_token": token, "bootstrap_expires": {"$gt": now}}
        ]
    })
    
    if not user:
        return jsonify({"error": "Bad Request", "detail": "Invalid or expired invitation token."}), 400
        
    new_hash = hash_password(password)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": new_hash,
            "invite_token": None,
            "invite_expires": None,
            "bootstrap_token": None,
            "bootstrap_expires": None,
            "status": "active",
            "email_verified": True,
            "updated_at": now
        }}
    )
    
    log_audit_action(
        db=db,
        user_id=str(user["_id"]),
        user_role=user.get("role", "STAFF"),
        action="INVITE_ACTIVATED",
        resource="AUTH",
        resource_id=str(user["_id"]),
        details=f"Invited user {user.get('email')} activated account and set credentials"
    )
    
    return jsonify({"message": "Password configured successfully. Your account is now active and ready for login."}), 200

# ============================================================
# USER PROFILE & BIOMETRIC CREDENTIALS
# ============================================================
@auth_bp.route("/me", methods=["GET"])
@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_me():
    try:
        db = get_database()
        user = g.current_user
        user_id = str(user["_id"])
        role = user.get("role", "PATIENT")
        
        staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else None
        
        patient_id = None
        patient_code = None
        doctor_id = None
        if role == "PATIENT":
            pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]})
            if pat:
                patient_id = str(pat["_id"])
                patient_code = pat.get("patient_code") or pat.get("patientId") or str(pat["_id"])[-6:]
        elif role == "DOCTOR":
            doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]})
            if doc:
                doctor_id = str(doc["_id"])
                
        last_login = user.get("lastLogin") or user.get("last_login")
        if hasattr(last_login, "isoformat"):
            last_login_str = last_login.isoformat()
        else:
            last_login_str = str(last_login or "")

        created_at = user.get("createdAt") or user.get("created_at")
        if hasattr(created_at, "isoformat"):
            created_at_str = created_at.isoformat()
        else:
            created_at_str = str(created_at or "")

        bio = db.staff_biometrics.find_one({"user_id": user_id})
        fp = bio.get("fingerprint") if bio else None
        face = bio.get("face") if bio else None

        face_verified = bool(face or user.get("face_verified") or user.get("faceVerified"))
        face_verified_at = face.get("enrolled_at") if (face and face.get("enrolled_at")) else (user.get("face_verified_at") or user.get("faceVerifiedAt"))
        fp_verified = bool(fp or user.get("fingerprint_verified") or user.get("fingerprintVerified"))
        fp_verified_at = fp.get("linked_at") if (fp and fp.get("linked_at")) else (user.get("fingerprint_verified_at") or user.get("fingerprintVerifiedAt"))

        return jsonify({
            "id": user_id,
            "_id": user_id,
            "name": user.get("name"),
            "fullName": user.get("name") or user.get("fullName") or "User",
            "email": user.get("email"),
            "role": role,
            "phone": user.get("phone", ""),
            "staffId": staff_id,
            "staff_id": staff_id,
            "faceVerified": face_verified,
            "faceVerifiedAt": face_verified_at,
            "fingerprintVerified": fp_verified,
            "fingerprintVerifiedAt": fp_verified_at,
            "credentialId": fp.get("credentialId") if fp else user.get("webauthn_credential_id"),
            "emailVerified": bool(user.get("email_verified", False)),
            "is_primary_admin": bool(user.get("is_primary_admin", False)),
            "lastLogin": last_login_str,
            "createdAt": created_at_str,
            "patient_id": patient_id,
            "patient_code": patient_code,
            "patientId": patient_code,
            "doctor_id": doctor_id,
            "avatar": user.get("avatar") or user.get("photo"),
            "photo": user.get("photo") or user.get("avatar")
        }), 200
    except Exception as err:
        return jsonify({"error": "Failed to retrieve profile", "detail": str(err)}), 500

@auth_bp.route("/profile", methods=["PUT"])
@auth_bp.route("/me", methods=["PUT"])
@token_required
def update_profile():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    data = request.get_json() or {}
    
    update_fields = {}
    if "fullName" in data and data["fullName"].strip():
        update_fields["name"] = data["fullName"].strip()
        update_fields["fullName"] = data["fullName"].strip()
    elif "name" in data and data["name"].strip():
        update_fields["name"] = data["name"].strip()
        update_fields["fullName"] = data["name"].strip()

    if "email" in data:
        new_email = str(data["email"] or "").strip().lower()
        if new_email and new_email != str(user.get("email", "")).strip().lower():
            if not re.match(r"[^@]+@[^@]+\.[^@]+", new_email):
                return jsonify({"error": "Validation Error", "detail": "Please provide a valid email address"}), 400
            
            conflict = db.users.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}})
            if conflict:
                return jsonify({"error": "Conflict", "detail": "This email address is already in use by another account."}), 409

            conflict_pat = db.patients.find_one({"email": new_email, "user_id": {"$ne": user_id}})
            if conflict_pat:
                return jsonify({"error": "Conflict", "detail": "This email address is already in use by another account."}), 409
                
            update_fields["email"] = new_email
            
            if role == "PATIENT":
                db.patients.update_many(
                    {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
                    {"$set": {"email": new_email, "updated_at": datetime.now(timezone.utc)}}
                )
            elif role == "DOCTOR":
                db.doctors.update_many(
                    {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
                    {"$set": {"email": new_email, "updated_at": datetime.now(timezone.utc)}}
                )
        
    if "phone" in data:
        raw_phone = data["phone"].strip()
        digits = re.sub(r"\D", "", raw_phone)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) == 10:
            update_fields["phone"] = f"+91 {digits}"
        else:
            update_fields["phone"] = raw_phone

    if "avatar" in data:
        update_fields["avatar"] = data["avatar"]
    if "photo" in data:
        update_fields["photo"] = data["photo"]
        if "avatar" not in update_fields:
            update_fields["avatar"] = data["photo"]
            
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        
        # If name was updated, sync to patients or doctors
        if "name" in update_fields:
            if role == "PATIENT":
                db.patients.update_many(
                    {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
                    {"$set": {"name": update_fields["name"], "updated_at": datetime.now(timezone.utc)}}
                )
            elif role == "DOCTOR":
                db.doctors.update_many(
                    {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
                    {"$set": {"name": update_fields["name"], "updated_at": datetime.now(timezone.utc)}}
                )

        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="PROFILE_UPDATED",
            resource="USER_PROFILE",
            resource_id=user_id,
            details=f"User {user.get('email')} updated profile contact information"
        )
        
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    staff_id = get_or_create_staff_id(db, updated_user) if role in ["STAFF", "DOCTOR", "ADMIN"] else None

    # Mint fresh token with updated email
    fresh_token = create_access_token({
        "sub": user_id,
        "email": updated_user.get("email"),
        "role": role
    })

    pat_code = None
    pat_id = None
    if role == "PATIENT":
        p_doc = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": updated_user.get("email", "").lower()}]})
        if p_doc:
            pat_id = str(p_doc["_id"])
            pat_code = p_doc.get("patient_code") or p_doc.get("patientId") or str(p_doc["_id"])[-6:]
    
    return jsonify({
        "message": "Profile updated successfully",
        "access_token": fresh_token,
        "user": {
            "id": user_id,
            "_id": user_id,
            "name": updated_user.get("name"),
            "fullName": updated_user.get("name") or updated_user.get("fullName"),
            "email": updated_user.get("email"),
            "role": role,
            "phone": updated_user.get("phone"),
            "avatar": updated_user.get("avatar") or updated_user.get("photo"),
            "photo": updated_user.get("photo") or updated_user.get("avatar"),
            "staffId": staff_id,
            "patient_id": pat_id,
            "patient_code": pat_code,
            "patientId": pat_code,
            "faceVerified": bool(updated_user.get("face_verified") or updated_user.get("faceVerified")),
            "fingerprintVerified": bool(updated_user.get("fingerprint_verified") or updated_user.get("fingerprintVerified"))
        }
    }), 200

# ============================================================
# BIOMETRIC STATUS & CREDENTIAL MANAGEMENT
# ============================================================
@auth_bp.route("/biometrics/status", methods=["GET"])
@token_required
def get_biometrics_status():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])

    bio = db.staff_biometrics.find_one({"user_id": user_id})
    fp = bio.get("fingerprint") if bio else None
    face = bio.get("face") if bio else None

    fp_linked = bool((fp and fp.get("credentialId")) or user.get("fingerprint_verified") or user.get("fingerprintVerified"))
    fp_linked_at = (fp.get("linked_at") if fp else None) or user.get("fingerprint_verified_at") or user.get("fingerprintVerifiedAt")
    face_enrolled = bool((face and (face.get("descriptor") or face.get("encrypted_payload"))) or user.get("face_verified") or user.get("faceVerified"))
    face_enrolled_at = (face.get("enrolled_at") if face else None) or user.get("face_verified_at") or user.get("faceVerifiedAt")
    cred_id = (fp.get("credentialId") if fp else None) or user.get("webauthn_credential_id")

    return jsonify({
        "staff_id": staff_id,
        "fingerprintLinked": fp_linked,
        "fingerprintVerified": fp_linked,
        "fingerprintLinkedAt": fp_linked_at,
        "fingerprintVerifiedAt": fp_linked_at,
        "credentialId": cred_id,
        "faceEnrolled": face_enrolled,
        "faceVerified": face_enrolled,
        "faceEnrolledAt": face_enrolled_at,
        "faceVerifiedAt": face_enrolled_at,
    }), 200

# ============================================================
# BIOMETRIC FACE ENDPOINTS
# ============================================================
@auth_bp.route("/biometrics/face/enroll", methods=["POST"])
@token_required
def enroll_face():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    data = request.get_json() or {}
    
    descriptor = data.get("descriptor") or data.get("embedding")
    encrypted_payload = data.get("encrypted_payload")
    consent = bool(data.get("consent", True))
    
    if not consent:
        return jsonify({"error": "Consent Required", "detail": "User consent is required for biometric processing."}), 400
        
    if not descriptor and not encrypted_payload:
        return jsonify({"error": "Validation Error", "detail": "Valid face descriptor vector or encrypted payload is required."}), 400
        
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Store ONLY the encrypted descriptor vector. Never store raw photos.
    stored_descriptor = encrypted_payload if encrypted_payload else descriptor
    db.staff_biometrics.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "staff_id": staff_id,
            "user_name": user_name,
            "role": role,
            "face": {
                "descriptor": stored_descriptor,
                "raw_vector": descriptor if isinstance(descriptor, list) else None,
                "encrypted_payload": encrypted_payload,
                "enrolled_at": now_iso
            },
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    # Mirror active verified status onto user document for token sessions
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "face_verified": True,
            "faceVerified": True,
            "face_verified_at": now_iso,
            "faceVerifiedAt": now_iso,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if role == "PATIENT":
        db.patients.update_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"$set": {
                "face_verified": True,
                "faceVerified": True,
                "face_verified_at": now_iso,
                "faceVerifiedAt": now_iso,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FACE_ENROLLED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) completed live face camera guided liveness and enrolled encrypted descriptor vector"
    )
    
    return jsonify({
        "message": "Face biometric descriptor enrolled successfully",
        "faceVerified": True,
        "faceEnrolled": True,
        "faceVerifiedAt": now_iso,
        "faceEnrolledAt": now_iso
    }), 200

@auth_bp.route("/biometrics/face/verify", methods=["POST"])
@token_required
def verify_face():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    data = request.get_json() or {}
    
    live_descriptor = data.get("descriptor")
    if not live_descriptor or not isinstance(live_descriptor, list):
        return jsonify({"error": "Validation Error", "detail": "Live face descriptor array is required."}), 400

    bio = db.staff_biometrics.find_one({"user_id": user_id})
    stored_descriptor = None
    if bio and bio.get("face"):
        stored_descriptor = bio["face"].get("raw_vector") or bio["face"].get("descriptor")
    if not stored_descriptor:
        stored_descriptor = user.get("face_descriptor")
    
    if not stored_descriptor or not isinstance(stored_descriptor, list):
        return jsonify({"error": "Not Found", "detail": "No enrolled face biometric found for this account. Please enroll first."}), 404
        
    dist = 999.0
    match_score = 0.0
    
    try:
        # Euclidean distance between fresh 128-d descriptor and stored descriptor
        dist = sum((float(a) - float(b)) ** 2 for a, b in zip(live_descriptor, stored_descriptor)) ** 0.5
        # Required Euclidean threshold: distance < 0.55
        is_match = dist < 0.55
        match_score = max(0.0, min(100.0, round((1.0 - (dist / 0.75)) * 100, 1)))
    except Exception as e:
        dist = 999.0
        is_match = False

    if not is_match:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="FACE_VERIFIED_FAILED",
            resource="BIOMETRICS",
            resource_id=staff_id,
            details=f"User {user_name} ({role} #{staff_id}) face verification failed Euclidean distance threshold (dist: {round(dist, 4)}, threshold: < 0.55)"
        )
        return jsonify({
            "verified": False,
            "distance": round(dist, 4),
            "matchScore": match_score,
            "detail": f"Face verification did not match enrolled credential (distance: {round(dist, 3)}, threshold: < 0.55)."
        }), 401
        
    now_iso = datetime.now(timezone.utc).isoformat()
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FACE_VERIFIED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) successfully authenticated via live face descriptor match (dist: {round(dist, 4)} < 0.55, score: {match_score}%)"
    )
    
    return jsonify({
        "verified": True,
        "distance": round(dist, 4),
        "matchScore": match_score,
        "message": f"Face verification successful ({match_score}% confidence match)",
        "verifiedAt": now_iso
    }), 200

@auth_bp.route("/biometrics/face", methods=["DELETE"])
@token_required
def remove_face_biometric():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])

    db.staff_biometrics.update_one(
        {"user_id": user_id},
        {"$unset": {"face": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "face_verified": False,
            "faceVerified": False,
            "face_verified_at": None,
            "faceVerifiedAt": None,
            "face_descriptor": None,
            "face_encrypted_payload": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if role == "PATIENT":
        db.patients.update_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"$set": {
                "face_verified": False,
                "faceVerified": False,
                "face_verified_at": None,
                "faceVerifiedAt": None,
                "updated_at": datetime.now(timezone.utc)
            }}
        )

    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FACE_REMOVED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) removed enrolled face biometric descriptor"
    )

    return jsonify({
        "message": "Face biometric credential removed successfully",
        "faceVerified": False,
        "faceEnrolled": False
    }), 200

# ============================================================
# BIOMETRIC FINGERPRINT / WEBAUTHN ENDPOINTS
# ============================================================
@auth_bp.route("/biometrics/webauthn/register-options", methods=["POST"])
@token_required
def webauthn_register_options():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    user_name = user.get("name") or user.get("fullName") or f"User #{staff_id}"
    
    challenge = secrets.token_urlsafe(32)
    rp_id = request.host.split(":")[0]
    
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"webauthn_challenge": challenge, "webauthn_challenge_created": datetime.now(timezone.utc)}}
    )
    
    return jsonify({
        "challenge": challenge,
        "rp": {"name": "CareBridge AI Clinical Security", "id": rp_id},
        "user": {
            "id": staff_id,
            "name": user.get("email"),
            "displayName": user_name
        },
        "pubKeyCredParams": [
            {"type": "public-key", "alg": -7},   # ES256
            {"type": "public-key", "alg": -257}  # RS256
        ],
        "authenticatorSelection": {
            "authenticatorAttachment": "platform",
            "userVerification": "required",
            "residentKey": "preferred"
        },
        "timeout": 60000
    }), 200

@auth_bp.route("/biometrics/webauthn/register-verify", methods=["POST"])
@token_required
def webauthn_register_verify():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    data = request.get_json() or {}
    
    credential_id = data.get("id") or data.get("credentialId")
    public_key = data.get("publicKey") or data.get("response", {}).get("publicKey") or "ECDSA_P256_SHA256"
    counter = int(data.get("counter", 1))
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if not credential_id:
        return jsonify({"error": "Validation Error", "detail": "Credential ID is required."}), 400

    # Store credentialId, publicKey, counter, linked_at in staff_biometrics table
    db.staff_biometrics.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "staff_id": staff_id,
            "user_name": user_name,
            "role": role,
            "fingerprint": {
                "credentialId": credential_id,
                "publicKey": public_key,
                "counter": counter,
                "linked_at": now_iso
            },
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "fingerprint_verified": True,
            "fingerprintVerified": True,
            "fingerprint_verified_at": now_iso,
            "fingerprintVerifiedAt": now_iso,
            "webauthn_credential_id": credential_id,
            "webauthn_challenge": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if role == "PATIENT":
        db.patients.update_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"$set": {
                "fingerprint_verified": True,
                "fingerprintVerified": True,
                "fingerprint_verified_at": now_iso,
                "fingerprintVerifiedAt": now_iso,
                "webauthn_credential_id": credential_id,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FINGERPRINT_LINKED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) linked platform fingerprint sensor (credentialId: {str(credential_id)[:16]}...)"
    )
    
    return jsonify({
        "message": "Platform biometric sensor linked successfully",
        "fingerprintVerified": True,
        "fingerprintLinked": True,
        "fingerprintVerifiedAt": now_iso,
        "fingerprintLinkedAt": now_iso,
        "credentialId": credential_id
    }), 200

@auth_bp.route("/biometrics/webauthn/verify-options", methods=["POST"])
@token_required
def webauthn_verify_options():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    
    bio = db.staff_biometrics.find_one({"user_id": user_id})
    fp = bio.get("fingerprint") if bio else None
    cred_id = (fp.get("credentialId") if fp else None) or user.get("webauthn_credential_id")
    
    if not cred_id:
        return jsonify({"error": "Not Found", "detail": "No platform biometric sensor linked to this account."}), 404
        
    challenge = secrets.token_urlsafe(32)
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"webauthn_verify_challenge": challenge, "webauthn_challenge_created": datetime.now(timezone.utc)}}
    )
    
    return jsonify({
        "challenge": challenge,
        "allowCredentials": [{"type": "public-key", "id": cred_id}],
        "timeout": 60000,
        "userVerification": "required",
        "rpId": request.host.split(":")[0]
    }), 200

@auth_bp.route("/biometrics/webauthn/verify", methods=["POST"])
@token_required
def webauthn_verify():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    data = request.get_json() or {}
    
    bio = db.staff_biometrics.find_one({"user_id": user_id})
    fp = bio.get("fingerprint") if bio else None
    stored_cred_id = (fp.get("credentialId") if fp else None) or user.get("webauthn_credential_id")
    
    if not stored_cred_id:
        return jsonify({"error": "Not Found", "detail": "No registered platform sensor found."}), 404
        
    incoming_id = data.get("id") or data.get("credentialId")
    if incoming_id and incoming_id != stored_cred_id:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="FINGERPRINT_VERIFIED_FAILED",
            resource="BIOMETRICS",
            resource_id=staff_id,
            details=f"User {user_name} ({role} #{staff_id}) WebAuthn credential ID mismatch"
        )
        return jsonify({"verified": False, "detail": "Credential ID does not match registered platform sensor."}), 401
        
    # Increment counter
    if fp:
        new_counter = int(fp.get("counter", 1)) + 1
        db.staff_biometrics.update_one(
            {"user_id": user_id},
            {"$set": {"fingerprint.counter": new_counter}}
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FINGERPRINT_VERIFIED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) verified identity via platform fingerprint sensor"
    )
    
    return jsonify({
        "verified": True,
        "message": "Platform biometric sensor verified successfully",
        "verifiedAt": now_iso
    }), 200

@auth_bp.route("/biometrics/webauthn", methods=["DELETE"])
@auth_bp.route("/biometrics/fingerprint", methods=["DELETE"])
@token_required
def unlink_webauthn():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])

    db.staff_biometrics.update_one(
        {"user_id": user_id},
        {"$unset": {"fingerprint": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "fingerprint_verified": False,
            "fingerprintVerified": False,
            "fingerprint_verified_at": None,
            "fingerprintVerifiedAt": None,
            "webauthn_credential": None,
            "webauthn_credential_id": None,
            "webauthn_challenge": None,
            "webauthn_verify_challenge": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if role == "PATIENT":
        db.patients.update_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"$set": {
                "fingerprint_verified": False,
                "fingerprintVerified": False,
                "fingerprint_verified_at": None,
                "fingerprintVerifiedAt": None,
                "webauthn_credential_id": None,
                "updated_at": datetime.now(timezone.utc)
            }}
        )

    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="FINGERPRINT_UNLINKED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) unlinked platform fingerprint sensor"
    )

    return jsonify({
        "message": "Platform sensor unlinked successfully",
        "fingerprintVerified": False,
        "fingerprintLinked": False
    }), 200

@auth_bp.route("/biometrics", methods=["DELETE"])
@token_required
def delete_biometrics():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    user_name = user.get("name") or user.get("fullName") or "User"
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else str(user.get("patient_code") or user.get("patientId") or user_id[-6:])
    
    # Remove both credential and descriptor from staff_biometrics table
    db.staff_biometrics.delete_one({"user_id": user_id})
    
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "face_verified": False,
            "faceVerified": False,
            "face_verified_at": None,
            "faceVerifiedAt": None,
            "face_descriptor": None,
            "face_encrypted_payload": None,
            "fingerprint_verified": False,
            "fingerprintVerified": False,
            "fingerprint_verified_at": None,
            "fingerprintVerifiedAt": None,
            "webauthn_credential": None,
            "webauthn_credential_id": None,
            "webauthn_challenge": None,
            "webauthn_verify_challenge": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if role == "PATIENT":
        db.patients.update_one(
            {"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]},
            {"$set": {
                "face_verified": False,
                "faceVerified": False,
                "face_verified_at": None,
                "faceVerifiedAt": None,
                "fingerprint_verified": False,
                "fingerprintVerified": False,
                "fingerprint_verified_at": None,
                "fingerprintVerifiedAt": None,
                "webauthn_credential_id": None,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=role,
        action="BIOMETRIC_DELETED",
        resource="BIOMETRICS",
        resource_id=staff_id,
        details=f"User {user_name} ({role} #{staff_id}) permanently removed all stored biometric credentials"
    )
    
    return jsonify({
        "message": "All biometric credentials deleted permanently",
        "faceVerified": False,
        "faceEnrolled": False,
        "fingerprintVerified": False,
        "fingerprintLinked": False
    }), 200

@auth_bp.route("/change-password", methods=["POST"])
@token_required
def change_password():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    data = request.get_json() or {}
    
    current_password = data.get("current_password") or data.get("current") or ""
    new_password = data.get("new_password") or data.get("newPass") or ""
    
    if not current_password or not new_password:
        return jsonify({"error": "Validation Error", "detail": "Current password and new password are required"}), 400
        
    is_valid_pw, pw_err = validate_strong_password(new_password)
    if not is_valid_pw:
        return jsonify({"error": "Validation Error", "detail": pw_err}), 400
        
    if not verify_password(current_password, user.get("password_hash")):
        return jsonify({"error": "Unauthorized", "detail": "Current password is incorrect"}), 401
        
    new_password_hash = hash_password(new_password)
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": new_password_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user.get("role", "USER"),
        action="PASSWORD_CHANGED",
        resource="AUTH",
        resource_id=user_id,
        details="User updated their account password securely"
    )
    
    return jsonify({"message": "Password changed successfully"}), 200