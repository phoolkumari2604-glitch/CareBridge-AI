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
    
    query = {}
    if hospital_id and is_valid_object_id(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
        
    doctors = list(db.doctors.find(query))
    return jsonify(serialize_doc(doctors)), 200

@doctor_bp.route("/<doctor_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_doctor(doctor_id):
    db = get_database()
    if not is_valid_object_id(doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
        
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
@staff_or_admin_required
def update_doctor(doctor_id):
    db = get_database()
    if not is_valid_object_id(doctor_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid doctor ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    
    if "hospital_id" in data and data["hospital_id"]:
        if is_valid_object_id(data["hospital_id"]):
            data["hospital_id"] = ObjectId(data["hospital_id"])
        else:
            return jsonify({"error": "Validation Error", "detail": "Invalid hospital ID"}), 400
            
    data["updated_at"] = datetime.now(timezone.utc)
    result = db.doctors.update_one({"_id": ObjectId(doctor_id)}, {"$set": data})
    if result.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Doctor not found"}), 404
        
    return jsonify({"message": "Doctor updated successfully"}), 200

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
