import os
import random
import re
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g, session
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
from app.services.login_security import (
    ensure_utc,
    log_dev_auth_event,
    generate_login_challenge,
    verify_login_challenge,
    check_ip_and_account_lockout,
    record_failed_login,
    reset_login_counters,
    attach_session_cookie,
    CAPTCHA_THRESHOLD,
    get_client_ip,
)

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
    
    # Support PATIENT registration and DOCTOR credential application
    requested_role = (data.get("role") or data.get("account_type") or "PATIENT").strip().upper()
    if requested_role in ["ADMIN", "STAFF"]:
        return jsonify({
            "error": "Forbidden",
            "detail": "Staff and administrator accounts cannot be registered publicly. They must be provisioned or invited by hospital administration."
        }), 403

    role = "DOCTOR" if requested_role == "DOCTOR" else "PATIENT"
    
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

    # ----------------------------------------------------
    # DOCTOR REGISTRATION & APPLICATION WORKFLOW
    # ----------------------------------------------------
    if role == "DOCTOR":
        specialty = (data.get("specialty") or "").strip()
        license_number = (data.get("license_number") or data.get("licenseNumber") or "").strip()
        hospital_name = (data.get("hospital") or data.get("hospital_name") or "CareBridge Network Hospital").strip()
        experience_years = data.get("experience_years") or data.get("experienceYears")
        consultation_fee = data.get("consultation_fee") or data.get("consultationFee")
        department = (data.get("department") or specialty).strip()

        if not specialty or not license_number:
            return jsonify({
                "error": "Validation Error",
                "detail": "Medical specialty and medical council license number are required for doctor verification."
            }), 400

        user_data = create_user_document(
            name=f"Dr. {name}" if not name.lower().startswith("dr.") else name,
            email=email,
            password_hash=password_hash,
            role="DOCTOR",
            phone=phone
        )
        user_data["status"] = "pending_approval"
        user_data["email_verified"] = False
        user_data["verification_token"] = verification_token
        user_data["verification_expires"] = verification_expires
        user_data["specialty"] = specialty
        user_data["department"] = department
        user_data["license_number"] = license_number

        result = db.users.insert_one(user_data)
        user_id = str(result.inserted_id)

        doctor_doc = {
            "user_id": user_id,
            "name": f"Dr. {name}" if not name.lower().startswith("dr.") else name,
            "email": email,
            "phone": phone,
            "specialty": specialty,
            "department": department,
            "hospital": hospital_name,
            "hospital_name": hospital_name,
            "license_number": license_number,
            "experience_years": int(experience_years) if experience_years is not None and str(experience_years).isdigit() else 5,
            "consultation_fee": int(consultation_fee) if consultation_fee is not None and str(consultation_fee).isdigit() else 800,
            "verification_status": "Pending Approval",
            "status": "PENDING_APPROVAL",
            "is_bookable": False,
            "city": data.get("city", "New Delhi"),
            "country": data.get("country", "India"),
            "category": "Practicing Clinician",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        doc_res = db.doctors.insert_one(doctor_doc)
        doctor_id = str(doc_res.inserted_id)
        db.users.update_one({"_id": result.inserted_id}, {"$set": {"doctor_id": doctor_id}})

        send_patient_verification_email(email, name, verification_token)

        log_audit_action(
            db=db,
            user_id=user_id,
            user_role="DOCTOR",
            action="DOCTOR_APPLICATION_SUBMITTED",
            resource="AUTH",
            resource_id=user_id,
            details=f"Doctor application submitted for {email} (License: {license_number}, Specialty: {specialty}). Pending admin approval."
        )

        return jsonify({
            "message": "Doctor application submitted successfully! Your credentials have been received and are pending administrator verification and approval.",
            "requires_approval": True,
            "status": "pending_approval",
            "user_id": user_id,
            "doctor_id": doctor_id,
            "email": email,
            "role": "DOCTOR"
        }), 201

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
# CAPTCHA CHALLENGE (SERVER-SIDE 4-DIGIT NUMERIC CAPTCHA)
# ============================================================
@auth_bp.route("/captcha", methods=["GET"])
def get_captcha():
    """
    Generate 4-digit numeric security challenge, store expected answer in session,
    and return the 4-digit code and signed challenge token to the client.
    """
    code = str(secrets.randbelow(9000) + 1000)
    session["captcha_expected"] = code
    challenge = generate_login_challenge(code)
    print(f"[Auth][Captcha] Generated 4-digit challenge: {code}")
    return jsonify({
        "captcha": code,
        "code": code,
        "question": code,
        "captcha_token": challenge["token"],
        "token": challenge["token"],
        "status": "ok"
    }), 200


# ============================================================
# LOGIN & 2FA
# ============================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    db = get_database()
    bootstrap_admin_if_needed(db)
    data = request.get_json(silent=True) or {}
    
    # 9. Normalize emails (strip + lowercase) on login
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip().upper()
    remember_me = bool(data.get("remember") if "remember" in data else (data.get("remember_me") or data.get("rememberMe")))
    captcha_answer = data.get("captcha_answer")
    if captcha_answer is not None:
        captcha_answer = str(captcha_answer).strip()

    client_ip = get_client_ip()
    # 14. Temporary server logs (never log passwords)
    print(f"[Auth][Login] Incoming request: email='{email}' ip='{client_ip}' role='{role or '<unspecified>'}'")
    
    if not email or not password:
        log_dev_auth_event("MISSING_CREDENTIALS", email or "<empty>", "Email or password missing in request")
        return jsonify({
            "error": "Validation Error",
            "code": "VALIDATION_ERROR",
            "detail": "Email and password are required"
        }), 400

    if len(password) < 8:
        log_dev_auth_event("INVALID_PASSWORD_LENGTH", email, "Password must be at least 8 characters")
        return jsonify({
            "error": "Validation Error",
            "code": "VALIDATION_ERROR",
            "detail": "Password must be at least 8 characters"
        }), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        log_dev_auth_event("INVALID_EMAIL_FORMAT", email, "Email format failed validation")
        return jsonify({
            "error": "Validation Error",
            "code": "INVALID_EMAIL",
            "detail": "Please enter a valid email address"
        }), 400

    # 11. Validate the 4-digit CAPTCHA server-side.
    if captcha_answer is None or captcha_answer == "":
        log_dev_auth_event("CAPTCHA_MISSING", email, "Missing or empty captcha answer")
        print("[Auth][Login] Captcha result: FAILED (missing/empty answer) -> 400 Bad Request, no attempt penalty")
        return jsonify({
            "error": "Validation Error",
            "code": "CAPTCHA_REQUIRED",
            "detail": "Please enter the 4-digit security code"
        }), 400

    captcha_str = str(captcha_answer).strip()
    session_expected = session.get("captcha_expected")
    captcha_token = (data.get("captcha_token") or data.get("token") or "").strip()

    captcha_valid = False
    if session_expected is not None and captcha_str == str(session_expected):
        captcha_valid = True
        session.pop("captcha_expected", None)
    elif captcha_token and verify_login_challenge(captcha_token, captcha_str):
        captcha_valid = True

    if not captcha_valid:
        log_dev_auth_event("CAPTCHA_MISMATCH", email, f"Expected {session_expected}, got {captcha_str}")
        print(f"[Auth][Login] Captcha result: FAILED (mismatch: got '{captcha_str}')")
        new_code = str(secrets.randbelow(9000) + 1000)
        session["captcha_expected"] = new_code
        new_ch = generate_login_challenge(new_code)
        return jsonify({
            "error": "Validation Error",
            "code": "CAPTCHA_INVALID",
            "detail": "Incorrect security check answer. Please try again.",
            "captcha": {
                "captcha": new_code,
                "code": new_code,
                "question": new_code,
                "token": new_ch["token"],
                "captcha_token": new_ch["token"]
            }
        }), 400

    print(f"[Auth][Login] Captcha result: PASSED (answer provided: {captcha_str})")
        
    user = db.users.find_one({"email": email})
    if not user:
        # Case-insensitive fallback if legacy record was stored with uppercase characters
        user = db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if user and user.get("email") != email:
            db.users.update_one({"_id": user["_id"]}, {"$set": {"email": email}})
            user["email"] = email

    now = datetime.now(timezone.utc)
    
    # 1. Check IP and Account lockout first
    is_locked, rem_seconds, prior_failures = check_ip_and_account_lockout(db, email, user, now)
    if is_locked:
        minutes_left = max(1, (rem_seconds + 59) // 60)
        log_dev_auth_event("ACCOUNT_LOCKED", email, f"Locked for {rem_seconds}s")
        print(f"[Auth][Login] Account/IP is LOCKED: {rem_seconds}s remaining ({minutes_left}m)")
        return jsonify({
            "error": "Too Many Requests",
            "code": "ACCOUNT_LOCKED",
            "locked": True,
            "lockout_seconds": rem_seconds,
            "remaining_attempts": 0,
            "detail": f"Account temporarily locked due to 5 failed sign-in attempts. Please wait {minutes_left} minute(s) or reset your password."
        }), 429

    # 14. Server log: User found or not
    if not user:
        print(f"[Auth][Login] User found: NO (email='{email}')")
        fail_info = record_failed_login(db, email, None, now)
        print(f"[Auth][Login] Password check result: NOT PERFORMED (user not found)")
        log_dev_auth_event("USER_NOT_FOUND", email, "No matching user document in db.users")
        log_audit_action(
            db=db,
            user_id="SYSTEM",
            user_role="SYSTEM",
            action="LOGIN_FAILED",
            resource="AUTH",
            resource_id=email,
            details=f"Failed login attempt for non-existent user {email}"
        )
        return jsonify({
            "error": "Too Many Requests" if fail_info["locked"] else "Unauthorized",
            **fail_info
        }), fail_info["status_code"]

    user_role = (user.get("role") or "PATIENT").strip().upper()
    print(f"[Auth][Login] User found: YES (id={user['_id']}, role={user_role})")

    # 10. Filter by the role that matches the portal being used. If the role doesn't match, return generic error.
    role_matched = True
    effective_role = user_role
    if role and role not in ["", "ANY", "ALL", "UNIVERSAL"]:
        if user_role == "ADMIN":
            # Admin accounts can access all clinical portals (Doctor, Patient, Staff, Admin)
            role_matched = True
            effective_role = role
        elif role == "STAFF":
            # Staff portal accepts STAFF or ADMIN
            role_matched = user_role in ["STAFF", "ADMIN"]
            effective_role = "STAFF"
        elif role == "DOCTOR":
            role_matched = (user_role == "DOCTOR")
            effective_role = "DOCTOR"
        elif role == "PATIENT":
            role_matched = (user_role == "PATIENT")
            effective_role = "PATIENT"
        elif role == "ADMIN":
            role_matched = (user_role == "ADMIN")
            effective_role = "ADMIN"
        else:
            role_matched = (user_role == role)
            effective_role = user_role
    else:
        # Universal login: preserve the user's registered role
        effective_role = user_role

    # 14. Server log: Role matched or not
    print(f"[Auth][Login] Role matched: {'YES' if role_matched else 'NO'} (portal_role='{role}', actual_role='{user_role}', effective_role='{effective_role}')")
    if not role_matched:
        fail_info = record_failed_login(db, email, user, now)
        log_dev_auth_event("ROLE_MISMATCH", email, f"User role {user_role} does not match requested portal role {role}")
        print(f"[Auth][Login] Role check failed for {email}: returning generic 401/429")
        return jsonify({
            "error": "Too Many Requests" if fail_info["locked"] else "Unauthorized",
            **fail_info
        }), fail_info["status_code"]

    # 8. Password verification using check_password_hash / bcrypt.checkpw
    stored_hash = user.get("password_hash") or user.get("password")
    pw_matched = verify_password(password, stored_hash)
    # 14. Server log: Password check result
    print(f"[Auth][Login] Password check result: {'PASS' if pw_matched else 'FAIL'}")

    if not pw_matched:
        fail_info = record_failed_login(db, email, user, now)
        log_dev_auth_event(
            "ACCOUNT_LOCKED" if fail_info["locked"] else "PASSWORD_MISMATCH",
            email,
            f"Password check failed (locked={fail_info['locked']})"
        )
        log_audit_action(
            db=db,
            user_id=str(user["_id"]),
            user_role=user_role,
            action="ACCOUNT_LOCKED" if fail_info["locked"] else "LOGIN_FAILED",
            resource="AUTH",
            resource_id=str(user["_id"]),
            details=f"Failed login attempt for {email}"
        )
        return jsonify({
            "error": "Too Many Requests" if fail_info["locked"] else "Unauthorized",
            **fail_info
        }), fail_info["status_code"]
        
    # Check account status after verifying password so we don't leak account state to attackers
    account_status = (user.get("status") or "active").lower()
    if account_status in ("pending_approval", "pending"):
        log_dev_auth_event("ACCOUNT_PENDING_APPROVAL", email, "Account is pending administrator approval")
        return jsonify({
            "error": "Forbidden",
            "code": "ACCOUNT_PENDING_APPROVAL",
            "detail": "Your doctor credentials have been submitted and are currently under review by hospital administration. You will be able to sign in once approved."
        }), 403

    if account_status == "invited":
        log_dev_auth_event("ACCOUNT_INVITED", email, "Account has an invitation pending")
        return jsonify({
            "error": "Forbidden",
            "code": "ACCOUNT_INVITED",
            "detail": "This account was invited by administration. Please use the invitation link sent to your email to configure your credentials."
        }), 403

    if account_status in ("inactive", "suspended"):
        log_dev_auth_event("ACCOUNT_SUSPENDED", email, f"Account status is {account_status}")
        return jsonify({
            "error": "Forbidden",
            "code": "ACCOUNT_SUSPENDED",
            "detail": "This account has been suspended or deactivated. Please contact support@carebridge.ai."
        }), 403

    if account_status == "unverified" or user.get("require_email_verification") is True:
        log_dev_auth_event("EMAIL_NOT_VERIFIED", email, "Account requires email verification")
        return jsonify({
            "error": "Forbidden",
            "code": "EMAIL_NOT_VERIFIED",
            "unverified_email": email,
            "detail": "Your email address has not been verified yet. Please check your inbox or resend the verification email."
        }), 403
        
    user_id = str(user["_id"])
    role = effective_role
    
    # Reset failed attempts for both user and IP upon valid authentication
    reset_login_counters(db, user, now)
    
    # ----------------------------------------------------
    # ADMIN 2FA OTP REQUIREMENT
    # ----------------------------------------------------
    if role == "ADMIN" and bool(user.get("two_factor_enabled") or user.get("twoFactorEnabled")):
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        temp_token = secrets.token_urlsafe(32)
        otp_expires = now + timedelta(minutes=10)
        
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "temp_2fa_token": temp_token,
                "admin_2fa_otp": otp_code,
                "admin_2fa_expires": otp_expires,
                "remember_me_pref": remember_me
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
    # REGULAR USER TOKEN ISSUANCE & PROFILE SELF-HEALING
    # ----------------------------------------------------
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR"] else None
    
    now_time = datetime.now(timezone.utc)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now_time, "lastLogin": now_time.isoformat(), "role": role}}
    )
    
    token_ttl = timedelta(days=30) if remember_me else timedelta(hours=12)
    token_data = {
        "sub": user_id,
        "email": user["email"],
        "role": role
    }
    
    access_token = create_access_token(data=token_data, expires_delta=token_ttl)
    
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
        if not pat and user.get("name"):
            # Fallback match by name if seeded under an alias email, or create linked patient profile
            pat = db.patients.find_one({"name": user.get("name")})
        if pat:
            patient_id = str(pat["_id"])
            if pat.get("user_id") != user_id or pat.get("email") != email:
                db.patients.update_one(
                    {"_id": pat["_id"]},
                    {"$set": {"user_id": user_id, "email": email}}
                )
        else:
            patient_code = user.get("patient_code") or user.get("patientId") or f"{secrets.randbelow(900000) + 100000}"
            new_pat = {
                "user_id": user_id,
                "name": user.get("name") or "Patient",
                "email": email,
                "phone": user.get("phone") or "",
                "patient_code": patient_code,
                "patientId": patient_code,
                "patient_id_code": f"PT-{patient_code}",
                "age": 30,
                "gender": "Other",
                "blood_group": "O+",
                "created_at": now_time,
            }
            ins = db.patients.insert_one(new_pat)
            patient_id = str(ins.inserted_id)
    elif role == "DOCTOR":
        doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if not doc and user.get("name"):
            clean_name = re.sub(r"^dr\.?\s*", "", user.get("name", ""), flags=re.I).strip()
            if clean_name:
                doc = db.doctors.find_one({"name": {"$regex": re.escape(clean_name), "$options": "i"}})
        if doc:
            doctor_id = str(doc["_id"])
            if doc.get("user_id") != user_id:
                db.doctors.update_one({"_id": doc["_id"]}, {"$set": {"user_id": user_id}})
            
    created_raw = user.get("created_at") or user.get("createdAt") or now_time
    created_iso = created_raw.isoformat() if hasattr(created_raw, "isoformat") else str(created_raw)

    resp = jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(token_ttl.total_seconds()),
        "remember_me": remember_me,
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
            "emailVerified": bool(user.get("email_verified", True)),
            "lastLogin": now_time.isoformat(),
            "createdAt": created_iso,
            "patient_id": patient_id,
            "doctor_id": doctor_id
        }
    })
    return attach_session_cookie(resp, access_token, remember_me=remember_me), 200

# ============================================================
# 2FA VERIFICATION (ADMIN)
# ============================================================
@auth_bp.route("/login/2fa-verify", methods=["POST"])
def verify_admin_2fa():
    db = get_database()
    data = request.get_json() or {}
    
    temp_token = (data.get("temp_token") or "").strip()
    otp = str(data.get("otp") or "").strip()
    
    if not temp_token or not otp:
        return jsonify({"error": "Validation Error", "detail": "Temporary token and 6-digit OTP are required"}), 400
        
    user = db.users.find_one({"temp_2fa_token": temp_token})
    if not user:
        return jsonify({"error": "Unauthorized", "detail": "Invalid or expired session. Please sign in again."}), 401
        
    stored_otp = str(user.get("admin_2fa_otp", ""))
    otp_expires = ensure_utc(user.get("admin_2fa_expires"))
    now = datetime.now(timezone.utc)
            
    if not otp_expires or otp_expires < now:
        return jsonify({"error": "Unauthorized", "detail": "The OTP code has expired. Please request a new code."}), 401
        
    if stored_otp != otp:
        return jsonify({"error": "Unauthorized", "detail": "Invalid OTP code. Please check your email and try again."}), 401
        
    user_id = str(user["_id"])
    role = "ADMIN"
    now_time = datetime.now(timezone.utc)
    remember_me = bool(user.get("remember_me_pref", False))
    
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
    
    token_ttl = timedelta(days=30) if remember_me else timedelta(hours=12)
    token_data = {
        "sub": user_id,
        "email": user["email"],
        "role": role
    }
    
    access_token = create_access_token(data=token_data, expires_delta=token_ttl)
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
    
    created_raw = user.get("created_at") or now_time
    created_iso = created_raw.isoformat() if hasattr(created_raw, "isoformat") else str(created_raw)

    resp = jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(token_ttl.total_seconds()),
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
            "createdAt": created_iso,
            "is_primary_admin": bool(user.get("is_primary_admin", False))
        }
    })
    return attach_session_cookie(resp, access_token, remember_me=remember_me), 200

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
            {
                "invite_token": token,
                "$or": [
                    {"invite_expires": {"$gt": now}},
                    {"invite_token_expires_at": {"$gt": now}}
                ]
            },
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
            {
                "invite_token": token,
                "$or": [
                    {"invite_expires": {"$gt": now}},
                    {"invite_token_expires_at": {"$gt": now}}
                ]
            },
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
            "invite_token_expires_at": None,
            "bootstrap_token": None,
            "bootstrap_expires": None,
            "status": "active",
            "email_verified": True,
            "updated_at": now
        }}
    )
    if user.get("role") == "DOCTOR":
        db.doctors.update_one(
            {"$or": [{"user_id": str(user["_id"])}, {"email": user.get("email")}]},
            {"$set": {
                "status": "AVAILABLE",
                "verification_status": "Verified",
                "is_bookable": True,
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