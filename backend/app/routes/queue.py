from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id

queue_bp = Blueprint("queue", __name__)

@queue_bp.route("", methods=["POST"], strict_slashes=False)
@queue_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_queue_entry():
    db = get_database()
    data = request.get_json() or {}
    appointment_id = data.get("appointment_id")
    
    if not appointment_id or not is_valid_object_id(appointment_id):
        return jsonify({"error": "Validation Error", "detail": "Valid appointment_id is required"}), 400
        
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return jsonify({"error": "Not Found", "detail": "Appointment not found"}), 404
        
    existing_queue = db.queue.find_one({"appointment_id": ObjectId(appointment_id)})
    if existing_queue:
        return jsonify({
            "message": "Appointment is already in the queue",
            "queue_id": str(existing_queue["_id"]),
            "token_number": existing_queue.get("token_number"),
            "status": existing_queue.get("status")
        }), 200
        
    # Find OPD pass or auto-generate
    opd_pass = db.opd_passes.find_one({"appointment_id": ObjectId(appointment_id)})
    opd_pass_id = opd_pass["_id"] if opd_pass else None
    
    last_queue = db.queue.find_one(
        {
            "doctor_id": appointment.get("doctor_id"),
            "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]}
        },
        sort=[("token_number", -1)]
    )
    token_number = (last_queue["token_number"] + 1) if last_queue and "token_number" in last_queue else 1
    
    queue_doc = {
        "appointment_id": ObjectId(appointment_id),
        "opd_pass_id": opd_pass_id,
        "patient_id": appointment.get("patient_id"),
        "hospital_id": appointment.get("hospital_id"),
        "doctor_id": appointment.get("doctor_id"),
        "patient_name": appointment.get("patient_name"),
        "doctor_name": appointment.get("doctor_name"),
        "token_number": token_number,
        "status": "WAITING",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.queue.insert_one(queue_doc)
    return jsonify({
        "message": "Patient added to live queue successfully",
        "queue_id": str(result.inserted_id),
        "appointment_id": appointment_id,
        "token_number": token_number,
        "status": "WAITING"
    }), 201

@queue_bp.route("", methods=["GET"], strict_slashes=False)
@queue_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_queue():
    db = get_database()
    doctor_id = request.args.get("doctor_id")
    hospital_id = request.args.get("hospital_id")
    status = request.args.get("status")
    
    query = {}
    if doctor_id and is_valid_object_id(doctor_id):
        query["doctor_id"] = ObjectId(doctor_id)
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
    if status:
        query["status"] = status.upper()
        
    entries = list(db.queue.find(query).sort("token_number", 1))
    
    # Calculate queue telemetry (serving token, waiting count)
    serving = db.queue.find_one({"status": "IN_CONSULTATION"}) or db.queue.find_one({"status": "CALLED"})
    serving_token = serving.get("token_number") if serving else (entries[0].get("token_number") if entries else 1)
    
    serialized = serialize_doc(entries)
    return jsonify({
        "queue": serialized,
        "current_token": serving_token,
        "total_in_queue": len(entries)
    } if not isinstance(serialized, list) else serialized), 200

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
        "status": {"$in": ["WAITING", "CALLED", "IN_CONSULTATION"]},
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
    
    allowed = ["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "CANCELLED"]
    if status and status not in allowed:
        return jsonify({"error": "Validation Error", "detail": f"Status must be one of {allowed}"}), 400
        
    data.pop("_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    res = db.queue.update_one({"_id": ObjectId(queue_id)}, {"$set": data})
    if res.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Queue entry not found"}), 404
        
    return jsonify({"message": "Queue status updated successfully"}), 200

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
