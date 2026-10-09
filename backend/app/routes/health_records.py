import os
import secrets
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, g, send_from_directory
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.ai_vision import strip_exif_and_sanitize
from app.config import UPLOAD_FOLDER

health_records_bp = Blueprint("health_records", __name__)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp", "docx", "txt"}
MAX_RECORD_FILES = 10
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def purge_file_from_disk(file_url):
    if not file_url:
        return
    try:
        filename = file_url.rsplit("/", 1)[-1]
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath) and os.path.isfile(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Warning: Failed to delete attached file {file_url} from storage: {e}")

@health_records_bp.route("", methods=["POST"], strict_slashes=False)
@health_records_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_health_record():
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "PATIENT").upper()

    attachments = []
    
    # Handle multipart form data or JSON
    if request.is_json:
        data = request.get_json() or {}
        if data.get("attachments") and isinstance(data["attachments"], list):
            attachments = data["attachments"]
        elif data.get("file_url"):
            attachments.append({
                "file_name": data.get("file_name", "document.pdf"),
                "file_url": data.get("file_url"),
                "size_bytes": data.get("file_size", 0)
            })
    else:
        data = request.form.to_dict()
        raw_files = request.files.getlist("files") or request.files.getlist("file")
        
        if len(raw_files) > MAX_RECORD_FILES:
            return jsonify({"error": "Validation Error", "detail": f"Maximum {MAX_RECORD_FILES} files allowed per record"}), 400
            
        for file in raw_files:
            if not file or not file.filename:
                continue
            if not allowed_file(file.filename):
                return jsonify({"error": "Validation Error", "detail": f"File '{file.filename}' has unsupported extension. Allowed: PDF, PNG, JPG, WEBP"}), 400
                
            file_bytes = file.read()
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                return jsonify({"error": "Validation Error", "detail": f"File '{file.filename}' exceeds 10 MB limit"}), 400
                
            # Strip EXIF from images
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if ext in {"png", "jpg", "jpeg", "webp"}:
                clean_bytes, clean_name = strip_exif_and_sanitize(file_bytes, file.filename)
            else:
                clean_bytes, clean_name = file_bytes, secure_filename(file.filename)
                
            unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3)}_{clean_name}"
            save_path = os.path.join(UPLOAD_FOLDER, unique_name)
            
            with open(save_path, "wb") as f:
                f.write(clean_bytes)
                
            attachments.append({
                "file_name": clean_name,
                "file_url": f"/api/health-records/files/{unique_name}",
                "size_bytes": len(clean_bytes)
            })

    patient_id = data.get("patient_id")
    if not patient_id:
        if user_role == "PATIENT":
            p_doc = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
            if p_doc:
                patient_id = str(p_doc["_id"])
                
    if not patient_id or not is_valid_object_id(patient_id):
        return jsonify({"error": "Validation Error", "detail": "Valid patient_id is required"}), 400
        
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404

    primary_file_url = attachments[0]["file_url"] if attachments else data.get("file_url")
    primary_file_name = attachments[0]["file_name"] if attachments else data.get("file_name")

    record_doc = {
        "patient_id": ObjectId(patient_id),
        "created_by_user_id": user_id,
        "record_type": data.get("record_type", "CONSULTATION").upper(),
        "title": data.get("title", "Clinical Medical Record"),
        "description": data.get("description", ""),
        "diagnosis": data.get("diagnosis", ""),
        "doctor_name": data.get("doctor_name", "Consulting Physician"),
        "hospital_name": data.get("hospital_name", "CareBridge Medical Center"),
        "medications": data.get("medications", []),
        "attachments": attachments,
        "file_url": primary_file_url,
        "file_name": primary_file_name,
        "record_date": data.get("record_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = db.health_records.insert_one(record_doc)
    record_doc["id"] = str(result.inserted_id)

    return jsonify({
        "message": "Health record created successfully",
        "record_id": str(result.inserted_id),
        "record": serialize_doc(record_doc)
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
        
    file_bytes = file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return jsonify({"error": "Validation Error", "detail": "File exceeds 10 MB limit"}), 400
        
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext in {"png", "jpg", "jpeg", "webp"}:
        clean_bytes, clean_name = strip_exif_and_sanitize(file_bytes, file.filename)
    else:
        clean_bytes, clean_name = file_bytes, secure_filename(file.filename)
        
    unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3)}_{clean_name}"
    save_path = os.path.join(UPLOAD_FOLDER, unique_name)
    
    with open(save_path, "wb") as f:
        f.write(clean_bytes)
    
    return jsonify({
        "message": "File uploaded successfully",
        "file_name": clean_name,
        "file_url": f"/api/health-records/files/{unique_name}",
        "size_bytes": len(clean_bytes)
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
@token_required
def delete_health_record(record_id):
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "PATIENT").upper()

    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400
        
    record = db.health_records.find_one({"_id": ObjectId(record_id)})
    if not record:
        return jsonify({"error": "Not Found", "detail": "Health record not found"}), 404

    # Permission check: owner patient or staff/admin/doctor
    if user_role == "PATIENT":
        patient = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
        if patient and record.get("patient_id") != patient["_id"]:
            return jsonify({"error": "Forbidden", "detail": "You do not have authorization to delete this health record"}), 403

    # Purge attached physical files from storage disk
    if record.get("file_url"):
        purge_file_from_disk(record["file_url"])
    if record.get("attachments") and isinstance(record["attachments"], list):
        for att in record["attachments"]:
            if att.get("file_url"):
                purge_file_from_disk(att["file_url"])

    db.health_records.delete_one({"_id": ObjectId(record_id)})
    return jsonify({"message": "Health record and attached files deleted successfully"}), 200

@health_records_bp.route("/batch-delete", methods=["POST"], strict_slashes=False)
@token_required
def batch_delete_health_records():
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "PATIENT").upper()

    data = request.get_json() or {}
    record_ids = data.get("record_ids", [])
    
    if not record_ids or not isinstance(record_ids, list):
        return jsonify({"error": "Validation Error", "detail": "record_ids array is required"}), 400

    deleted_count = 0
    for r_id in record_ids:
        if not is_valid_object_id(r_id):
            continue
        record = db.health_records.find_one({"_id": ObjectId(r_id)})
        if not record:
            continue

        if user_role == "PATIENT":
            patient = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
            if patient and record.get("patient_id") != patient["_id"]:
                continue

        # Purge attached files
        if record.get("file_url"):
            purge_file_from_disk(record["file_url"])
        if record.get("attachments") and isinstance(record["attachments"], list):
            for att in record["attachments"]:
                if att.get("file_url"):
                    purge_file_from_disk(att["file_url"])

        db.health_records.delete_one({"_id": ObjectId(r_id)})
        deleted_count += 1

    return jsonify({"message": f"Successfully deleted {deleted_count} record(s)", "deleted_count": deleted_count}), 200
