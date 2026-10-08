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
    
    # Check for optional baseline profile and vitals
    age = data.get("age")
    gender = data.get("gender")
    blood_group = data.get("blood_group")
    emergency_contact = data.get("emergency_contact")
    allergies = data.get("allergies", [])
    if isinstance(allergies, str):
        allergies = [a.strip() for a in allergies.split(",") if a.strip()]
    medical_history = data.get("medical_history", [])
    if isinstance(medical_history, str):
        medical_history = [m.strip() for m in medical_history.split(",") if m.strip()]
    
    # Auto-create or link patient record
    patient_doc = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "phone": phone,
        "age": int(age) if age is not None and str(age).isdigit() else None,
        "gender": gender,
        "blood_group": blood_group,
        "emergency_contact": emergency_contact,
        "allergies": allergies,
        "medical_history": medical_history,
        "created_at": datetime.now(timezone.utc)
    }
    
    p_res = db.patients.insert_one(patient_doc)
    patient_id = str(p_res.inserted_id)
    
    # If initial vitals were provided, record baseline vitals
    has_vitals = any(data.get(k) for k in ["heart_rate", "systolic_bp", "diastolic_bp", "spo2", "temperature", "weight", "height", "blood_sugar"])
    if has_vitals:
        def to_float_or_none(v):
            try:
                return float(v) if v is not None and str(v).strip() != "" else None
            except (ValueError, TypeError):
                return None
                
        def to_int_or_none(v):
            try:
                return int(v) if v is not None and str(v).strip() != "" else None
            except (ValueError, TypeError):
                return None

        hr = to_int_or_none(data.get("heart_rate")) or 72
        sys_bp = to_int_or_none(data.get("systolic_bp")) or 120
        dia_bp = to_int_or_none(data.get("diastolic_bp")) or 80
        spo2_val = to_float_or_none(data.get("spo2")) or 98.0
        temp_val = to_float_or_none(data.get("temperature")) or 36.8
        weight_val = to_float_or_none(data.get("weight"))
        height_val = to_float_or_none(data.get("height"))
        sugar_val = to_float_or_none(data.get("blood_sugar"))
        
        status = "NORMAL"
        if (hr < 50 or hr > 110) or (sys_bp >= 140 or sys_bp < 90) or (spo2_val < 94):
            status = "ATTENTION"
        
        db.vital_signs.insert_one({
            "patient_id": ObjectId(patient_id),
            "heart_rate": hr,
            "systolic_bp": sys_bp,
            "diastolic_bp": dia_bp,
            "spo2": spo2_val,
            "temperature": temp_val,
            "weight": weight_val,
            "height": height_val,
            "blood_sugar": sugar_val,
            "status": status,
            "notes": "Baseline vitals captured during registration",
            "recorded_at": datetime.now(timezone.utc)
        })
    
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role="PATIENT",
        action="PATIENT_REGISTERED",
        resource="USER",
        resource_id=user_id,
        details=f"Patient user {email} registered successfully with initial profile"
    )
    
    return jsonify({
        "id": user_id,
        "name": user_data["name"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data.get("phone"),
        "patient_id": patient_id
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
    doctor_id = None
    
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
            res = db.patients.insert_one({
                "user_id": user_id,
                "name": user.get("name"),
                "email": email,
                "phone": user.get("phone"),
                "created_at": datetime.now(timezone.utc)
            })
            patient_id = str(res.inserted_id)
    elif role == "DOCTOR":
        doctor_doc = db.doctors.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": email},
                {"name": user.get("name")}
            ]
        })
        if doctor_doc:
            doctor_id = str(doctor_doc["_id"])
        else:
            doc_res = db.doctors.insert_one({
                "user_id": user_id,
                "name": user.get("name"),
                "email": email,
                "phone": user.get("phone"),
                "specialty": "Cardiology & Internal Medicine",
                "department": "Cardiovascular Sciences",
                "hospital": "CareBridge Multi-Specialty Hospital",
                "available_slots": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"],
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                "status": "AVAILABLE",
                "created_at": datetime.now(timezone.utc)
            })
            doctor_id = str(doc_res.inserted_id)
            
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": user["email"],
            "role": role,
            "phone": user.get("phone"),
            "patient_id": patient_id,
            "doctor_id": doctor_id
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
    doctor_id = None
    if role == "PATIENT":
        patient_doc = db.patients.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": user.get("email", "").lower()}
            ]
        })
        if patient_doc:
            patient_id = str(patient_doc["_id"])
    elif role == "DOCTOR":
        doctor_doc = db.doctors.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": user.get("email", "").lower()},
                {"name": user.get("name")}
            ]
        })
        if doctor_doc:
            doctor_id = str(doctor_doc["_id"])
        else:
            doc_res = db.doctors.insert_one({
                "user_id": user_id,
                "name": user.get("name"),
                "email": user.get("email"),
                "phone": user.get("phone"),
                "specialty": "General Medicine",
                "department": "Outpatient Care",
                "hospital": "CareBridge Multi-Specialty Hospital",
                "available_slots": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"],
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                "status": "AVAILABLE",
                "created_at": datetime.now(timezone.utc)
            })
            doctor_id = str(doc_res.inserted_id)
            
    return jsonify({
        "id": user_id,
        "name": user.get("name"),
        "email": user.get("email"),
        "role": role,
        "phone": user.get("phone"),
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
    
    update_fields = {}
    if "name" in data and data["name"].strip():
        update_fields["name"] = data["name"].strip()
    if "phone" in data:
        update_fields["phone"] = data["phone"].strip()
        
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc)
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        
        # Sync to patient or doctor collection
        if role == "PATIENT":
            db.patients.update_many(
                {"$or": [{"user_id": user_id}, {"email": user.get("email")}]},
                {"$set": update_fields}
            )
        elif role == "DOCTOR":
            db.doctors.update_many(
                {"$or": [{"user_id": user_id}, {"email": user.get("email")}]},
                {"$set": update_fields}
            )
            
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    return jsonify({
        "message": "Profile updated successfully",
        "user": {
            "id": user_id,
            "name": updated_user.get("name"),
            "email": updated_user.get("email"),
            "role": role,
            "phone": updated_user.get("phone")
        }
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
    
    if role == "DOCTOR":
        db.doctors.insert_one({
            "user_id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "specialty": data.get("specialty", "General Medicine"),
            "department": data.get("department", "Outpatient"),
            "hospital": data.get("hospital", "CareBridge Central Hospital"),
            "available_slots": data.get("available_slots", ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"]),
            "available_days": data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
            "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc)
        })
    
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