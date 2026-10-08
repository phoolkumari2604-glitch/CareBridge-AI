from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.decorators import token_required, admin_required
from app.models.user import create_user_document
from app.services.audit_service import log_audit_action

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    db = get_database()
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    
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
        role="PATIENT",
        phone=phone
    )
    
    result = db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    
    # Auto-create or link patient record
    existing_patient = db.patients.find_one({"email": email})
    if not existing_patient:
        db.patients.insert_one({
            "user_id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "created_at": datetime.now(timezone.utc)
        })
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role="PATIENT",
        action="PATIENT_REGISTERED",
        resource="USER",
        resource_id=user_id,
        details=f"Patient user {email} registered successfully"
    )
    
    return jsonify({
        "id": user_id,
        "name": user_data["name"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data.get("phone")
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
    if not user or not verify_password(password, user.get("password_hash")):
        return jsonify({"error": "Unauthorized", "detail": "Invalid email or password"}), 401
    
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    
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
    if role == "PATIENT":
        patient_doc = db.patients.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": email}
            ]
        })
        if patient_doc:
            patient_id = str(patient_doc["_id"])
        else:
            # Create a corresponding patient record if missing
            res = db.patients.insert_one({
                "user_id": user_id,
                "name": user.get("name"),
                "email": email,
                "phone": user.get("phone"),
                "created_at": datetime.now(timezone.utc)
            })
            patient_id = str(res.inserted_id)
            
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": user["email"],
            "role": role,
            "phone": user.get("phone"),
            "patient_id": patient_id
        }
    }), 200

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    role = user.get("role", "PATIENT")
    
    patient_id = None
    if role == "PATIENT":
        patient_doc = db.patients.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": user.get("email", "").lower()}
            ]
        })
        if patient_doc:
            patient_id = str(patient_doc["_id"])
            
    return jsonify({
        "id": user_id,
        "name": user.get("name"),
        "email": user.get("email"),
        "role": role,
        "phone": user.get("phone"),
        "patient_id": patient_id
    }), 200

@auth_bp.route("/staff", methods=["POST"])
@admin_required
def create_staff():
    db = get_database()
    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    role = data.get("role", "STAFF").upper()
    
    if not name or not email or not password:
        return jsonify({"error": "Validation Error", "detail": "Name, email, and password are required"}), 400
    
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Conflict", "detail": "A user with this email already exists"}), 409
    
    password_hash = hash_password(password)
    user_data = create_user_document(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role if role in ["STAFF", "DOCTOR", "ADMIN"] else "STAFF",
        phone=phone
    )
    
    result = db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    
    log_audit_action(
        db=db,
        user_id=str(g.current_user["_id"]),
        user_role=g.current_user.get("role"),
        action=f"{role}_CREATED",
        resource="USER",
        resource_id=user_id,
        details=f"Staff/Doctor user {email} created"
    )
    
    return jsonify({
        "id": user_id,
        "name": user_data["name"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data.get("phone")
    }), 201