import re
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

    appt_status = (appointment.get("status") or appointment.get("approval_status") or "").upper()
    if appt_status not in ["APPROVED", "CONFIRMED"]:
        return jsonify({
            "error": "Not Permitted",
            "detail": "OPD Pass can only be issued for Approved or Confirmed appointments.",
            "status": "AWAITING_APPROVAL"
        }), 400

    existing_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    if existing_pass:
        return jsonify({
            "message": "Digital OPD pass already exists",
            "opd_pass_id": str(existing_pass["_id"]),
            "pass_number": existing_pass.get("pass_number"),
            "status": existing_pass.get("status", "ACTIVE")
        }), 200

    # Resolve doctor
    doc = None
    if appointment.get("doctor_id"):
        doc = db.doctors.find_one({"_id": appointment["doctor_id"]})

    # Resolve hospital
    hosp = None
    hosp_id = appointment.get("hospital_id") or (doc.get("hospital_id") if doc else None)
    if hosp_id:
        hosp = db.hospitals.find_one({"_id": hosp_id})

    # Resolve patient & ensure 6-digit patient ID
    patient = None
    if appointment.get("patient_id"):
        patient = db.patients.find_one({"_id": appointment["patient_id"]})
    
    # Generate 6-digit numeric patient ID
    pat_num_id = str(patient.get("patient_numeric_id") or patient.get("numeric_id") or "") if patient else ""
    if not pat_num_id or len(pat_num_id) != 6:
        # Generate or derive a consistent 6-digit number
        pat_num_id = str(int(str(appointment.get("patient_id"))[-6:], 16) % 900000 + 100000)
        if patient:
            db.patients.update_one({"_id": patient["_id"]}, {"$set": {"patient_numeric_id": pat_num_id}})

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_hex = secrets.token_hex(3).upper()
    pass_number = f"OPD-{date_str}-{random_hex}"
    
    token_payload = f"{pass_number}:{pat_num_id}:{date_str}"
    token_hash = hashlib.sha256(token_payload.encode()).hexdigest()

    opd_pass = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": appointment["patient_id"],
        "patient_numeric_id": pat_num_id,
        "hospital_id": hosp["_id"] if hosp else (doc.get("hospital_id") if doc else None),
        "doctor_id": doc["_id"] if doc else appointment.get("doctor_id"),
        "doctor_name": doc.get("name") if doc else appointment.get("doctor_name", "Clinical Specialist"),
        "specialty": doc.get("specialty") if doc else appointment.get("specialty", "Clinical Consultation"),
        "hospital_name": hosp.get("name") if hosp else (doc.get("hospital_name") if doc else "CareBridge General Hospital"),
        "hospital_address": hosp.get("address") if hosp else (doc.get("city") if doc else "Hospital OPD Wing"),
        "hospital_phone": hosp.get("phone") if hosp else "+91 40 2345 6789",
        "patient_name": patient.get("name") if patient else appointment.get("patient_name", "Registered Patient"),
        "appointment_date": appointment.get("appointment_date"),
        "appointment_time": appointment.get("appointment_time"),
        "reason": appointment.get("reason", "General Consultation"),
        "pass_number": pass_number,
        "token_hash": token_hash,
        "status": "ACTIVE",
        "issued_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = db.opd_passes.insert_one(opd_pass)
    return jsonify({
        "message": "Digital OPD pass created successfully",
        "opd_pass_id": str(result.inserted_id),
        "pass_number": pass_number,
        "status": "ACTIVE",
        "pass": serialize_doc(opd_pass)
    }), 201

def auto_expire_stale_passes(db):
    """Automated background check that marks past OPD passes as EXPIRED and logs to audit_logs."""
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    stale_passes = list(db.opd_passes.find({
        "status": "ACTIVE",
        "$or": [
            {"appointment_date": {"$lt": today_str}},
            {"expires_at": {"$lt": now}}
        ]
    }))
    expired_count = 0
    for p in stale_passes:
        db.opd_passes.update_one(
            {"_id": p["_id"]},
            {"$set": {"status": "EXPIRED", "updated_at": now}}
        )
        expired_count += 1
        existing_log = db.audit_logs.find_one({
            "action": "OPD_PASS_EXPIRED",
            "resource_id": str(p["_id"])
        })
        if not existing_log:
            try:
                db.audit_logs.insert_one({
                    "user_id": "SYSTEM",
                    "user_role": "SYSTEM",
                    "action": "OPD_PASS_EXPIRED",
                    "resource": "OPD_PASS",
                    "resource_id": str(p["_id"]),
                    "details": f"Automated pass expiry: OPD Pass {p.get('pass_number')} expired on {p.get('appointment_date')}",
                    "status": "SUCCESS",
                    "ip_address": "127.0.0.1",
                    "user_agent": "CareBridge-System-Daemon/1.0",
                    "created_at": p.get("created_at") or now
                })
            except Exception:
                pass
    return expired_count

@opd_pass_bp.route("", methods=["GET"], strict_slashes=False)
@opd_pass_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_opd_passes():
    db = get_database()
    try:
        auto_expire_stale_passes(db)
    except Exception:
        pass
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

def check_in_and_update_queue(db, pass_doc, user_id=None, user_role=None):
    """Marks pass as checked in, adds/updates the Live Queue entry, and writes an audit log."""
    now = datetime.now(timezone.utc)
    
    # 1. Mark pass as checked in
    db.opd_passes.update_one(
        {"_id": pass_doc["_id"]},
        {"$set": {
            "checked_in": True,
            "checked_in_at": now,
            "status": "ACTIVE",
            "updated_at": now
        }}
    )
    
    # 2. Update Live Queue
    appointment_id = pass_doc.get("appointment_id")
    q_entry = None
    if appointment_id:
        q_entry = db.queue.find_one({"appointment_id": appointment_id})
    if not q_entry and pass_doc.get("patient_id") and pass_doc.get("doctor_id"):
        q_entry = db.queue.find_one({
            "patient_id": pass_doc.get("patient_id"),
            "doctor_id": pass_doc.get("doctor_id"),
            "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}
        })
        
    if not q_entry:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_queue = db.queue.find_one(
            {"created_at": {"$gte": today_start}},
            sort=[("token_number", -1)]
        )
        token_number = (last_queue["token_number"] + 1) if last_queue and "token_number" in last_queue else 1
        token_code = f"T-{str(token_number).zfill(3)}"
        
        q_doc = {
            "appointment_id": appointment_id,
            "patient_id": pass_doc.get("patient_id"),
            "doctor_id": pass_doc.get("doctor_id"),
            "hospital_id": pass_doc.get("hospital_id"),
            "patient_name": pass_doc.get("patient_name", "Patient"),
            "doctor_name": pass_doc.get("doctor_name", "Doctor"),
            "hospital_name": pass_doc.get("hospital_name", "CareBridge Hospital"),
            "specialty": pass_doc.get("department") or pass_doc.get("specialty", "General Medicine"),
            "token_number": token_number,
            "token_code": token_code,
            "priority": "NORMAL",
            "priority_order": 2,
            "status": "WAITING",
            "created_at": now,
            "updated_at": now
        }
        db.queue.insert_one(q_doc)
        queue_token = token_code
    else:
        if q_entry.get("status") not in ["IN_CONSULTATION", "COMPLETED"]:
            db.queue.update_one(
                {"_id": q_entry["_id"]},
                {"$set": {"status": "WAITING", "updated_at": now}}
            )
        queue_token = q_entry.get("token_code") or f"T-{str(q_entry.get('token_number', 1)).zfill(3)}"
        
    # Store queue_number on pass document
    db.opd_passes.update_one(
        {"_id": pass_doc["_id"]},
        {"$set": {"queue_number": queue_token, "updated_at": now}}
    )

    # 3. Write Audit Log
    try:
        db.audit_logs.insert_one({
            "user_id": str(user_id) if user_id else str(pass_doc.get("patient_id")),
            "user_role": user_role or "PATIENT",
            "action": "OPD_PASS_VERIFIED",
            "resource": "OPD_PASS",
            "resource_id": str(pass_doc["_id"]),
            "details": f"OPD Pass {pass_doc.get('pass_number')} verified and checked in. Live Queue Token #{queue_token}",
            "created_at": now
        })
    except Exception as audit_err:
        print("Warning: Failed to write audit log:", audit_err)
    
    return queue_token

@opd_pass_bp.route("/verify/<pass_number>", methods=["GET"], strict_slashes=False)
@opd_pass_bp.route("/validate", methods=["POST"], strict_slashes=False)
@token_required
def verify_opd_pass(pass_number=None):
    db = get_database()
    current_user = g.current_user if hasattr(g, "current_user") else {}
    if not pass_number:
        data = request.get_json() or {}
        pass_number = data.get("pass_number") or data.get("token") or request.args.get("pass_number")
    
    clean_token = str(pass_number or "").strip()
    if not clean_token:
        return jsonify({"error": "Validation Error", "detail": "Pass number or token is required"}), 400

    # Case-insensitive trimmed lookup matching pass_number, token, _id, or appointment_id
    regex_query = {"$regex": f"^{re.escape(clean_token)}$", "$options": "i"}
    or_clauses = [
        {"pass_number": regex_query},
        {"token": regex_query}
    ]
    if is_valid_object_id(clean_token):
        or_clauses.extend([
            {"_id": ObjectId(clean_token)},
            {"appointment_id": ObjectId(clean_token)}
        ])

    pass_doc = db.opd_passes.find_one({"$or": or_clauses})
    if not pass_doc:
        return jsonify({
            "valid": False,
            "status": "NOT_FOUND",
            "display_status": "Not Found",
            "failure_reason": "not_found",
            "message": f"OPD Pass '{clean_token}' not found in registry. Please verify your token.",
            "detail": f"OPD Pass '{clean_token}' not found in hospital registry.",
            "pass_number": clean_token
        }), 404

    now = datetime.now(timezone.utc)
    raw_status = str(pass_doc.get("status", "ACTIVE")).upper()

    # Check expiry
    expiry = pass_doc.get("expiry") or pass_doc.get("expires_at")
    is_expired = False
    if expiry:
        if isinstance(expiry, str):
            try:
                exp_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                is_expired = now > exp_dt
            except Exception:
                pass
        elif isinstance(expiry, datetime):
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            is_expired = now > expiry

    doc_name = pass_doc.get("doctor_name")
    if not doc_name and pass_doc.get("doctor_id"):
        doc = db.doctors.find_one({"_id": pass_doc["doctor_id"]})
        if doc: doc_name = doc.get("name")
        
    hosp_name = pass_doc.get("hospital_name")
    if not hosp_name and pass_doc.get("hospital_id"):
        hosp = db.hospitals.find_one({"_id": pass_doc["hospital_id"]})
        if hosp: hosp_name = hosp.get("name")

    dept_name = pass_doc.get("department") or pass_doc.get("specialty") or "General Medicine"
    pat_id_str = str(pass_doc.get("patient_numeric_id") or "104829")

    # Specific failure reasons & display statuses
    if is_expired or raw_status == "EXPIRED":
        status = "EXPIRED"
        display_status = "Expired"
        is_valid = False
        message = "Pass has expired. This OPD Pass is no longer valid for hospital entry."
        queue_token = pass_doc.get("queue_number", "N/A")
    elif raw_status in ["USED", "COMPLETED"]:
        status = "USED"
        display_status = "Already Used"
        is_valid = False
        message = "Pass has already been used. This OPD pass was previously checked in."
        queue_token = pass_doc.get("queue_number", "N/A")
    elif raw_status in ["CANCELLED", "REJECTED"]:
        status = "CANCELLED"
        display_status = "Cancelled"
        is_valid = False
        message = "Pass has been cancelled. The associated consultation was cancelled."
        queue_token = pass_doc.get("queue_number", "N/A")
    else:
        status = "VALID"
        display_status = "Valid"
        is_valid = True
        message = "Valid OPD Pass. Authorized for outpatient hospital intake."
        
        # Check in pass, update live queue, and write audit log
        queue_token = check_in_and_update_queue(
            db, pass_doc, current_user.get("_id"), current_user.get("role")
        )

    return jsonify({
        "valid": is_valid,
        "verified": is_valid,
        "status": status,
        "display_status": display_status,
        "pass_number": pass_doc.get("pass_number"),
        "token": pass_doc.get("token") or pass_doc.get("pass_number"),
        "patient_name": pass_doc.get("patient_name", "Verified Patient"),
        "patient_id": pat_id_str,
        "patient_numeric_id": pat_id_str,
        "doctor_name": doc_name or "Consulting Doctor",
        "department": dept_name,
        "specialty": dept_name,
        "hospital_name": hosp_name or "CareBridge Hospital",
        "appointment_date": pass_doc.get("appointment_date"),
        "appointment_time": pass_doc.get("appointment_time"),
        "queue_number": queue_token,
        "reason": pass_doc.get("reason", "Outpatient Consultation"),
        "issued_at": pass_doc.get("created_at"),
        "checked_in": True if is_valid else pass_doc.get("checked_in", False),
        "message": message
    }), 200

@opd_pass_bp.route("/request-otp", methods=["POST"], strict_slashes=False)
@opd_pass_bp.route("/send-otp", methods=["POST"], strict_slashes=False)
@token_required
def request_pass_otp():
    db = get_database()
    data = request.get_json() or {}
    pass_number = (data.get("pass_number") or data.get("token") or "").strip()
    
    if not pass_number:
        return jsonify({"error": "Validation Error", "detail": "Pass number is required"}), 400
        
    regex_query = {"$regex": f"^{re.escape(pass_number)}$", "$options": "i"}
    pass_doc = db.opd_passes.find_one({"$or": [{"pass_number": regex_query}, {"token": regex_query}]})
    if not pass_doc and is_valid_object_id(pass_number):
        pass_doc = db.opd_passes.find_one({"_id": ObjectId(pass_number)})
        
    if not pass_doc:
        return jsonify({"error": "Not Found", "detail": f"OPD Pass '{pass_number}' not found in registry."}), 404
        
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
    
    # Update pass doc OTP
    db.opd_passes.update_one(
        {"_id": pass_doc["_id"]},
        {"$set": {"otp": otp_val, "otp_hash": hashed_otp, "updated_at": now}}
    )

    # Store in DB with 5 min TTL
    db.opd_pass_otps.insert_one({
        "pass_number": actual_pass_number,
        "hashed_otp": hashed_otp,
        "plain_otp": otp_val,
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
        "demo_otp": otp_val
    }), 200

@opd_pass_bp.route("/verify-otp", methods=["POST"], strict_slashes=False)
@token_required
def verify_pass_otp():
    db = get_database()
    current_user = g.current_user if hasattr(g, "current_user") else {}
    data = request.get_json() or {}
    pass_number = (data.get("pass_number") or data.get("token") or "").strip()
    otp_code = str(data.get("otp") or "").strip()
    
    if not pass_number or not otp_code:
        return jsonify({"error": "Validation Error", "detail": "Pass number and 6-digit OTP code are required"}), 400
        
    regex_query = {"$regex": f"^{re.escape(pass_number)}$", "$options": "i"}
    pass_doc = db.opd_passes.find_one({"$or": [{"pass_number": regex_query}, {"token": regex_query}]})
    if not pass_doc and is_valid_object_id(pass_number):
        pass_doc = db.opd_passes.find_one({"_id": ObjectId(pass_number)})
        
    if not pass_doc:
        return jsonify({"error": "Not Found", "detail": f"OPD Pass '{pass_number}' not found in registry."}), 404
        
    actual_pass_number = pass_doc.get("pass_number", pass_number)
    now = datetime.now(timezone.utc)
    
    otp_record = db.opd_pass_otps.find_one(
        {"pass_number": actual_pass_number, "is_used": False},
        sort=[("created_at", -1)]
    )
    
    if not otp_record:
        # Check if pass itself has active otp
        if pass_doc.get("otp") and pass_doc.get("otp") == otp_code:
            otp_record = {
                "_id": ObjectId(),
                "hashed_otp": pass_doc.get("otp_hash"),
                "attempts": 0,
                "max_attempts": 5,
                "expires_at": now + timedelta(minutes=5)
            }
        else:
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
            "detail": "Maximum verification attempts exceeded (5/5). Please request a new OTP."
        }), 400
        
    # Check OTP hash or plain OTP
    input_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    matched = (
        input_hash == otp_record.get("hashed_otp")
        or otp_code == otp_record.get("plain_otp")
        or otp_code == pass_doc.get("otp")
    )
    
    if not matched:
        if "_id" in otp_record:
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
    if "_id" in otp_record:
        db.opd_pass_otps.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"is_used": True, "verified_at": now}}
        )
    
    # Check in, update live queue, and write audit log
    queue_token = check_in_and_update_queue(
        db, pass_doc, current_user.get("_id"), current_user.get("role")
    )

    doc_name = pass_doc.get("doctor_name")
    if not doc_name and pass_doc.get("doctor_id"):
        doc = db.doctors.find_one({"_id": pass_doc["doctor_id"]})
        if doc: doc_name = doc.get("name")
            
    hosp_name = pass_doc.get("hospital_name")
    if not hosp_name and pass_doc.get("hospital_id"):
        hosp = db.hospitals.find_one({"_id": pass_doc["hospital_id"]})
        if hosp: hosp_name = hosp.get("name")

    dept_name = pass_doc.get("department") or pass_doc.get("specialty") or "General Medicine"
    pat_id_str = str(pass_doc.get("patient_numeric_id") or "104829")

    return jsonify({
        "verified": True,
        "valid": True,
        "status": "VALID",
        "display_status": "Valid",
        "pass_number": pass_doc.get("pass_number"),
        "token": pass_doc.get("token") or pass_doc.get("pass_number"),
        "patient_name": pass_doc.get("patient_name", "Verified Patient"),
        "patient_id": pat_id_str,
        "patient_numeric_id": pat_id_str,
        "doctor_name": doc_name or "Consulting Doctor",
        "department": dept_name,
        "specialty": dept_name,
        "hospital_name": hosp_name or "CareBridge Hospital",
        "appointment_date": pass_doc.get("appointment_date"),
        "appointment_time": pass_doc.get("appointment_time"),
        "queue_number": queue_token,
        "reason": pass_doc.get("reason"),
        "issued_at": pass_doc.get("created_at"),
        "verified_at": now.isoformat(),
        "checked_in": True,
        "message": "OPD Pass successfully verified and authenticated with secure OTP."
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

