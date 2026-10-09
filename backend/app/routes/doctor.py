import re
import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, admin_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

doctor_bp = Blueprint("doctors", __name__)

@doctor_bp.route("", methods=["POST"], strict_slashes=False)
@doctor_bp.route("/", methods=["POST"], strict_slashes=False)
@staff_or_admin_required
def create_doctor():
    db = get_database()
    data = request.get_json() or {}
    
    name = (data.get("name") or "").strip()
    specialty = (data.get("specialty") or "").strip()
    department = (data.get("department") or specialty).strip()
    hospital_name = (data.get("hospital_name") or data.get("hospital") or "CareBridge Hospital").strip()
    hospital_id = data.get("hospital_id")
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    license_number = (data.get("license_number") or "").strip()
    
    if not name or not specialty:
        return jsonify({"error": "Validation Error", "detail": "Doctor name and specialty are required"}), 400
        
    if hospital_id and is_valid_object_id(hospital_id):
        hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        if hospital:
            hospital_name = hospital.get("name", hospital_name)
            data["hospital_id"] = ObjectId(hospital_id)
            
    doctor_doc = {
        "name": name,
        "specialty": specialty,
        "department": department,
        "hospital": hospital_name,
        "hospital_name": hospital_name,
        "hospital_id": ObjectId(hospital_id) if hospital_id and is_valid_object_id(hospital_id) else None,
        "email": email or None,
        "phone": phone or None,
        "city": data.get("city", "New Delhi"),
        "country": data.get("country", "India"),
        "category": data.get("category", "Practicing Clinician"),
        "verification_status": "Verified",
        "verification_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "is_bookable": True,
        "experience_years": int(data.get("experience_years", 10)) if str(data.get("experience_years", "")).isdigit() else 10,
        "consultation_fee": int(data.get("consultation_fee", 800)) if str(data.get("consultation_fee", "")).isdigit() else 800,
        "room_number": data.get("room_number", "OPD-101"),
        "license_number": license_number or f"MCI-IND-{secrets_hex(3)}",
        "bio": data.get("bio", f"Senior consultant in {specialty} at {hospital_name}."),
        "status": (data.get("status") or "AVAILABLE").upper(),
        "available_days": data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
        "available_slots": data.get("available_slots", ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"]),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.doctors.insert_one(doctor_doc)
    doctor_doc["_id"] = result.inserted_id
    
    return jsonify({
        "message": "Doctor registered successfully",
        "doctor_id": str(result.inserted_id),
        "doctor": serialize_doc(doctor_doc)
    }), 201

def secrets_hex(nbytes):
    import secrets
    return secrets.token_hex(nbytes).upper()

@doctor_bp.route("", methods=["GET"], strict_slashes=False)
@doctor_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_doctors():
    db = get_database()
    hospital_id = request.args.get("hospital_id")
    specialty = request.args.get("specialty")
    status_arg = request.args.get("status")
    search = request.args.get("search", "").strip()
    
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
        
    try:
        limit = int(request.args.get("limit", 10))
    except (ValueError, TypeError):
        limit = 10
        
    query = {}
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
        
    if specialty and specialty != "All" and specialty != "ALL":
        query["specialty"] = {"$regex": re.escape(specialty), "$options": "i"}
        
    if search:
        s_clean = re.escape(search)
        query["$or"] = [
            {"name": {"$regex": s_clean, "$options": "i"}},
            {"specialty": {"$regex": s_clean, "$options": "i"}},
            {"department": {"$regex": s_clean, "$options": "i"}},
            {"hospital": {"$regex": s_clean, "$options": "i"}},
            {"hospital_name": {"$regex": s_clean, "$options": "i"}},
            {"city": {"$regex": s_clean, "$options": "i"}},
            {"license_number": {"$regex": s_clean, "$options": "i"}},
        ]
        
    # Calculate live stats
    base_query = {k: v for k, v in query.items()}
    total_count = db.doctors.count_documents(base_query)
    verified_count = db.doctors.count_documents({**base_query, "verification_status": "Verified"})
    available_count = db.doctors.count_documents({**base_query, "status": "AVAILABLE"})
    on_leave_count = db.doctors.count_documents({**base_query, "status": {"$in": ["ON_LEAVE", "LEAVE", "UNAVAILABLE"]}})
    
    # Status filter
    if status_arg and status_arg.upper() != "ALL":
        stat_up = status_arg.upper()
        if stat_up == "VERIFIED":
            query["verification_status"] = "Verified"
        elif stat_up in ["AVAILABLE", "ON_LEAVE"]:
            query["status"] = stat_up
            
    filtered_total = db.doctors.count_documents(query)
    total_pages = max(1, math.ceil(filtered_total / limit)) if limit > 0 else 1
    skip_val = (page - 1) * limit if limit > 0 else 0
    
    cursor = db.doctors.find(query).sort("name", 1)
    if limit > 0:
        cursor = cursor.skip(skip_val).limit(limit)
        
    doctors = list(cursor)
    serialized = serialize_doc(doctors)
    
    # If legacy client requested without pagination parameter limit=0
    if request.args.get("all") == "true" or limit == 0:
        return jsonify(serialized), 200
        
    return jsonify({
        "doctors": serialized,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "total": total_count,
            "verified": verified_count,
            "available_today": available_count,
            "on_leave": on_leave_count
        }
    }), 200

@doctor_bp.route("/me", methods=["GET"], strict_slashes=False)
@doctor_bp.route("/profile", methods=["GET"], strict_slashes=False)
@token_required
def get_doctor_profile():
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    
    doctor = db.doctors.find_one({
        "$or": [
            {"user_id": user_id},
            {"email": user.get("email")},
            {"name": user.get("name")}
        ]
    })
    
    if not doctor:
        # Create baseline record if doctor user exists
        doc_data = {
            "user_id": user_id,
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone", ""),
            "specialty": "Cardiology & Internal Medicine",
            "department": "Cardiovascular Sciences",
            "hospital": "CareBridge Multi-Specialty Hospital",
            "hospital_name": "CareBridge Multi-Specialty Hospital",
            "license_number": "MCI-IND-" + str(user_id)[-6:].upper(),
            "experience_years": 10,
            "consultation_fee": 800,
            "room_number": "OPD-304",
            "verification_status": "Verified",
            "available_slots": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"],
            "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc)
        }
        res = db.doctors.insert_one(doc_data)
        doctor = db.doctors.find_one({"_id": res.inserted_id})
        
    return jsonify(serialize_doc(doctor)), 200

@doctor_bp.route("/<doctor_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_doctor(doctor_id):
    db = get_database()
    if not is_valid_object_id(doctor_id):
        doctor = db.doctors.find_one({"user_id": doctor_id})
        if not doctor:
            return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
    else:
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
        
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    return jsonify(serialize_doc(doctor)), 200

@doctor_bp.route("/<doctor_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_doctor(doctor_id):
    db = get_database()
    user = g.current_user
    user_role = user.get("role", "PATIENT")
    user_id = str(user["_id"])
    
    is_authorized = user_role in ["ADMIN", "STAFF"]
    
    doctor = None
    if is_valid_object_id(doctor_id):
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        doctor = db.doctors.find_one({"user_id": doctor_id})
        
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    if not is_authorized and user_role == "DOCTOR":
        if str(doctor.get("user_id")) == user_id or doctor.get("email") == user.get("email") or str(doctor["_id"]) == doctor_id:
            is_authorized = True
            
    if not is_authorized:
        return jsonify({"error": "Forbidden", "detail": "You do not have permission to modify this doctor profile"}), 403
        
    data = request.get_json() or {}
    data.pop("_id", None)
    data.pop("user_id", None)
    
    if "hospital_id" in data and data["hospital_id"]:
        if is_valid_object_id(data["hospital_id"]):
            data["hospital_id"] = ObjectId(data["hospital_id"])
        else:
            data.pop("hospital_id", None)
            
    data["updated_at"] = datetime.now(timezone.utc)
    
    db.doctors.update_one({"_id": doctor["_id"]}, {"$set": data})
    updated_doc = db.doctors.find_one({"_id": doctor["_id"]})
    
    return jsonify({
        "message": "Doctor updated successfully",
        "doctor": serialize_doc(updated_doc)
    }), 200

@doctor_bp.route("/<doctor_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_doctor(doctor_id):
    db = get_database()
    if not is_valid_object_id(doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
        
    result = db.doctors.delete_one({"_id": ObjectId(doctor_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    return jsonify({"message": "Doctor record deleted successfully"}), 200

@doctor_bp.route("/earnings", methods=["GET"], strict_slashes=False)
@doctor_bp.route("/<doctor_id>/earnings", methods=["GET"], strict_slashes=False)
@token_required
def get_doctor_earnings(doctor_id=None):
    db = get_database()
    user = g.current_user
    user_id = str(user["_id"])
    
    doctor = None
    if doctor_id and is_valid_object_id(doctor_id):
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    elif doctor_id:
        doctor = db.doctors.find_one({"user_id": doctor_id})
        
    if not doctor:
        doctor = db.doctors.find_one({
            "$or": [
                {"user_id": user_id},
                {"email": user.get("email")},
                {"name": user.get("name")}
            ]
        })
        
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor profile not found"}), 404
        
    doc_id = doctor["_id"]
    fee_per_consult = doctor.get("consultation_fee", 800)
    
    appts = list(db.appointments.find({"doctor_id": doc_id}).sort("created_at", -1))
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month_str = datetime.now(timezone.utc).strftime("%Y-%m")
    
    total_consultations = len(appts)
    completed_appts = [a for a in appts if a.get("status") in ["COMPLETED", "CONFIRMED", "APPROVED"]]
    
    transactions = []
    total_earnings = 0
    today_earnings = 0
    this_month_earnings = 0
    pending_payout = 0
    
    for idx, a in enumerate(appts):
        appt_date = str(a.get("appointment_date", a.get("date", today_str)))
        status = a.get("status", "CONFIRMED")
        is_paid = status in ["COMPLETED", "CONFIRMED", "APPROVED"]
        amount = a.get("fee", fee_per_consult)
        
        if is_paid:
            total_earnings += amount
            if appt_date.startswith(today_str):
                today_earnings += amount
            if appt_date.startswith(current_month_str):
                this_month_earnings += amount
        else:
            pending_payout += amount
            
        transactions.append({
            "id": f"TXN-{str(a['_id'])[-6:].upper()}",
            "appointment_id": str(a["_id"]),
            "patient_name": a.get("patient_name", f"Patient #{idx+1}"),
            "date": appt_date,
            "time": a.get("appointment_time", a.get("time", "10:00 AM")),
            "specialty": a.get("specialty", doctor.get("specialty", "General")),
            "fee": amount,
            "status": "PAID" if is_paid else "PENDING",
            "payout_status": "SETTLED" if is_paid and idx > 1 else "PROCESSING",
            "payment_method": "CareBridge Pay / UPI" if idx % 2 == 0 else "Insurance / Card"
        })
        
    return jsonify({
        "doctor_id": str(doc_id),
        "doctor_name": doctor.get("name"),
        "specialty": doctor.get("specialty"),
        "consultation_fee": fee_per_consult,
        "metrics": {
            "total_earnings": total_earnings,
            "today_earnings": today_earnings,
            "this_month_earnings": this_month_earnings,
            "total_consultations": total_consultations,
            "completed_consultations": len(completed_appts),
            "pending_settlement": pending_payout,
            "average_fee": fee_per_consult
        },
        "transactions": transactions
    }), 200
