from datetime import datetime, timezone
import secrets
from flask import Blueprint, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import is_valid_object_id

smartflow_bp = Blueprint("smartflow", __name__)

@smartflow_bp.route("/<appointment_id>", methods=["POST"], strict_slashes=False)
@token_required
def run_smartflow(appointment_id):
    db = get_database()
    if not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid appointment ID"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    # 1. Approval
    approval = db.approvals.find_one({"appointment_id": ObjectId(appointment_id)})
    if not approval:
        approval_data = {
            "appointment_id": ObjectId(appointment_id),
            "patient_id": appointment["patient_id"],
            "status": "APPROVED",
            "approved_by": g.current_user["_id"],
            "approved_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        approval_result = db.approvals.insert_one(approval_data)
        approval_id = str(approval_result.inserted_id)
    else:
        db.approvals.update_one(
            {"_id": approval["_id"]},
            {"$set": {
                "status": "APPROVED",
                "approved_by": g.current_user["_id"],
                "approved_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        approval_id = str(approval["_id"])
        
    # 2. Update appointment
    db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "approval_status": "APPROVED",
            "status": "APPROVED",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # 3. Digital OPD Pass
    opd_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    if not opd_pass:
        pass_number = f"OPD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
        opd_pass_data = {
            "appointment_id": ObjectId(appointment_id),
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment.get("hospital_id"),
            "doctor_id": appointment.get("doctor_id"),
            "pass_number": pass_number,
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = db.opd_passes.insert_one(opd_pass_data)
        opd_pass_id = str(res.inserted_id)
    else:
        pass_number = opd_pass.get("pass_number")
        opd_pass_id = str(opd_pass["_id"])
        
    # 4. Live Queue
    queue_entry = db.queue.find_one({"appointment_id": ObjectId(appointment_id)})
    if not queue_entry:
        last_entry = db.queue.find_one(
            {
                "doctor_id": appointment.get("doctor_id"),
                "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]},
            },
            sort=[("token_number", -1)]
        )
        token_number = (last_entry["token_number"] + 1) if last_entry and "token_number" in last_entry else 1
        queue_data = {
            "appointment_id": ObjectId(appointment_id),
            "opd_pass_id": ObjectId(opd_pass_id),
            "patient_id": appointment["patient_id"],
            "hospital_id": appointment.get("hospital_id"),
            "doctor_id": appointment.get("doctor_id"),
            "token_number": token_number,
            "status": "WAITING",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        q_res = db.queue.insert_one(queue_data)
        queue_id = str(q_res.inserted_id)
    else:
        token_number = queue_entry.get("token_number", 1)
        queue_id = str(queue_entry["_id"])
        
    patients_ahead = db.queue.count_documents({
        "doctor_id": appointment.get("doctor_id"),
        "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]},
        "token_number": {"$lt": token_number}
    })
    
    return jsonify({
        "message": "SmartFlow completed successfully",
        "appointment": {
            "appointment_id": appointment_id,
            "date": appointment.get("appointment_date"),
            "time": appointment.get("appointment_time"),
            "status": "APPROVED",
            "approval_status": "APPROVED"
        },
        "approval": {
            "approval_id": approval_id,
            "status": "APPROVED"
        },
        "opd_pass": {
            "opd_pass_id": opd_pass_id,
            "pass_number": pass_number,
            "status": "ACTIVE"
        },
        "queue": {
            "queue_id": queue_id,
            "token_number": token_number,
            "status": "WAITING",
            "patients_ahead": patients_ahead,
            "queue_position": patients_ahead + 1
        }
    }), 200
