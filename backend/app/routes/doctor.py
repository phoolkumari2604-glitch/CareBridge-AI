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
    
    name = data.get("name")
    specialty = data.get("specialty")
    hospital_id = data.get("hospital_id")
    
    if not name or not specialty:
        return jsonify({"error": "Validation Error", "detail": "Doctor name and specialty are required"}), 400
        
    if hospital_id and is_valid_object_id(hospital_id):
        hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        if not hospital:
            return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404
        data["hospital_id"] = ObjectId(hospital_id)
        
    data["created_at"] = datetime.now(timezone.utc)
    data["available_slots"] = data.get("available_slots", ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"])
    data["available_days"] = data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
    data["status"] = data.get("status", "AVAILABLE")
    
    result = db.doctors.insert_one(data)
    return jsonify({
        "message": "Doctor created successfully",
        "doctor_id": str(result.inserted_id)
    }), 201

@doctor_bp.route("", methods=["GET"], strict_slashes=False)
@doctor_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_doctors():
    db = get_database()
    hospital_id = request.args.get("hospital_id")
    specialty = request.args.get("specialty")
    category = request.args.get("category")
    country = request.args.get("country")
    city = request.args.get("city")
    search = request.args.get("search")
    is_bookable = request.args.get("is_bookable")
    
    query = {}
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
    if category and category != "All":
        query["category"] = category
    if country and country != "All":
        query["country"] = {"$regex": country, "$options": "i"}
    if city and city != "All":
        query["city"] = {"$regex": city, "$options": "i"}
    if is_bookable is not None:
        if is_bookable.lower() == "true":
            query["is_bookable"] = True
        elif is_bookable.lower() == "false":
            query["is_bookable"] = False
            
    if search:
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"specialty": {"$regex": s, "$options": "i"}},
            {"hospital": {"$regex": s, "$options": "i"}},
            {"hospital_name": {"$regex": s, "$options": "i"}},
            {"city": {"$regex": s, "$options": "i"}},
            {"country": {"$regex": s, "$options": "i"}},
            {"category": {"$regex": s, "$options": "i"}},
        ]
        
    doctors = list(db.doctors.find(query).sort("name", 1))
    return jsonify(serialize_doc(doctors)), 200

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
            "license_number": "MCI-IND-" + str(user_id)[-6:].upper(),
            "experience_years": 10,
            "consultation_fee": 800,
            "room_number": "OPD-304",
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
        # Fallback search by user_id
        doctor = db.doctors.find_one({"user_id": doctor_id})
        if not doctor:
            return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
    else:
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
        
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    return jsonify(serialize_doc(doctor)), 200

@doctor_bp.route("/<doctor_id>/availability", methods=["GET"], strict_slashes=False)
@token_required
def get_doctor_availability(doctor_id):
    db = get_database()
    if not is_valid_object_id(doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
        
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    return jsonify({
        "doctor_id": str(doctor["_id"]),
        "doctor_name": doctor.get("name"),
        "available_days": doctor.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
        "available_slots": doctor.get("available_slots", ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"]),
        "status": doctor.get("status", "AVAILABLE")
    }), 200

@doctor_bp.route("/<doctor_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_doctor(doctor_id):
    db = get_database()
    user = g.current_user
    user_role = user.get("role", "PATIENT")
    user_id = str(user["_id"])
    
    # Check permissions: Admin, Staff, or the doctor themselves
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
            return jsonify({"error": "Validation Error", "detail": "Invalid hospital ID"}), 400
            
    data["updated_at"] = datetime.now(timezone.utc)
    
    # If doctor name or phone is updated, also update user record
    if "name" in data or "phone" in data:
        user_updates = {}
        if "name" in data and data["name"]:
            user_updates["name"] = data["name"]
        if "phone" in data and data["phone"]:
            user_updates["phone"] = data["phone"]
        if user_updates and doctor.get("user_id"):
            try:
                db.users.update_one({"_id": ObjectId(doctor["user_id"])}, {"$set": user_updates})
            except Exception:
                pass
                
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
        
    return jsonify({"message": "Doctor deleted successfully"}), 200


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
    
    # Query appointments for this doctor
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

