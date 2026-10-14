import re
import math
import secrets
import string
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.audit_service import log_audit_action

appointment_bp = Blueprint("appointments", __name__)

@appointment_bp.route("", methods=["POST"], strict_slashes=False)
@appointment_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_appointment():
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}
    
    patient_id = data.get("patient_id")
    hospital_id = data.get("hospital_id")
    doctor_id = data.get("doctor_id")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")
    reason = (data.get("reason") or "General Consultation").strip()
    
    if not patient_id or not doctor_id or not appointment_date or not appointment_time:
        return jsonify({
            "error": "Validation Error",
            "detail": "patient_id, doctor_id, appointment_date, and appointment_time are required"
        }), 400
        
    if not is_valid_object_id(patient_id) or not is_valid_object_id(doctor_id):
        return jsonify({
            "error": "Validation Error",
            "detail": "Invalid ID format for patient or doctor"
        }), 400
        
    # Check patient
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    # Check doctor
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    # Check or resolve hospital
    if not hospital_id and doctor.get("hospital_id"):
        hospital_id = str(doctor["hospital_id"])
    elif not hospital_id:
        # Check if any default hospital exists
        hosp = db.hospitals.find_one()
        if hosp:
            hospital_id = str(hosp["_id"])
            
    hospital = None
    if hospital_id and is_valid_object_id(hospital_id):
        hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        
    # Prevent duplicate active slot booking for the same doctor
    existing = db.appointments.find_one({
        "doctor_id": ObjectId(doctor_id),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "status": {"$in": ["PENDING", "APPROVED", "CONFIRMED"]}
    })
    if existing:
        return jsonify({"error": "Conflict", "detail": "This doctor already has a booked consultation in this time slot."}), 409
        
    booking_code = f"APT-{str(ObjectId())[-6:].upper()}"
    
    appointment_doc = {
        "booking_id": booking_code,
        "patient_id": ObjectId(patient_id),
        "hospital_id": ObjectId(hospital_id) if hospital_id and is_valid_object_id(hospital_id) else None,
        "doctor_id": ObjectId(doctor_id),
        "doctor_name": doctor.get("name", "Medical Specialist"),
        "hospital_name": hospital.get("name", doctor.get("hospital_name", doctor.get("hospital", "CareBridge General Hospital"))),
        "patient_name": patient.get("name", "Registered Patient"),
        "patient_phone": patient.get("phone", ""),
        "patient_email": patient.get("email", ""),
        "specialty": doctor.get("specialty", "General Medicine"),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "reason": reason,
        "status": data.get("status") or ("APPROVED" if current_user.get("role") in ["STAFF", "ADMIN", "DOCTOR"] else "PENDING"),
        "approval_status": data.get("status") or ("APPROVED" if current_user.get("role") in ["STAFF", "ADMIN", "DOCTOR"] else "PENDING"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.appointments.insert_one(appointment_doc)
    appointment_doc["_id"] = result.inserted_id
    
    # Also auto-create approval record
    try:
        approval_doc = {
            "appointment_id": result.inserted_id,
            "patient_id": ObjectId(patient_id),
            "doctor_id": ObjectId(doctor_id),
            "doctor_name": appointment_doc["doctor_name"],
            "patient_name": appointment_doc["patient_name"],
            "hospital_name": appointment_doc["hospital_name"],
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "reason": reason,
            "status": appointment_doc["approval_status"],
            "approved_by": current_user["_id"] if appointment_doc["approval_status"] == "APPROVED" else None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        db.approvals.insert_one(approval_doc)
    except Exception as e:
        print("Warning: could not auto-create approval doc:", e)
        
    return jsonify({
        "message": "Appointment booked successfully",
        "appointment_id": str(result.inserted_id),
        "booking_id": booking_code,
        "status": appointment_doc["status"],
        "appointment": serialize_doc(appointment_doc)
    }), 201

@appointment_bp.route("", methods=["GET"], strict_slashes=False)
@appointment_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_appointments():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")
    
    patient_id_arg = request.args.get("patient_id")
    doctor_id_arg = request.args.get("doctor_id")
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
    
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patient = None
        if current_user.get("patient_id") and is_valid_object_id(str(current_user["patient_id"])):
            patient = db.patients.find_one({"_id": ObjectId(str(current_user["patient_id"]))})
        if not patient:
            patient = db.patients.find_one({
                "$or": [
                    {"user_id": user_id},
                    {"user_id": ObjectId(user_id)},
                    {"email": email}
                ]
            })
        if not patient and current_user.get("phone"):
            patient = db.patients.find_one({"phone": current_user["phone"]})
            if patient:
                db.patients.update_one({"_id": patient["_id"]}, {"$set": {"user_id": user_id}})
        if not patient:
            pat_code = "".join(secrets.choice(string.digits) for _ in range(6))
            while db.patients.find_one({"patient_code": pat_code}):
                pat_code = "".join(secrets.choice(string.digits) for _ in range(6))
            new_pat = {
                "user_id": user_id,
                "name": current_user.get("name") or "Registered Patient",
                "email": email,
                "phone": current_user.get("phone", ""),
                "status": "Active",
                "patient_code": pat_code,
                "patient_id_code": pat_code,
                "created_at": datetime.now(timezone.utc)
            }
            res = db.patients.insert_one(new_pat)
            patient = {**new_pat, "_id": res.inserted_id}
            db.users.update_one({"_id": current_user["_id"]}, {"$set": {"patient_id": str(res.inserted_id)}})
            
        # The server must filter by the authenticated user, never by an id taken from the URL or client.
        query["patient_id"] = patient["_id"]
    else:
        if patient_id_arg and is_valid_object_id(patient_id_arg):
            query["patient_id"] = ObjectId(patient_id_arg)
            
    if doctor_id_arg and is_valid_object_id(doctor_id_arg):
        query["doctor_id"] = ObjectId(doctor_id_arg)
        
    # Search logic
    if search:
        s_clean = re.escape(search)
        or_conds = [
            {"patient_name": {"$regex": s_clean, "$options": "i"}},
            {"doctor_name": {"$regex": s_clean, "$options": "i"}},
            {"specialty": {"$regex": s_clean, "$options": "i"}},
            {"reason": {"$regex": s_clean, "$options": "i"}},
            {"booking_id": {"$regex": s_clean, "$options": "i"}},
            {"patient_phone": {"$regex": s_clean, "$options": "i"}},
            {"patient_email": {"$regex": s_clean, "$options": "i"}},
        ]
        
        # Check if search term matches patient ID or appointment ID
        if is_valid_object_id(search):
            or_conds.append({"_id": ObjectId(search)})
            or_conds.append({"patient_id": ObjectId(search)})
            
        # Match flexible phone digits
        digits = re.sub(r"\D", "", search)
        if digits:
            digit_pattern = r"[\s\-\+\(\)]*".join(list(digits))
            or_conds.append({"patient_phone": {"$regex": digit_pattern, "$options": "i"}})
            
        query["$or"] = or_conds
        
    # Compute base counts before status filtering for stats badges
    base_query = {k: v for k, v in query.items()}
    total_count = db.appointments.count_documents(base_query)
    
    approved_q = {**base_query, "status": {"$in": ["APPROVED", "CONFIRMED"]}}
    pending_q = {**base_query, "status": "PENDING"}
    completed_q = {**base_query, "status": "COMPLETED"}
    cancelled_q = {**base_query, "status": "CANCELLED"}
    
    approved_count = db.appointments.count_documents(approved_q)
    pending_count = db.appointments.count_documents(pending_q)
    completed_count = db.appointments.count_documents(completed_q)
    cancelled_count = db.appointments.count_documents(cancelled_q)
    
    # Status filter
    if status_arg and status_arg.upper() != "ALL":
        stat_upper = status_arg.upper()
        if stat_upper in ["APPROVED", "CONFIRMED"]:
            query["status"] = {"$in": ["APPROVED", "CONFIRMED"]}
        else:
            query["status"] = stat_upper
            
    filtered_total = db.appointments.count_documents(query)
    total_pages = max(1, math.ceil(filtered_total / limit)) if limit > 0 else 1
    skip_val = (page - 1) * limit if limit > 0 else 0
    
    cursor = db.appointments.find(query).sort("created_at", -1)
    if limit > 0:
        cursor = cursor.skip(skip_val).limit(limit)
        
    appointments = list(cursor)
    
    # Enrich missing patient and doctor names safely
    for appt in appointments:
        if not appt.get("booking_id"):
            appt["booking_id"] = f"APT-{str(appt['_id'])[-6:].upper()}"
            
        if (not appt.get("patient_name") or appt.get("patient_name") == "string") and appt.get("patient_id"):
            pat = db.patients.find_one({"_id": appt["patient_id"]})
            if pat and pat.get("name") and pat.get("name") != "string":
                appt["patient_name"] = pat.get("name")
                appt["patient_phone"] = pat.get("phone", "")
                appt["patient_email"] = pat.get("email", "")
            else:
                appt["patient_name"] = "Registered Patient"
                
        if not appt.get("patient_phone") and appt.get("patient_id"):
            pat = db.patients.find_one({"_id": appt["patient_id"]})
            if pat:
                appt["patient_phone"] = pat.get("phone", "")
                appt["patient_email"] = pat.get("email", "")
                
        # Ensure doctor and specialty are fully resolved
        doc = None
        if appt.get("doctor_id"):
            doc = db.doctors.find_one({"_id": appt["doctor_id"]})
        if doc:
            appt["doctor_name"] = doc.get("name") or appt.get("doctor_name", "Specialist Doctor")
            appt["specialty"] = doc.get("specialty") or appt.get("specialty", "Medical Consultation")
            appt["doctor_room"] = doc.get("room_number", "OPD-101")
            appt["doctor_experience"] = doc.get("experience_years", 10)
            appt["doctor_photo"] = doc.get("avatar") or doc.get("photo") or doc.get("image") or ""
            appt["doctor_avatar"] = appt["doctor_photo"]
            appt["fee"] = appt.get("fee") or appt.get("consultation_fee") or doc.get("consultation_fee") or doc.get("fee") or 800
            if not appt.get("hospital_id") and doc.get("hospital_id"):
                appt["hospital_id"] = doc["hospital_id"]
            if not appt.get("hospital_name"):
                appt["hospital_name"] = doc.get("hospital_name") or doc.get("hospital")
        else:
            appt["doctor_photo"] = appt.get("doctor_photo") or ""
            appt["doctor_avatar"] = appt.get("doctor_avatar") or appt["doctor_photo"]
            appt["fee"] = appt.get("fee") or 800

        # Ensure hospital and its address are fully resolved
        hosp = None
        if appt.get("hospital_id"):
            hosp = db.hospitals.find_one({"_id": appt["hospital_id"]})
        if hosp:
            appt["hospital_name"] = hosp.get("name") or appt.get("hospital_name")
            appt["hospital_address"] = hosp.get("address") or hosp.get("city") or "Facility Address"
            appt["hospital_phone"] = hosp.get("phone") or "+91 40 2345 6789"
            appt["hospital_city"] = hosp.get("city", "Hyderabad")
        else:
            appt["hospital_address"] = appt.get("hospital_address") or "Hospital Outpatient Department"
            appt["hospital_phone"] = appt.get("hospital_phone") or "+91 40 2345 6789"

        # Check OPD pass & Queue token
        opd = db.opd_passes.find_one({"appointment_id": appt["_id"]}) or db.opd_passes.find_one({"appointment_id": str(appt["_id"])})
        if opd:
            appt["has_opd_pass"] = True
            appt["opd_pass_id"] = str(opd["_id"])
            appt["pass_number"] = opd.get("pass_number")
        
        q_item = db.queue.find_one({"appointment_id": str(appt["_id"])}) or db.queue.find_one({"appointment_id": appt["_id"]})
        if q_item:
            appt["queue_token"] = q_item.get("token_number") or q_item.get("token") or appt.get("queue_token")

    # Automatic in-app reminder notifications (24h and 1h before confirmed appointments)
    now_dt = datetime.now(timezone.utc)
    for appt in appointments:
        if (appt.get("status") or "").upper() in ["CONFIRMED", "APPROVED"] and appt.get("appointment_date") and appt.get("appointment_time"):
            try:
                time_clean = appt["appointment_time"].strip().upper()
                try:
                    p_time = datetime.strptime(time_clean, "%I:%M %p").time()
                except ValueError:
                    p_time = datetime.strptime(time_clean, "%H:%M").time()
                appt_dt = datetime.strptime(appt["appointment_date"], "%Y-%m-%d").replace(
                    hour=p_time.hour, minute=p_time.minute, tzinfo=timezone.utc
                )
                diff_hours = (appt_dt - now_dt).total_seconds() / 3600.0
                patient_id_str = str(appt.get("patient_id"))
                
                if 0 < diff_hours <= 24:
                    exists_24 = db.notifications.find_one({
                        "recipient_id": patient_id_str,
                        "appointment_id": str(appt["_id"]),
                        "type": "APPOINTMENT_REMINDER_24H"
                    })
                    if not exists_24:
                        db.notifications.insert_one({
                            "recipient_id": patient_id_str,
                            "recipient_role": "PATIENT",
                            "title": "Upcoming Consultation in 24 Hours",
                            "message": f"Reminder: Your consultation with Dr. {appt.get('doctor_name')} is scheduled for {appt['appointment_date']} at {appt['appointment_time']}.",
                            "type": "APPOINTMENT_REMINDER_24H",
                            "appointment_id": str(appt["_id"]),
                            "read": False,
                            "created_at": now_dt
                        })
                if 0 < diff_hours <= 1:
                    exists_1 = db.notifications.find_one({
                        "recipient_id": patient_id_str,
                        "appointment_id": str(appt["_id"]),
                        "type": "APPOINTMENT_REMINDER_1H"
                    })
                    if not exists_1:
                        db.notifications.insert_one({
                            "recipient_id": patient_id_str,
                            "recipient_role": "PATIENT",
                            "title": "Consultation Starting in 1 Hour",
                            "message": f"Urgent Reminder: Your consultation with Dr. {appt.get('doctor_name')} starts in 1 hour at {appt['appointment_time']}.",
                            "type": "APPOINTMENT_REMINDER_1H",
                            "appointment_id": str(appt["_id"]),
                            "read": False,
                            "created_at": now_dt
                        })
            except Exception as e:
                pass

    serialized = serialize_doc(appointments)
    
    # Return structured pagination response
    return jsonify({
        "appointments": serialized,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "stats": {
            "total": total_count,
            "approved": approved_count,
            "pending": pending_count,
            "completed": completed_count,
            "cancelled": cancelled_count
        }
    }), 200

@appointment_bp.route("/<appointment_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    if not appt.get("booking_id"):
        appt["booking_id"] = f"APT-{str(appt['_id'])[-6:].upper()}"
        
    if not appt.get("patient_name") and appt.get("patient_id"):
        pat = db.patients.find_one({"_id": appt["patient_id"]})
        if pat:
            appt["patient_name"] = pat.get("name")
            appt["patient_phone"] = pat.get("phone")
            appt["patient_email"] = pat.get("email")
            
    if appt.get("doctor_id"):
        doc = db.doctors.find_one({"_id": appt["doctor_id"]})
        if doc:
            appt["doctor_name"] = doc.get("name") or appt.get("doctor_name")
            appt["specialty"] = doc.get("specialty") or appt.get("specialty")
            appt["doctor_room"] = doc.get("room_number", "OPD-101")
            appt["doctor_experience"] = doc.get("experience_years", 10)
            if not appt.get("hospital_name"):
                appt["hospital_name"] = doc.get("hospital_name") or doc.get("hospital")

    if appt.get("hospital_id"):
        hosp = db.hospitals.find_one({"_id": appt["hospital_id"]})
        if hosp:
            appt["hospital_name"] = hosp.get("name") or appt.get("hospital_name")
            appt["hospital_address"] = hosp.get("address") or hosp.get("city") or "Facility Address"
            appt["hospital_phone"] = hosp.get("phone") or "+91 40 2345 6789"
            appt["hospital_city"] = hosp.get("city", "Hyderabad")
            
    return jsonify(serialize_doc(appt)), 200

@appointment_bp.route("/<appointment_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    existing = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    data = request.get_json() or {}
    data.pop("_id", None)
    
    current_user = g.current_user
    if current_user.get("role") == "PATIENT":
        data.pop("approval_status", None)
        
    if "status" in data:
        data["status"] = data["status"].upper()
        if data["status"] in ["APPROVED", "CONFIRMED"]:
            data["approval_status"] = "APPROVED"
        elif data["status"] == "CANCELLED":
            data["approval_status"] = "REJECTED"
            
    if "patient_id" in data and is_valid_object_id(data["patient_id"]):
        data["patient_id"] = ObjectId(data["patient_id"])
    if "doctor_id" in data and is_valid_object_id(data["doctor_id"]):
        data["doctor_id"] = ObjectId(data["doctor_id"])
    if "hospital_id" in data and is_valid_object_id(data["hospital_id"]):
        data["hospital_id"] = ObjectId(data["hospital_id"])
        
    data["updated_at"] = datetime.now(timezone.utc)
    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": data})
    
    # Sync with approvals collection if it exists
    if "status" in data:
        sync_status = "APPROVED" if data["status"] in ["APPROVED", "CONFIRMED"] else ("REJECTED" if data["status"] == "CANCELLED" else data["status"])
        db.approvals.update_one(
            {"appointment_id": ObjectId(appointment_id)},
            {"$set": {"status": sync_status, "updated_at": datetime.now(timezone.utc)}}
        )
        
    updated_doc = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    return jsonify({
        "message": "Appointment updated successfully",
        "appointment": serialize_doc(updated_doc)
    }), 200

@appointment_bp.route("/<appointment_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_appointment(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    result = db.appointments.delete_one({"_id": ObjectId(appointment_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    # Also delete approval record if present
    db.approvals.delete_one({"appointment_id": ObjectId(appointment_id)})
    return jsonify({"message": "Appointment deleted/cancelled successfully"}), 200

# ============================================================
# CANCELLATION FLOW (SOFT-CANCEL, SLOT RELEASE, QUEUE REMOVAL, NOTIFICATIONS)
# ============================================================
@appointment_bp.route("/<appointment_id>/cancel", methods=["POST"], strict_slashes=False)
@token_required
def cancel_appointment(appointment_id):
    """
    Safely cancels an appointment:
    - Verifies appointment exists and is in a cancellable status (PENDING, APPROVED, CONFIRMED)
    - Verifies appointment is for a future time slot (prevents cancelling past/completed visits)
    - Updates appointment status to 'CANCELLED' with cancellation metadata
    - Removes appointment from live queue (db.queue)
    - Creates notifications for both patient and doctor in db.notifications
    """
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    role = current_user.get("role", "PATIENT")

    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400

    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404

    # Permission check: Patients can only cancel their own appointments
    if role == "PATIENT":
        patient_record = db.patients.find_one({"user_id": user_id})
        patient_id = patient_record["_id"] if patient_record else None
        if appt.get("patient_id") and patient_id and str(appt["patient_id"]) != str(patient_id):
            return jsonify({"error": "Forbidden", "detail": "You can only cancel your own appointments"}), 403

    current_status = (appt.get("status") or "").upper()
    if current_status == "CANCELLED":
        return jsonify({"error": "Bad Request", "detail": "Appointment is already cancelled"}), 400
    if current_status in ["COMPLETED", "CONSULTED"]:
        return jsonify({"error": "Bad Request", "detail": "Cannot cancel an appointment that has already been completed"}), 400

    # Verify future appointment & 2-hour window check
    appt_date_str = appt.get("appointment_date")
    appt_time_str = appt.get("appointment_time")
    now_dt = datetime.now(timezone.utc)
    today_str = now_dt.strftime("%Y-%m-%d")

    if appt_date_str and appt_date_str < today_str:
        return jsonify({"error": "Bad Request", "detail": "Cannot cancel past appointments."}), 400

    # 2-hour cancellation rule
    if appt_date_str and appt_time_str:
        try:
            time_clean = appt_time_str.strip().upper()
            try:
                parsed_time = datetime.strptime(time_clean, "%I:%M %p").time()
            except ValueError:
                parsed_time = datetime.strptime(time_clean, "%H:%M").time()
            appt_dt = datetime.strptime(appt_date_str, "%Y-%m-%d").replace(
                hour=parsed_time.hour, minute=parsed_time.minute, tzinfo=timezone.utc
            )
            diff_seconds = (appt_dt - now_dt).total_seconds()
            if 0 <= diff_seconds < 7200: # within 2 hours
                return jsonify({
                    "error": "Cancellation window closed",
                    "detail": "Cancellation is not permitted within 2 hours of scheduled consultation."
                }), 400
        except Exception as e:
            pass

    data = request.get_json() or {}
    cancel_reason = (data.get("reason") or "").strip()
    other_reason = (data.get("other_reason") or "").strip()
    if cancel_reason.lower() == "other" and other_reason:
        cancel_reason = f"Other: {other_reason}"
    elif other_reason and not cancel_reason:
        cancel_reason = other_reason

    if not cancel_reason:
        return jsonify({
            "error": "Validation Error",
            "detail": "Cancellation reason is required so your doctor understands the cancellation."
        }), 400

    now_iso = now_dt.isoformat()

    # Soft cancel update
    update_data = {
        "status": "CANCELLED",
        "approval_status": "CANCELLED",
        "cancelled_at": now_iso,
        "cancelled_by": user_id,
        "cancelled_by_role": role,
        "cancel_reason": cancel_reason,
        "updated_at": now_dt
    }

    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": update_data})

    # Sync approval document
    db.approvals.update_one(
        {"appointment_id": ObjectId(appointment_id)},
        {"$set": {"status": "CANCELLED", "cancel_reason": cancel_reason, "updated_at": now_dt}}
    )

    # Remove from live queue if queued
    db.queue.delete_many({
        "$or": [
            {"appointment_id": ObjectId(appointment_id)},
            {"appointment_id": str(appointment_id)}
        ]
    })

    # Log to audit_logs
    try:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="APPOINTMENT_CANCELLED",
            resource="APPOINTMENTS",
            resource_id=str(appointment_id),
            details=f"Appointment {appt.get('booking_id', appointment_id)} cancelled: {cancel_reason}"
        )
    except Exception as e:
        print("Audit log error:", e)

    # Create notification for patient
    patient_id_val = appt.get("patient_id")
    if patient_id_val:
        db.notifications.insert_one({
            "recipient_id": str(patient_id_val),
            "recipient_role": "PATIENT",
            "title": "Appointment Cancelled",
            "message": f"Your consultation with {appt.get('doctor_name', 'your doctor')} scheduled for {appt_date_str} at {appt_time_str} has been cancelled ({cancel_reason}).",
            "type": "APPOINTMENT_CANCELLED",
            "appointment_id": str(appointment_id),
            "read": False,
            "created_at": now_dt
        })

    # Create notification for doctor
    doctor_id_val = appt.get("doctor_id")
    if doctor_id_val:
        db.notifications.insert_one({
            "recipient_id": str(doctor_id_val),
            "recipient_role": "DOCTOR",
            "title": "Appointment Slot Released",
            "message": f"Appointment with patient {appt.get('patient_name', 'Patient')} for {appt_date_str} at {appt_time_str} was cancelled.",
            "type": "APPOINTMENT_CANCELLED",
            "appointment_id": str(appointment_id),
            "read": False,
            "created_at": now_dt
        })

    updated_doc = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    return jsonify({
        "message": "Appointment cancelled successfully. Slot has been released.",
        "appointment_id": str(appointment_id),
        "status": "CANCELLED",
        "appointment": serialize_doc(updated_doc)
    }), 200

# ============================================================
# RESCHEDULE FLOW (SERVER-SIDE DOUBLE-BOOKING CHECK, STATUS PENDING, AUDIT LOG)
# ============================================================
@appointment_bp.route("/<appointment_id>/reschedule", methods=["POST"], strict_slashes=False)
@token_required
def reschedule_appointment(appointment_id):
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    role = current_user.get("role", "PATIENT")

    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400

    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404

    # Permission check
    if role == "PATIENT":
        patient_record = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email", "").lower()}]})
        patient_id = patient_record["_id"] if patient_record else None
        if appt.get("patient_id") and patient_id and str(appt["patient_id"]) != str(patient_id):
            return jsonify({"error": "Forbidden", "detail": "You can only reschedule your own appointments"}), 403

    current_status = (appt.get("status") or "").upper()
    if current_status == "CANCELLED":
        return jsonify({"error": "Bad Request", "detail": "Cannot reschedule a cancelled appointment"}), 400
    if current_status in ["COMPLETED", "CONSULTED"]:
        return jsonify({"error": "Bad Request", "detail": "Cannot reschedule an appointment that has already been completed"}), 400

    data = request.get_json() or {}
    new_date = data.get("appointment_date") or data.get("date")
    new_time = data.get("appointment_time") or data.get("time")

    if not new_date or not new_time:
        return jsonify({"error": "Validation Error", "detail": "New appointment date and time slot are required"}), 400

    # Prevent server-side double booking for the same doctor
    conflict = db.appointments.find_one({
        "doctor_id": appt.get("doctor_id"),
        "appointment_date": new_date,
        "appointment_time": new_time,
        "_id": {"$ne": ObjectId(appointment_id)},
        "status": {"$in": ["PENDING", "APPROVED", "CONFIRMED"]}
    })
    if conflict:
        return jsonify({
            "error": "Slot Conflict",
            "detail": "This consultation slot is already reserved for this doctor. Please pick another time slot."
        }), 409

    now_dt = datetime.now(timezone.utc)
    # Reschedule returns appointment to PENDING status if approval is required
    update_data = {
        "appointment_date": new_date,
        "appointment_time": new_time,
        "status": "PENDING",
        "approval_status": "PENDING",
        "rescheduled_at": now_dt.isoformat(),
        "rescheduled_by": user_id,
        "updated_at": now_dt
    }

    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": update_data})
    db.approvals.update_one(
        {"appointment_id": ObjectId(appointment_id)},
        {"$set": {
            "appointment_date": new_date,
            "appointment_time": new_time,
            "status": "PENDING",
            "updated_at": now_dt
        }}
    )

    # Write to audit_logs
    try:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="APPOINTMENT_RESCHEDULED",
            resource="APPOINTMENTS",
            resource_id=str(appointment_id),
            details=f"Appointment {appt.get('booking_id', appointment_id)} rescheduled to {new_date} at {new_time}"
        )
    except Exception as e:
        print("Audit log error:", e)

    # Notifications
    if appt.get("doctor_id"):
        db.notifications.insert_one({
            "recipient_id": str(appt["doctor_id"]),
            "recipient_role": "DOCTOR",
            "title": "Appointment Rescheduled",
            "message": f"Patient {appt.get('patient_name', 'Patient')} rescheduled consultation {appt.get('booking_id', '')} to {new_date} at {new_time}.",
            "type": "APPOINTMENT_RESCHEDULED",
            "appointment_id": str(appointment_id),
            "read": False,
            "created_at": now_dt
        })

    updated_doc = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    return jsonify({
        "message": "Appointment rescheduled successfully. Status updated to Pending for clearance.",
        "appointment": serialize_doc(updated_doc)
    }), 200


# ============================================================
@appointment_bp.route("/<appointment_id>/rate", methods=["POST"], strict_slashes=False)
@token_required
def rate_appointment(appointment_id):
    """
    Submits a rating and review for an appointment:
    - Verifies appointment exists
    - Saves rating (1-5), review text, and timestamp
    - Logs to audit_logs
    """
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    role = current_user.get("role", "PATIENT")

    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400

    appt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404

    data = request.get_json() or {}
    rating = data.get("rating")
    feedback = (data.get("feedback") or data.get("review") or "").strip()

    if not rating or not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
        return jsonify({"error": "Validation Error", "detail": "Rating must be a number between 1 and 5"}), 400

    now_dt = datetime.now(timezone.utc)
    db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "rating": rating,
            "patient_feedback": feedback,
            "rated_at": now_dt.isoformat()
        }}
    )

    try:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=role,
            action="APPOINTMENT_RATED",
            resource="APPOINTMENTS",
            resource_id=str(appointment_id),
            details=f"Appointment {appt.get('booking_id', appointment_id)} rated {rating}/5"
        )
    except Exception as e:
        pass

    return jsonify({"message": "Thank you! Your feedback has been recorded.", "rating": rating}), 200


