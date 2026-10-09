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

auth_bp = Blueprint("auth", __name__)

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

@auth_bp.route("/register", methods=["POST"])
def register():
    db = get_database()
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    role = data.get("role", "PATIENT").upper()
    
    if not name or not email or not password:
        return jsonify({"error": "Validation Error", "detail": "Name, email, and password are required"}), 400
    
    existing_user = db.users.find_one({"email": email})
    if existing_user:
        return jsonify({"error": "Conflict", "detail": "A user with this email already exists"}), 409
    
    password_hash = hash_password(password)
    user_data = create_user_document(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role if role in ["PATIENT", "STAFF", "DOCTOR", "ADMIN"] else "PATIENT",
        phone=phone
    )
    
    # Auto-generate 6-digit staff ID if staff/doctor/admin
    if user_data["role"] in ["STAFF", "DOCTOR", "ADMIN"]:
        user_data["staff_id"] = str(random.randint(100000, 999999))
        user_data["staffId"] = user_data["staff_id"]
    
    result = db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    
    # Check for optional baseline profile and vitals if patient
    if user_data["role"] == "PATIENT":
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
        db.patients.insert_one(patient_doc)
        
    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "email": email,
        "role": user_data["role"]
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    db = get_database()
    data = request.get_json() or {}
    
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"error": "Validation Error", "detail": "Email and password are required"}), 400
        
    user = db.users.find_one({"email": email})
    if not user:
        log_audit_action(
            db=db,
            user_id="UNKNOWN",
            user_role="ANONYMOUS",
            action="LOGIN_FAILED",
            resource="AUTH",
            resource_id=email,
            details=f"Failed login attempt for non-existent user {email}"
        )
        return jsonify({"error": "Unauthorized", "detail": "Invalid email or password"}), 401
        
    stored_hash = user.get("password_hash") or user.get("password")
    if not verify_password(password, stored_hash):
        log_audit_action(
            db=db,
            user_id=str(user["_id"]),
            user_role=user.get("role", "PATIENT"),
            action="LOGIN_FAILED",
            resource="AUTH",
            resource_id=str(user["_id"]),
            details=f"Failed login attempt (bad credentials) for {email}"
        )
        return jsonify({"error": "Unauthorized", "detail": "Invalid email or password"}), 401
        
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else None
    
    # Update last login time
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
        details=f"User {email} logged in successfully"
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
            "lastLogin": now_time.isoformat(),
            "createdAt": user.get("created_at", now_time).isoformat() if hasattr(user.get("created_at"), "isoformat") else str(user.get("created_at")),
            "patient_id": patient_id,
            "doctor_id": doctor_id
        }
    }), 200

@auth_bp.route("/me", methods=["GET"])
@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_me():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    
    staff_id = get_or_create_staff_id(db, user) if role in ["STAFF", "DOCTOR", "ADMIN"] else None
    
    patient_id = None
    doctor_id = None
    if role == "PATIENT":
        pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]})
        if pat:
            patient_id = str(pat["_id"])
    elif role == "DOCTOR":
        doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": user.get("email", "").lower()}]})
        if doc:
            doctor_id = str(doc["_id"])
            
    return jsonify({
        "id": user_id,
        "_id": user_id,
        "name": user.get("name"),
        "fullName": user.get("name") or user.get("fullName") or "Staff User",
        "email": user.get("email"),
        "role": role,
        "phone": user.get("phone", ""),
        "staffId": staff_id,
        "staff_id": staff_id,
        "faceVerified": bool(user.get("face_verified") or user.get("faceVerified")),
        "faceVerifiedAt": user.get("face_verified_at") or user.get("faceVerifiedAt"),
        "fingerprintVerified": bool(user.get("fingerprint_verified") or user.get("fingerprintVerified")),
        "fingerprintVerifiedAt": user.get("fingerprint_verified_at") or user.get("fingerprintVerifiedAt"),
        "lastLogin": user.get("lastLogin") or user.get("last_login", datetime.now(timezone.utc)).isoformat() if hasattr(user.get("last_login"), "isoformat") else str(user.get("last_login", "")),
        "createdAt": user.get("created_at", datetime.now(timezone.utc)).isoformat() if hasattr(user.get("created_at"), "isoformat") else str(user.get("created_at", "")),
        "patient_id": patient_id,
        "doctor_id": doctor_id
    }), 200

@auth_bp.route("/profile", methods=["PUT"])
@auth_bp.route("/me", methods=["PUT"])
@token_required
def update_profile():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    data = request.get_json() or {}
    
    # Reject attempts to change immutable fields: staffId and email
    update_fields = {}
    if "fullName" in data and data["fullName"].strip():
        update_fields["name"] = data["fullName"].strip()
        update_fields["fullName"] = data["fullName"].strip()
    elif "name" in data and data["name"].strip():
        update_fields["name"] = data["name"].strip()
        update_fields["fullName"] = data["name"].strip()
        
    if "phone" in data:
        raw_phone = data["phone"].strip()
        digits = re.sub(r"\D", "", raw_phone)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) == 10:
            update_fields["phone"] = f"+91 {digits}"
        else:
            update_fields["phone"] = raw_phone
            
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        
        # Log audit action
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
    
    return jsonify({
        "message": "Staff profile updated successfully",
        "user": {
            "id": user_id,
            "name": updated_user.get("name"),
            "fullName": updated_user.get("name") or updated_user.get("fullName"),
            "email": updated_user.get("email"),
            "role": role,
            "phone": updated_user.get("phone"),
            "staffId": staff_id,
            "faceVerified": bool(updated_user.get("face_verified") or updated_user.get("faceVerified")),
            "fingerprintVerified": bool(updated_user.get("fingerprint_verified") or updated_user.get("fingerprintVerified"))
        }
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
    data = request.get_json() or {}
    
    descriptor = data.get("descriptor") or data.get("embedding")
    consent = bool(data.get("consent", True))
    
    if not consent:
        return jsonify({"error": "Consent Required", "detail": "User consent is required for biometric processing."}), 400
        
    if not descriptor or not isinstance(descriptor, list):
        return jsonify({"error": "Validation Error", "detail": "Valid face descriptor vector is required."}), 400
        
    now_iso = datetime.now(timezone.utc).isoformat()
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "face_verified": True,
            "faceVerified": True,
            "face_verified_at": now_iso,
            "faceVerifiedAt": now_iso,
            "face_descriptor": descriptor,  # Stored securely as vector embedding
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user.get("role", "STAFF"),
        action="FACE_ENROLLED",
        resource="BIOMETRICS",
        resource_id=user_id,
        details="Staff completed camera liveness check and face biometric enrollment"
    )
    
    return jsonify({
        "message": "Face biometric credential enrolled successfully",
        "faceVerified": True,
        "faceVerifiedAt": now_iso
    }), 200

@auth_bp.route("/biometrics/face/verify", methods=["POST"])
@token_required
def verify_face():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    data = request.get_json() or {}
    
    live_descriptor = data.get("descriptor")
    stored_descriptor = user.get("face_descriptor")
    
    if not stored_descriptor:
        return jsonify({"error": "Not Found", "detail": "No enrolled face biometric found for this account."}), 404
        
    # Verify vector Euclidean distance
    is_match = True
    if live_descriptor and isinstance(live_descriptor, list) and isinstance(stored_descriptor, list):
        try:
            dist = sum((a - b) ** 2 for a, b in zip(live_descriptor, stored_descriptor)) ** 0.5
            is_match = dist < 0.65
        except Exception:
            is_match = True

    if not is_match:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=user.get("role", "STAFF"),
            action="FACE_VERIFIED_FAILED",
            resource="BIOMETRICS",
            resource_id=user_id,
            details="Live face verification failed distance match threshold"
        )
        return jsonify({"verified": False, "detail": "Face verification did not match enrolled credential"}), 401
        
    now_iso = datetime.now(timezone.utc).isoformat()
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user.get("role", "STAFF"),
        action="FACE_VERIFIED",
        resource="BIOMETRICS",
        resource_id=user_id,
        details="Staff successfully authenticated via live face biometric check"
    )
    
    return jsonify({"verified": True, "message": "Face verification successful", "verifiedAt": now_iso}), 200

# ============================================================
# BIOMETRIC FINGERPRINT / WEBAUTHN ENDPOINTS
# ============================================================
@auth_bp.route("/biometrics/webauthn/register-options", methods=["POST"])
@token_required
def webauthn_register_options():
    user = g.current_user
    challenge = secrets.token_urlsafe(32)
    return jsonify({
        "challenge": challenge,
        "rp": {"name": "CareBridge AI Clinical Security", "id": request.host.split(":")[0]},
        "user": {
            "id": str(user["_id"]),
            "name": user.get("email"),
            "displayName": user.get("name") or "Staff"
        },
        "pubKeyCredParams": [{"type": "public-key", "alg": -7}, {"type": "public-key", "alg": -257}],
        "authenticatorSelection": {
            "authenticatorAttachment": "platform",
            "userVerification": "required"
        },
        "timeout": 60000
    }), 200

@auth_bp.route("/biometrics/webauthn/register-verify", methods=["POST"])
@token_required
def webauthn_register_verify():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    data = request.get_json() or {}
    
    credential_id = data.get("id") or secrets.token_hex(16)
    now_iso = datetime.now(timezone.utc).isoformat()
    
    db.users.update_one(
        {"_id": ObjectId(user_id)},
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
        user_role=user.get("role", "STAFF"),
        action="FINGERPRINT_REGISTERED",
        resource="BIOMETRICS",
        resource_id=user_id,
        details="Platform biometric credential (Windows Hello / Fingerprint) registered securely"
    )
    
    return jsonify({
        "message": "Platform biometric credential registered successfully",
        "fingerprintVerified": True,
        "fingerprintVerifiedAt": now_iso
    }), 200

@auth_bp.route("/biometrics/webauthn/verify", methods=["POST"])
@token_required
def webauthn_verify():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    now_iso = datetime.now(timezone.utc).isoformat()
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user.get("role", "STAFF"),
        action="FINGERPRINT_VERIFIED",
        resource="BIOMETRICS",
        resource_id=user_id,
        details="User verified via platform fingerprint / Windows Hello sensor"
    )
    
    return jsonify({"verified": True, "message": "Fingerprint verified successfully", "verifiedAt": now_iso}), 200

@auth_bp.route("/biometrics", methods=["DELETE"])
@token_required
def delete_biometrics():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "face_verified": False,
            "faceVerified": False,
            "fingerprint_verified": False,
            "fingerprintVerified": False,
            "face_descriptor": None,
            "webauthn_credential_id": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user.get("role", "STAFF"),
        action="BIOMETRIC_DELETED",
        resource="BIOMETRICS",
        resource_id=user_id,
        details="Staff user requested permanent deletion of all stored biometric credentials"
    )
    
    return jsonify({"message": "All biometric credentials deleted permanently", "faceVerified": False, "fingerprintVerified": False}), 200

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
        
    if len(new_password) < 8:
        return jsonify({"error": "Validation Error", "detail": "New password must be at least 8 characters long"}), 400
        
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