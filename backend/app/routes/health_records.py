import os
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, g, send_from_directory
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.config import UPLOAD_FOLDER

health_records_bp = Blueprint("health_records", __name__)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx", "txt"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@health_records_bp.route("", methods=["POST"], strict_slashes=False)
@health_records_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_health_record():
    db = get_database()
    
    # Handle multipart form data or JSON
    if request.is_json:
        data = request.get_json() or {}
        file_url = data.get("file_url")
        file_name = data.get("file_name")
    else:
        data = request.form.to_dict()
        file_url = None
        file_name = None
        if "file" in request.files:
            file = request.files["file"]
            if file and file.filename and allowed_file(file.filename):
                safe_name = secure_filename(file.filename)
                unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{safe_name}"
                save_path = os.path.join(UPLOAD_FOLDER, unique_name)
                file.save(save_path)
                file_url = f"/api/health-records/files/{unique_name}"
                file_name = safe_name
                
    patient_id = data.get("patient_id")
    if not patient_id or not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Valid patient_id is required"}), 400
        
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    record_doc = {
        "patient_id": ObjectId(patient_id),
        "record_type": data.get("record_type", "General Note"),
        "title": data.get("title", "Clinical Record"),
        "description": data.get("description", ""),
        "diagnosis": data.get("diagnosis", ""),
        "doctor_name": data.get("doctor_name", "Consulting Physician"),
        "hospital_name": data.get("hospital_name", "CareBridge Medical"),
        "medications": data.get("medications", []),
        "file_url": file_url or data.get("file_url"),
        "file_name": file_name or data.get("file_name"),
        "record_date": data.get("record_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.health_records.insert_one(record_doc)
    return jsonify({
        "message": "Health record created successfully",
        "record_id": str(result.inserted_id),
        "file_url": record_doc.get("file_url")
    }), 201

@health_records_bp.route("/upload", methods=["POST"], strict_slashes=False)
@token_required
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Validation Error", "detail": "No file part in request"}), 400
    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Validation Error", "detail": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Validation Error", "detail": f"Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
    safe_name = secure_filename(file.filename)
    unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{safe_name}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(save_path)
    
    return jsonify({
        "message": "File uploaded successfully",
        "file_name": safe_name,
        "file_url": f"/api/health-records/files/{unique_name}"
    }), 200

@health_records_bp.route("/files/<filename>", methods=["GET"], strict_slashes=False)
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@health_records_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_health_records(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    records = list(db.health_records.find({"patient_id": ObjectId(patient_id)}).sort("created_at", -1))
    return jsonify(serialize_doc(records)), 200

@health_records_bp.route("/<patient_id>/latest", methods=["GET"], strict_slashes=False)
@token_required
def get_latest_health_record(patient_id):
    db = get_database()
    if not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid patient ID"}), 400
        
    record = db.health_records.find_one({"patient_id": ObjectId(patient_id)}, sort=[("created_at", -1)])
    if not record:
        return jsonify({"error": "Not Found", "detail": "No health records found"}), 404
        
    return jsonify(serialize_doc(record)), 200

@health_records_bp.route("/<record_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_health_record(record_id):
    db = get_database()
    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    res = db.health_records.update_one({"_id": ObjectId(record_id)}, {"$set": data})
    if res.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Health record not found"}), 404
        
    return jsonify({"message": "Health record updated successfully"}), 200

@health_records_bp.route("/<record_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_health_record(record_id):
    db = get_database()
    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400
    db.health_records.delete_one({"_id": ObjectId(record_id)})
    return jsonify({"message": "Health record deleted successfully"}), 200
