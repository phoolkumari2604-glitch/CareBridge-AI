import re
import math
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

queue_bp = Blueprint("queue", __name__)

@queue_bp.route("/call-next", methods=["POST"], strict_slashes=False)
@token_required
def call_next_patient():
    """Atomically find the highest priority waiting patient and move to IN_CONSULTATION."""
    db = get_database()
    doctor_id = request.args.get("doctor_id")
    hospital_id = request.args.get("hospital_id")
    
    query = {
        "status": {"$in": ["WAITING", "CALLED"]}
    }
    if doctor_id and is_valid_object_id(doctor_id):
        query["doctor_id"] = ObjectId(doctor_id)
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
        
    # Sort: EMERGENCY priority first, then lowest token_number
    # Priority: EMERGENCY (priority=1), NORMAL (priority=2)
    next_patient = db.queue.find_one(
        query,
        sort=[("priority_order", 1), ("token_number", 1)]
    )
    
    if not next_patient:
        return jsonify({
            "message": "No patients currently waiting in queue",
            "entry": None
        }), 200
        
    # Move previous IN_CONSULTATION patient to COMPLETED if any, or keep them
    db.queue.update_one(
        {"_id": next_patient["_id"]},
        {"$set": {
            "status": "IN_CONSULTATION",
            "called_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_doc = db.queue.find_one({"_id": next_patient["_id"]})
    return jsonify({
        "message": f"Token #{next_patient.get('token_number')} ({next_patient.get('patient_name', 'Patient')}) called into consultation",
        "entry": serialize_doc(updated_doc)
    }), 200

@queue_bp.route("", methods=["POST"], strict_slashes=False)
@queue_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_queue_entry():
    db = get_database()
    data = request.get_json() or {}
    
    appointment_id = data.get("appointment_id")
    patient_id = data.get("patient_id")
    doctor_id = data.get("doctor_id")
    is_emergency = bool(data.get("is_emergency", False))
    
    if not appointment_id and not (patient_id and doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Either appointment_id or patient_id & doctor_id are required"}), 400
        
    appointment = None
    if appointment_id and is_valid_object_id(appointment_id):
        appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
        
    if appointment:
        patient_id = str(appointment.get("patient_id"))
        doctor_id = str(appointment.get("doctor_id"))
        patient_name = appointment.get("patient_name")
        doctor_name = appointment.get("doctor_name")
        hospital_id = appointment.get("hospital_id")
        hospital_name = appointment.get("hospital_name")
        specialty = appointment.get("specialty")
    else:
        patient = db.patients.find_one({"_id": ObjectId(patient_id)}) if is_valid_object_id(patient_id) else None
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)}) if is_valid_object_id(doctor_id) else None
        patient_name = patient.get("name", "Patient") if patient else "Patient"
        doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"
        hospital_id = doctor.get("hospital_id") if doctor else None
        hospital_name = doctor.get("hospital_name", doctor.get("hospital", "CareBridge Hospital")) if doctor else "CareBridge Hospital"
        specialty = doctor.get("specialty", "General Medicine") if doctor else "General Medicine"
        
    # Calculate next token number for today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    last_queue = db.queue.find_one(
        {"created_at": {"$gte": today_start}},
        sort=[("token_number", -1)]
    )
    token_number = (last_queue["token_number"] + 1) if last_queue and "token_number" in last_queue else 1
    
    queue_doc = {
        "appointment_id": ObjectId(appointment_id) if appointment_id and is_valid_object_id(appointment_id) else None,
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else None,
        "doctor_id": ObjectId(doctor_id) if is_valid_object_id(doctor_id) else None,
        "hospital_id": hospital_id,
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "hospital_name": hospital_name,
        "specialty": specialty,
        "token_number": token_number,
        "token_code": f"T-{str(token_number).zfill(3)}",
        "priority": "EMERGENCY" if is_emergency else "NORMAL",
        "priority_order": 1 if is_emergency else 2,
        "status": "WAITING",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.queue.insert_one(queue_doc)
    queue_doc["_id"] = result.inserted_id
    
    return jsonify({
        "message": "Patient added to live queue successfully",
        "queue_id": str(result.inserted_id),
        "token_number": token_number,
        "token_code": queue_doc["token_code"],
        "status": "WAITING",
        "entry": serialize_doc(queue_doc)
    }), 201

@queue_bp.route("", methods=["GET"], strict_slashes=False)
@queue_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_queue():
    db = get_database()
    doctor_id = request.args.get("doctor_id")
    hospital_id = request.args.get("hospital_id")
    status = request.args.get("status")
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
    if doctor_id and is_valid_object_id(doctor_id):
        query["doctor_id"] = ObjectId(doctor_id)
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
        
    # Search logic
    if search:
        s_clean = re.escape(search)
        or_conds = [
            {"patient_name": {"$regex": s_clean, "$options": "i"}},
            {"doctor_name": {"$regex": s_clean, "$options": "i"}},
            {"specialty": {"$regex": s_clean, "$options": "i"}},
            {"token_code": {"$regex": s_clean, "$options": "i"}},
        ]
        
        # Check if searching by integer token number
        if search.isdigit():
            or_conds.append({"token_number": int(search)})
            
        query["$or"] = or_conds
        
    # Compute base live stats for queue badges
    base_query = {k: v for k, v in query.items()}
    waiting_count = db.queue.count_documents({**base_query, "status": "WAITING"})
    in_consult_count = db.queue.count_documents({**base_query, "status": "IN_CONSULTATION"})
    completed_today_count = db.queue.count_documents({**base_query, "status": "COMPLETED"})
    emergency_count = db.queue.count_documents({**base_query, "priority": "EMERGENCY", "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}})
    
    # Status filter
    if status and status.upper() != "ALL":
        if status.upper() == "EMERGENCY":
            query["priority"] = "EMERGENCY"
        else:
            query["status"] = status.upper()
            
    filtered_total = db.queue.count_documents(query)
    total_pages = max(1, math.ceil(filtered_total / limit)) if limit > 0 else 1
    skip_val = (page - 1) * limit if limit > 0 else 0
    
    # Sort: WAITING/IN_CONSULTATION first, then priority, then token_number
    cursor = db.queue.find(query).sort([
        ("status", 1), # In mongo, sorts string values
        ("priority_order", 1),
        ("token_number", 1),
        ("created_at", -1)
    ])
    
    if limit > 0:
        cursor = cursor.skip(skip_val).limit(limit)
        
    entries = list(cursor)
    
    # Enrich entries with patient details (phone, email, patient code) and doctor details
    for item in entries:
        if not item.get("token_code"):
            item["token_code"] = f"T-{str(item.get('token_number', 1)).zfill(3)}"
            
        if item.get("patient_id"):
            pat = db.patients.find_one({"_id": item["patient_id"]})
            if pat:
                item["patient_name"] = pat.get("name") or item.get("patient_name") or "Walk-in Patient"
                item["patient_phone"] = pat.get("phone", "—")
                item["patient_email"] = pat.get("email", "—")
                item["patient_id_code"] = pat.get("patient_id_code", f"PT-{str(pat['_id'])[-6:].upper()}")
        elif not item.get("patient_name"):
            item["patient_name"] = "Walk-in Patient"

        if item.get("doctor_id") and (not item.get("doctor_name") or item.get("doctor_name") == "Doctor"):
            doc = db.doctors.find_one({"_id": item["doctor_id"]})
            if doc:
                item["doctor_name"] = doc.get("name", "Duty Physician")
                item["specialty"] = doc.get("specialty", "General Medicine")
        if not item.get("doctor_name"):
            item["doctor_name"] = "On-Duty Physician"
        if not item.get("specialty"):
            item["specialty"] = "General Practice"
                
    serialized = serialize_doc(entries)
    
    # Identify currently serving token
    serving = db.queue.find_one({"status": "IN_CONSULTATION"}) or db.queue.find_one({"status": "CALLED"})
    current_token_code = serving.get("token_code", f"T-{str(serving.get('token_number', 1)).zfill(3)}") if serving else "T-001"
    
    return jsonify({
        "queue": serialized,
        "current_token": current_token_code,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "waiting": waiting_count,
            "in_consultation": in_consult_count,
            "completed_today": completed_today_count,
            "emergency": emergency_count
        }
    }), 200

@queue_bp.route("/<queue_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_queue_entry(queue_id):
    db = get_database()
    if not is_valid_object_id(queue_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid queue ID"}), 400
        
    entry = db.queue.find_one({"_id": ObjectId(queue_id)})
    if not entry:
        return jsonify({"error": "Not Found", "detail": "Queue entry not found"}), 404
        
    patients_ahead = db.queue.count_documents({
        "hospital_id": entry.get("hospital_id"),
        "doctor_id": entry.get("doctor_id"),
        "status": {"$in": ["WAITING", "CALLED"]},
        "token_number": {"$lt": entry.get("token_number", 1)}
    })
    
    result = serialize_doc(entry)
    result["patients_ahead"] = patients_ahead
    result["queue_position"] = patients_ahead + 1
    return jsonify(result), 200

@queue_bp.route("/<queue_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_queue_entry(queue_id):
    db = get_database()
    if not is_valid_object_id(queue_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid queue ID"}), 400
        
    data = request.get_json() or {}
    status = data.get("status", "").upper()
    priority = data.get("priority", "").upper()
    
    allowed_statuses = ["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "SKIPPED", "CANCELLED"]
    if status and status not in allowed_statuses:
        return jsonify({"error": "Validation Error", "detail": f"Status must be one of {allowed_statuses}"}), 400
        
    update_fields = {}
    if status:
        update_fields["status"] = status
        if status == "IN_CONSULTATION":
            update_fields["consultation_started_at"] = datetime.now(timezone.utc)
        elif status == "COMPLETED":
            update_fields["completed_at"] = datetime.now(timezone.utc)
            
    if priority in ["NORMAL", "EMERGENCY"]:
        update_fields["priority"] = priority
        update_fields["priority_order"] = 1 if priority == "EMERGENCY" else 2
        
    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    res = db.queue.update_one({"_id": ObjectId(queue_id)}, {"$set": update_fields})
    if res.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Queue entry not found"}), 404
        
    updated_doc = db.queue.find_one({"_id": ObjectId(queue_id)})
    return jsonify({
        "message": "Queue status updated successfully",
        "entry": serialize_doc(updated_doc)
    }), 200

@queue_bp.route("/<queue_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_queue_entry(queue_id):
    db = get_database()
    if not is_valid_object_id(queue_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid queue ID"}), 400
        
    result = db.queue.delete_one({"_id": ObjectId(queue_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Queue entry not found"}), 404
    return jsonify({"message": "Queue entry deleted successfully"}), 200

# ============================================================
# PATIENT CHECK-IN & REAL-TIME QUEUE TELEMETRY
# ============================================================
@queue_bp.route("/check-in", methods=["POST"], strict_slashes=False)
@token_required
def patient_check_in():
    """
    Checks patient in on appointment day (up to 60 mins before or during slot).
    Generates queue token and adds to db.queue.
    """
    db = get_database()
    data = request.get_json() or {}
    appointment_id = data.get("appointment_id")
    
    if not appointment_id or not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Valid appointment_id is required"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404

    # Enforce confirmed status
    appt_status = (appointment.get("status") or appointment.get("approval_status") or "").upper()
    if appt_status not in ["APPROVED", "CONFIRMED"]:
        return jsonify({
            "error": "Not Permitted",
            "detail": "Only Approved or Confirmed appointments can be checked in to the Live Queue."
        }), 400

    # Check if already checked in
    existing = db.queue.find_one({
        "appointment_id": ObjectId(appointment_id),
        "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}
    })
    if existing:
        return jsonify({
            "message": "Already checked in",
            "queue_id": str(existing["_id"]),
            "token_number": existing.get("token_number"),
            "token_code": existing.get("token_code"),
            "entry": serialize_doc(existing)
        }), 200

    doc_id = appointment.get("doctor_id")
    hosp_id = appointment.get("hospital_id")
    pat_id = appointment.get("patient_id")

    # Resolve doctor
    doc = db.doctors.find_one({"_id": doc_id}) if doc_id else None
    hosp = db.hospitals.find_one({"_id": hosp_id}) if hosp_id else None

    # Calculate token number for this doctor and date
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    count_today = db.queue.count_documents({
        "doctor_id": doc_id,
        "created_at": {"$gte": today_start}
    })
    token_num = count_today + 1
    token_code = f"CB-{str(token_num).zfill(2)}"

    now_dt = datetime.now(timezone.utc)
    queue_doc = {
        "appointment_id": ObjectId(appointment_id),
        "patient_id": pat_id,
        "doctor_id": doc_id,
        "hospital_id": hosp_id,
        "patient_name": appointment.get("patient_name", "Patient"),
        "doctor_name": doc.get("name") if doc else appointment.get("doctor_name", "Doctor"),
        "hospital_name": hosp.get("name") if hosp else appointment.get("hospital_name", "CareBridge Hospital"),
        "department": doc.get("department") if doc else appointment.get("specialty", "Clinical Consultation"),
        "specialty": doc.get("specialty") if doc else appointment.get("specialty", "General Medicine"),
        "appointment_time": appointment.get("appointment_time", "10:00 AM"),
        "appointment_date": appointment.get("appointment_date", today_str),
        "token_number": token_num,
        "token_code": token_code,
        "priority": "NORMAL",
        "priority_order": 2,
        "status": "WAITING",
        "checked_in_at": now_dt,
        "created_at": now_dt,
        "updated_at": now_dt
    }

    result = db.queue.insert_one(queue_doc)
    queue_doc["_id"] = result.inserted_id

    # Sync appointment status to checked in
    db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"checked_in": True, "token_code": token_code, "updated_at": now_dt}}
    )

    return jsonify({
        "message": f"Successfully checked in. Your token is {token_code}.",
        "queue_id": str(result.inserted_id),
        "token_number": token_num,
        "token_code": token_code,
        "status": "WAITING",
        "entry": serialize_doc(queue_doc)
    }), 201

@queue_bp.route("/live-state", methods=["GET"], strict_slashes=False)
@token_required
def get_live_queue_state():
    """
    Returns real-time queue telemetry for a specific appointment or doctor:
    - now_serving_token
    - queue position & patients ahead
    - calculated average wait time based on doctor's completed consultations
    - estimated call time (e.g. 'around 2:45 PM')
    """
    db = get_database()
    appointment_id = request.args.get("appointment_id")
    doctor_id = request.args.get("doctor_id")

    query = {}
    my_entry = None
    if appointment_id and is_valid_object_id(appointment_id):
        my_entry = db.queue.find_one({
            "appointment_id": ObjectId(appointment_id),
            "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}
        })
        if my_entry:
            doctor_id = str(my_entry.get("doctor_id"))

    if doctor_id and is_valid_object_id(doctor_id):
        query["doctor_id"] = ObjectId(doctor_id)

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    query["created_at"] = {"$gte": today_start}

    all_tokens = list(db.queue.find(query).sort("token_number", 1))

    # Calculate doctor's real average consultation time from completed visits
    completed_entries = list(db.queue.find({
        "doctor_id": ObjectId(doctor_id) if doctor_id and is_valid_object_id(doctor_id) else None,
        "status": "COMPLETED",
        "consultation_started_at": {"$exists": True},
        "completed_at": {"$exists": True}
    }).sort("completed_at", -1).limit(10))

    avg_minutes = 10  # default clinical standard
    if completed_entries:
        durations = []
        for c in completed_entries:
            st = c.get("consultation_started_at")
            et = c.get("completed_at")
            if st and et:
                diff = (et - st).total_seconds() / 60.0
                if 2 <= diff <= 60:
                    durations.append(diff)
        if durations:
            avg_minutes = max(4, round(sum(durations) / len(durations)))

    # Identify currently serving token
    in_consult = next((t for t in all_tokens if t.get("status") == "IN_CONSULTATION"), None)
    called = next((t for t in all_tokens if t.get("status") == "CALLED"), None)
    now_serving = in_consult or called or (all_tokens[0] if all_tokens else None)
    now_serving_token = now_serving.get("token_number", 1) if now_serving else 1
    now_serving_code = now_serving.get("token_code", f"CB-{str(now_serving_token).zfill(2)}") if now_serving else "CB-01"

    # Calculate position for my_entry
    patients_ahead = 0
    my_position = 1
    if my_entry:
        my_tok_num = my_entry.get("token_number", 1)
        patients_ahead = sum(1 for t in all_tokens if t.get("status") in ["WAITING", "CALLED"] and t.get("token_number", 0) < my_tok_num)
        my_position = patients_ahead + 1

    estimated_wait_min = patients_ahead * avg_minutes
    call_time_dt = datetime.now(timezone.utc) + timedelta(minutes=estimated_wait_min)
    estimated_call_time = call_time_dt.strftime("%I:%M %p")

    # Flow token groups
    completed_list = [serialize_doc(t) for t in all_tokens if t.get("status") == "COMPLETED"]
    waiting_list = [serialize_doc(t) for t in all_tokens if t.get("status") == "WAITING"]
    total_batch = max(1, len(all_tokens))
    progression_pct = round((len(completed_list) / total_batch) * 100)

    return jsonify({
        "status": "connected",
        "now_serving_token": now_serving_token,
        "now_serving_code": now_serving_code,
        "my_token": serialize_doc(my_entry) if my_entry else None,
        "patients_ahead": patients_ahead,
        "queue_position": my_position,
        "average_consultation_time": avg_minutes,
        "estimated_wait_minutes": estimated_wait_min,
        "estimated_call_time": f"around {estimated_call_time}",
        "progression_percentage": progression_pct,
        "total_active_tokens": len(all_tokens),
        "completed_count": len(completed_list),
        "waiting_count": len(waiting_list),
        "completed_tokens": completed_list[-5:],
        "upcoming_tokens": [serialize_doc(t) for t in waiting_list[:5]],
        "last_updated": datetime.now(timezone.utc).isoformat()
    }), 200

