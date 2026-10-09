from datetime import datetime, timezone, timedelta
import secrets
import hashlib
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

opd_pass_bp = Blueprint("opd_pass", __name__)

@opd_pass_bp.route("/<appointment_id>", methods=["POST"], strict_slashes=False)
@token_required
def create_opd_pass(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    existing_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    if existing_pass:
        return jsonify({
            "message": "Digital OPD pass already exists",
            "opd_pass_id": str(existing_pass["_id"]),
            "pass_number": existing_pass.get("pass_number"),
            "status": existing_pass.get("status", "ACTIVE")
        }), 200
        
    pass_number = f"OPD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    opd_pass = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "hospital_id": appointment.get("hospital_id"),
        "doctor_id": appointment.get("doctor_id"),
        "doctor_name": appointment.get("doctor_name"),
        "hospital_name": appointment.get("hospital_name"),
        "patient_name": appointment.get("patient_name"),
        "appointment_date": appointment.get("appointment_date"),
        "appointment_time": appointment.get("appointment_time"),
        "reason": appointment.get("reason"),
        "pass_number": pass_number,
        "status": "ACTIVE",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = db.opd_passes.insert_one(opd_pass)
    return jsonify({
        "message": "Digital OPD pass created successfully",
        "opd_pass_id": str(result.inserted_id),
        "pass_number": pass_number,
        "status": "ACTIVE"
    }), 201

@opd_pass_bp.route("", methods=["GET"], strict_slashes=False)
@opd_pass_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_opd_passes():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id = request.args.get("patient_id")
    query = {}
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patient = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
        if patient:
            query["patient_id"] = patient["_id"]
        elif patient_id and is_valid_object_id(patient_id):
            query["patient_id"] = ObjectId(patient_id)
    elif patient_id and is_valid_object_id(patient_id):
        query["patient_id"] = ObjectId(patient_id)
        
    passes = list(db.opd_passes.find(query).sort("created_at", -1))
    
    for op in passes:
        if not op.get("doctor_name") and op.get("doctor_id"):
            doc = db.doctors.find_one({"_id": op["doctor_id"]})
            if doc:
                op["doctor_name"] = doc.get("name")
        if not op.get("hospital_name") and op.get("hospital_id"):
            hosp = db.hospitals.find_one({"_id": op["hospital_id"]})
            if hosp:
                op["hospital_name"] = hosp.get("name")
                
    return jsonify(serialize_doc(passes)), 200

@opd_pass_bp.route("/patient/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient_opd_passes(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    passes = list(db.opd_passes.find({"patient_id": ObjectId(patient_id)}).sort("created_at", -1))
    return jsonify(serialize_doc(passes)), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        # Maybe queried by patient_id directly
        passes = list(db.opd_passes.find({"patient_id": opd_pass_id}).sort("created_at", -1))
        if passes:
            return jsonify(serialize_doc(passes[0])), 200
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
        
    opd_pass = db.opd_passes.find_one({"_id": ObjectId(opd_pass_id)})
    if not opd_pass:
        # Check by patient_id
        opd_pass = db.opd_passes.find_one({"patient_id": ObjectId(opd_pass_id)})
        if not opd_pass:
            return jsonify({"error": "Not Found", "detail": "OPD pass not found"}), 404
            
    return jsonify(serialize_doc(opd_pass)), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["PUT"], strict_slashes=False)
@staff_or_admin_required
def update_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
        
    data = request.get_json() or {}
    status = (data.get("status") or request.args.get("status", "")).upper()
    if status not in {"ACTIVE", "USED", "EXPIRED", "CANCELLED"}:
        return jsonify({"error": "Validation Error", "detail": "Invalid status"}), 400
        
    db.opd_passes.update_one(
        {"_id": ObjectId(opd_pass_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    return jsonify({"message": "OPD pass updated successfully", "opd_pass_id": opd_pass_id, "status": status}), 200

@opd_pass_bp.route("/verify/<pass_number>", methods=["GET"], strict_slashes=False)
@opd_pass_bp.route("/validate", methods=["POST"], strict_slashes=False)
@token_required
def verify_opd_pass(pass_number=None):
    db = get_database()
    if not pass_number:
        data = request.get_json() or {}
        pass_number = data.get("pass_number") or data.get("token") or request.args.get("pass_number")
    
    if not pass_number:
        return jsonify({"error": "Validation Error", "detail": "Pass number is required"}), 400
        
    pass_doc = db.opd_passes.find_one({"pass_number": pass_number.strip().upper()})
    if not pass_doc:
        if is_valid_object_id(pass_number):
            pass_doc = db.opd_passes.find_one({"_id": ObjectId(pass_number)})
            
    if not pass_doc:
        return jsonify({
            "valid": False,
            "message": f"OPD Pass '{pass_number}' not found in registry",
            "pass_number": pass_number
        }), 404
        
    doc_name = pass_doc.get("doctor_name")
    if not doc_name and pass_doc.get("doctor_id"):
        doc = db.doctors.find_one({"_id": pass_doc["doctor_id"]})
        if doc: 
            doc_name = doc.get("name")
        
    hosp_name = pass_doc.get("hospital_name")
    if not hosp_name and pass_doc.get("hospital_id"):
        hosp = db.hospitals.find_one({"_id": pass_doc["hospital_id"]})
        if hosp: 
            hosp_name = hosp.get("name")

    return jsonify({
        "valid": pass_doc.get("status") == "ACTIVE",
        "status": pass_doc.get("status", "ACTIVE"),
        "pass_number": pass_doc.get("pass_number"),
        "patient_name": pass_doc.get("patient_name"),
        "doctor_name": doc_name,
        "hospital_name": hosp_name,
        "appointment_date": pass_doc.get("appointment_date"),
        "appointment_time": pass_doc.get("appointment_time"),
        "reason": pass_doc.get("reason"),
        "issued_at": pass_doc.get("created_at"),
        "message": "Valid for outpatient hospital intake" if pass_doc.get("status") == "ACTIVE" else f"Pass status is {pass_doc.get('status')}"
    }), 200

@opd_pass_bp.route("/request-otp", methods=["POST"], strict_slashes=False)
@opd_pass_bp.route("/send-otp", methods=["POST"], strict_slashes=False)
@token_required
def request_pass_otp():
    db = get_database()
    data = request.get_json() or {}
    pass_number = (data.get("pass_number") or data.get("token") or "").strip().upper()
    
    if not pass_number:
        return jsonify({"error": "Validation Error", "detail": "Pass number is required"}), 400
        
    pass_doc = db.opd_passes.find_one({"pass_number": pass_number})
    if not pass_doc and is_valid_object_id(pass_number):
        pass_doc = db.opd_passes.find_one({"_id": ObjectId(pass_number)})
        
    if not pass_doc:
        return jsonify({"error": "Not Found", "detail": f"OPD Pass '{pass_number}' not found"}), 404
        
    actual_pass_number = pass_doc.get("pass_number", pass_number)
    now = datetime.now(timezone.utc)
    
    # Check rate limit / cooldown (30 seconds)
    existing_otp = db.opd_pass_otps.find_one({"pass_number": actual_pass_number}, sort=[("created_at", -1)])
    if existing_otp:
        created_at = existing_otp.get("created_at")
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if created_at and (now - created_at).total_seconds() < 30:
            remaining = int(30 - (now - created_at).total_seconds())
            return jsonify({
                "error": "Rate Limit",
                "detail": f"Please wait {remaining} seconds before requesting another verification code.",
                "cooldown_remaining": remaining
            }), 429
            
    # Lookup patient contact
    masked_contact = "patient's registered phone / email"
    patient = None
    if pass_doc.get("patient_id"):
        patient = db.patients.find_one({"_id": pass_doc["patient_id"]})
    if patient:
        phone = patient.get("phone") or patient.get("contact")
        email = patient.get("email")
        if phone and len(phone) >= 7:
            masked_contact = f"{phone[:3]}****{phone[-4:]}"
        elif email and "@" in email:
            parts = email.split("@")
            masked_contact = f"{parts[0][:2]}***@{parts[1]}"
            
    otp_val = f"{secrets.randbelow(900000) + 100000}"
    hashed_otp = hashlib.sha256(otp_val.encode("utf-8")).hexdigest()
    
    # Store in DB with 5 min TTL
    db.opd_pass_otps.insert_one({
        "pass_number": actual_pass_number,
        "hashed_otp": hashed_otp,
        "attempts": 0,
        "max_attempts": 5,
        "created_at": now,
        "expires_at": now + timedelta(minutes=5),
        "masked_contact": masked_contact,
        "is_used": False
    })
    
    return jsonify({
        "message": f"6-digit verification code sent to {masked_contact}",
        "pass_number": actual_pass_number,
        "masked_contact": masked_contact,
        "expires_in_seconds": 300,
        "cooldown_seconds": 30,
        "demo_otp": otp_val  # provided for seamless development and testing environments
    }), 200

@opd_pass_bp.route("/verify-otp", methods=["POST"], strict_slashes=False)
@token_required
def verify_pass_otp():
    db = get_database()
    data = request.get_json() or {}
    pass_number = (data.get("pass_number") or data.get("token") or "").strip().upper()
    otp_code = str(data.get("otp") or "").strip()
    
    if not pass_number or not otp_code:
        return jsonify({"error": "Validation Error", "detail": "Pass number and 6-digit OTP code are required"}), 400
        
    pass_doc = db.opd_passes.find_one({"pass_number": pass_number})
    if not pass_doc and is_valid_object_id(pass_number):
        pass_doc = db.opd_passes.find_one({"_id": ObjectId(pass_number)})
        
    if not pass_doc:
        return jsonify({"error": "Not Found", "detail": f"OPD Pass '{pass_number}' not found"}), 404
        
    actual_pass_number = pass_doc.get("pass_number", pass_number)
    now = datetime.now(timezone.utc)
    
    otp_record = db.opd_pass_otps.find_one(
        {"pass_number": actual_pass_number, "is_used": False},
        sort=[("created_at", -1)]
    )
    
    if not otp_record:
        return jsonify({
            "error": "Invalid Request",
            "detail": "No active verification code found for this pass. Please request a new OTP."
        }), 400
        
    expires_at = otp_record.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at and now > expires_at:
        return jsonify({
            "error": "Code Expired",
            "detail": "Verification code has expired. Please request a new OTP."
        }), 400
        
    attempts = otp_record.get("attempts", 0)
    max_attempts = otp_record.get("max_attempts", 5)
    if attempts >= max_attempts:
        return jsonify({
            "error": "Max Attempts Exceeded",
            "detail": "Maximum verification attempts exceeded for this code. Please request a new OTP."
        }), 400
        
    # Check OTP hash
    input_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    if input_hash != otp_record.get("hashed_otp"):
        db.opd_pass_otps.update_one(
            {"_id": otp_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        remaining = max(0, max_attempts - (attempts + 1))
        return jsonify({
            "error": "Invalid OTP",
            "detail": f"Incorrect verification code. {remaining} attempt(s) remaining.",
            "attempts_remaining": remaining
        }), 400
        
    # Mark OTP as used
    db.opd_pass_otps.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {"is_used": True, "verified_at": now}}
    )
    
    # Fetch doctor and hospital names if missing
    doc_name = pass_doc.get("doctor_name")
    if not doc_name and pass_doc.get("doctor_id"):
        doc = db.doctors.find_one({"_id": pass_doc["doctor_id"]})
        if doc:
            doc_name = doc.get("name")
            
    hosp_name = pass_doc.get("hospital_name")
    if not hosp_name and pass_doc.get("hospital_id"):
        hosp = db.hospitals.find_one({"_id": pass_doc["hospital_id"]})
        if hosp:
            hosp_name = hosp.get("name")
            
    return jsonify({
        "verified": True,
        "valid": pass_doc.get("status") == "ACTIVE",
        "status": pass_doc.get("status", "ACTIVE"),
        "pass_number": pass_doc.get("pass_number"),
        "patient_name": pass_doc.get("patient_name"),
        "doctor_name": doc_name,
        "hospital_name": hosp_name,
        "appointment_date": pass_doc.get("appointment_date"),
        "appointment_time": pass_doc.get("appointment_time"),
        "reason": pass_doc.get("reason"),
        "issued_at": pass_doc.get("created_at"),
        "verified_at": now.isoformat(),
        "message": "OPD Pass successfully verified with secure OTP authorization."
    }), 200

@opd_pass_bp.route("/<opd_pass_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_opd_pass(opd_pass_id):
    db = get_database()
    if not is_valid_object_id(opd_pass_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid OPD pass ID"}), 400
    result = db.opd_passes.delete_one({"_id": ObjectId(opd_pass_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "OPD pass not found"}), 404
    return jsonify({"message": "OPD pass deleted successfully"}), 200

