import os
import re
import secrets
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, g, send_from_directory
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.ai_vision import strip_exif_and_sanitize
from app.services.audit_service import log_audit_action
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

# ============================================================
# LIST / QUERY HEALTH RECORDS
# GET /api/health-records?patient=&type=&from=&to=&q=&sort=&page=&limit=
# ============================================================
@health_records_bp.route("", methods=["GET"], endpoint="list_health_records_root", strict_slashes=False)
@health_records_bp.route("/", methods=["GET"], endpoint="list_health_records_slash", strict_slashes=False)
@token_required
def list_health_records():
    db = get_database()
    current_user = g.current_user
    user_role = (current_user.get("role") or "PATIENT").upper()
    user_id = str(current_user["_id"])

    # Query arguments
    patient_arg = (request.args.get("patient") or request.args.get("patient_id") or "").strip()
    type_arg = (request.args.get("type") or request.args.get("record_type") or "").strip()
    from_date = (request.args.get("from") or "").strip()
    to_date = (request.args.get("to") or "").strip()
    query_str = (request.args.get("q") or request.args.get("search") or "").strip()
    sort_arg = (request.args.get("sort") or "latest").strip()
    
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = max(1, min(100, int(request.args.get("limit", 25))))
    except ValueError:
        page = 1
        limit = 25

    # Base query: soft deletes excluded, tests excluded unless explicitly asked
    base_query = {
        "deleted_at": None,
        "is_test": {"$ne": True}
    }

    # Doctor access authorization check
    if user_role == "DOCTOR":
        doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
        doctor_oid = doc["_id"] if doc else None
        
        # Approved patients list
        approvals = list(db.approvals.find({
            "$or": [
                {"doctor_id": doctor_oid},
                {"approved_by": user_id},
                {"status": "APPROVED"}
            ]
        }))
        approved_patient_ids = [a["patient_id"] for a in approvals if a.get("patient_id")]
        
        # In doctor mode, allow access to approved patients or records created by this doctor
        if approved_patient_ids:
            base_query["$or"] = [
                {"patient_id": {"$in": approved_patient_ids}},
                {"doctor_id": doctor_oid},
                {"created_by_user_id": user_id}
            ]
        elif doctor_oid:
            base_query["$or"] = [
                {"doctor_id": doctor_oid},
                {"created_by_user_id": user_id}
            ]
    elif user_role == "PATIENT":
        pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
        if pat:
            base_query["patient_id"] = pat["_id"]
        else:
            base_query["patient_id"] = ObjectId()  # Empty match safe guard

    # Patient filter
    if patient_arg and patient_arg.lower() != "all":
        if is_valid_object_id(patient_arg):
            base_query["patient_id"] = ObjectId(patient_arg)
        else:
            pat_match = db.patients.find_one({
                "$or": [
                    {"patient_code": patient_arg},
                    {"patient_id_code": patient_arg},
                    {"patient_id": patient_arg}
                ]
            })
            if pat_match:
                base_query["patient_id"] = pat_match["_id"]
            else:
                base_query["patient_code"] = patient_arg

    # Type filter (CONSULTATION, DIAGNOSIS, PRESCRIPTION, CHECKUP)
    if type_arg and type_arg.upper() != "ALL":
        base_query["record_type"] = type_arg.upper()

    # Date Range filter (YYYY-MM-DD)
    if from_date or to_date:
        date_q = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        base_query["record_date"] = date_q

    # Smart Search & Operators
    if query_str:
        # Check for smart operators: type:, doctor:, date:
        and_clauses = []
        tokens = query_str.split()
        free_text_parts = []
        for token in tokens:
            if ":" in token:
                key, val = token.split(":", 1)
                key_l = key.lower()
                val_clean = val.strip()
                if key_l in ["type", "t"]:
                    if val_clean.lower() in ["rx", "prescription"]:
                        and_clauses.append({"record_type": "PRESCRIPTION"})
                    elif val_clean.lower() in ["dx", "diagnosis"]:
                        and_clauses.append({"record_type": "DIAGNOSIS"})
                    elif val_clean.lower() in ["consult", "consultation"]:
                        and_clauses.append({"record_type": "CONSULTATION"})
                    elif val_clean.lower() in ["checkup", "check"]:
                        and_clauses.append({"record_type": "CHECKUP"})
                elif key_l in ["doctor", "doc"]:
                    and_clauses.append({"doctor_name": {"$regex": re.escape(val_clean), "$options": "i"}})
                elif key_l in ["date", "d"]:
                    and_clauses.append({"record_date": {"$regex": f"^{re.escape(val_clean)}"}})
                elif key_l in ["icd", "icd10"]:
                    and_clauses.append({"icd10_code": {"$regex": re.escape(val_clean), "$options": "i"}})
                elif key_l in ["med", "drug"]:
                    and_clauses.append({"medications.name": {"$regex": re.escape(val_clean), "$options": "i"}})
                elif key_l in ["status"]:
                    and_clauses.append({"status": val_clean.lower()})
                else:
                    free_text_parts.append(token)
            else:
                free_text_parts.append(token)

        if free_text_parts:
            ft_clean = " ".join(free_text_parts)
            ft_regex = re.escape(ft_clean)
            and_clauses.append({
                "$or": [
                    {"title": {"$regex": ft_regex, "$options": "i"}},
                    {"diagnosis": {"$regex": ft_regex, "$options": "i"}},
                    {"icd10_code": {"$regex": ft_regex, "$options": "i"}},
                    {"notes": {"$regex": ft_regex, "$options": "i"}},
                    {"patient_name": {"$regex": ft_regex, "$options": "i"}},
                    {"patient_code": {"$regex": ft_regex, "$options": "i"}},
                    {"doctor_name": {"$regex": ft_regex, "$options": "i"}},
                    {"medications.name": {"$regex": ft_regex, "$options": "i"}},
                    {"medications.drug_class": {"$regex": ft_regex, "$options": "i"}}
                ]
            })

        if and_clauses:
            if "$and" in base_query:
                base_query["$and"].extend(and_clauses)
            else:
                base_query["$and"] = and_clauses

    # Sorting
    sort_dir = -1
    sort_field = "record_date"
    if sort_arg == "oldest":
        sort_dir = 1
        sort_field = "record_date"
    elif sort_arg == "title":
        sort_dir = 1
        sort_field = "title"
    elif sort_arg == "patient":
        sort_dir = 1
        sort_field = "patient_name"
    elif sort_arg == "type":
        sort_dir = 1
        sort_field = "record_type"

    # Compute Stats based on the filtered query (without type filter to reflect current patient/date scope)
    stats_query = dict(base_query)
    stats_query.pop("record_type", None)

    all_matched = list(db.health_records.find(stats_query, {
        "record_type": 1,
        "medications": 1,
        "diagnosis": 1,
        "patient_id": 1
    }))

    stat_records = len(all_matched)
    stat_consultations = sum(1 for r in all_matched if r.get("record_type") == "CONSULTATION")
    stat_prescriptions = sum(1 for r in all_matched if r.get("record_type") == "PRESCRIPTION")
    stat_diagnoses = sum(1 for r in all_matched if r.get("record_type") == "DIAGNOSIS" or (r.get("diagnosis") and str(r.get("diagnosis")).strip()))
    stat_checkups = sum(1 for r in all_matched if r.get("record_type") == "CHECKUP")

    total_count = db.health_records.count_documents(base_query)
    total_pages = max(1, (total_count + limit - 1) // limit)
    skip = (page - 1) * limit

    cursor = db.health_records.find(base_query).sort([
        (sort_field, sort_dir),
        ("_id", -1)
    ]).skip(skip).limit(limit)

    items = list(cursor)

    # Enrich missing patient info if needed
    p_cache = {}
    for r in items:
        pid = r.get("patient_id")
        if pid and (not r.get("patient_name") or not r.get("patient_code")):
            p_str = str(pid)
            if p_str not in p_cache:
                p_cache[p_str] = db.patients.find_one({"_id": pid})
            p = p_cache.get(p_str)
            if p:
                r["patient_name"] = p.get("name", "Registered Patient")
                r["patient_code"] = p.get("patient_code") or str(pid)[-6:]
                r["patient_age"] = p.get("age")
                r["patient_gender"] = p.get("gender")

    # Audit log view action
    try:
        log_audit_action(
            db=db,
            user_id=user_id,
            user_role=user_role,
            action="HEALTH_RECORDS_VIEW",
            resource="HEALTH_RECORDS",
            resource_id=patient_arg or "ALL",
            details=f"Viewed health records list. Query: '{query_str}', Type: '{type_arg}', Records returned: {len(items)}"
        )
    except Exception as e:
        print(f"Warning: Failed to log audit action: {e}")

    serialized_items = serialize_doc(items)

    return jsonify({
        "items": serialized_items,
        "records": serialized_items,  # Backwards compatibility
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "stats": {
            "records": stat_records,
            "consultations": stat_consultations,
            "prescriptions": stat_prescriptions,
            "diagnoses": stat_diagnoses,
            "checkups": stat_checkups
        }
    }), 200

# ============================================================
# CREATE HEALTH RECORD
# POST /api/health-records
# ============================================================
@health_records_bp.route("", methods=["POST"], endpoint="create_health_record_root", strict_slashes=False)
@health_records_bp.route("/", methods=["POST"], endpoint="create_health_record_slash", strict_slashes=False)
@token_required
def create_health_record():
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = (current_user.get("role") or "PATIENT").upper()

    data = request.get_json() if request.is_json else request.form.to_dict()
    data = data or {}

    patient_identifier = data.get("patient_id") or data.get("patient_code")
    if not patient_identifier:
        return jsonify({"error": "Validation Error", "detail": "patient_id is required"}), 400

    patient = None
    if is_valid_object_id(patient_identifier):
        patient = db.patients.find_one({"_id": ObjectId(patient_identifier)})
    if not patient:
        patient = db.patients.find_one({
            "$or": [
                {"patient_code": str(patient_identifier)},
                {"patient_id_code": str(patient_identifier)}
            ]
        })

    if not patient:
        return jsonify({"error": "Validation Error", "detail": f"Patient '{patient_identifier}' not found"}), 404

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Validation Error", "detail": "title is required"}), 400

    record_type = (data.get("record_type") or "CONSULTATION").upper()
    if record_type not in ["CONSULTATION", "DIAGNOSIS", "PRESCRIPTION", "CHECKUP"]:
        record_type = "CONSULTATION"

    # Normalize medications
    medications = data.get("medications", [])
    if isinstance(medications, str):
        try:
            import json
            medications = json.loads(medications)
        except Exception:
            medications = [{"name": m.strip(), "dose": "", "frequency": "", "duration": "", "drug_class": "General"} for m in medications.split(",") if m.strip()]

    # Normalize attachments
    attachments = data.get("attachments", [])
    if isinstance(attachments, str):
        try:
            import json
            attachments = json.loads(attachments)
        except Exception:
            attachments = []

    now = datetime.now(timezone.utc)
    rec_date = data.get("record_date") or now.strftime("%Y-%m-%d")

    record_doc = {
        "patient_id": patient["_id"],
        "patient_code": str(patient.get("patient_code")),
        "patient_name": patient.get("name"),
        "patient_age": patient.get("age"),
        "patient_gender": patient.get("gender"),
        "doctor_id": current_user["_id"],
        "created_by_user_id": user_id,
        "doctor_name": data.get("doctor_name") or current_user.get("name", "Dr. Ananya Sharma"),
        "hospital_name": data.get("hospital_name") or "CareBridge Medical Center",
        "record_type": record_type,
        "title": title,
        "description": data.get("description") or data.get("notes") or "",
        "diagnosis": data.get("diagnosis", ""),
        "icd10_code": data.get("icd10_code", ""),
        "medications": medications,
        "notes": data.get("notes") or data.get("description") or "",
        "attachments": attachments,
        "file_url": attachments[0]["file_url"] if attachments else data.get("file_url"),
        "file_name": attachments[0]["file_name"] if attachments else data.get("file_name"),
        "status": (data.get("status") or "final").lower(),
        "is_abnormal": bool(data.get("is_abnormal", False)),
        "record_date": rec_date,
        "recorded_at": now,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
        "is_test": False
    }

    result = db.health_records.insert_one(record_doc)
    record_doc["_id"] = result.inserted_id

    # Log audit action
    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user_role,
        action="HEALTH_RECORD_CREATE",
        resource="HEALTH_RECORDS",
        resource_id=str(result.inserted_id),
        details=f"Created {record_type} record '{title}' for patient {patient.get('name')} ({patient.get('patient_code')})"
    )

    return jsonify({
        "message": "Health record created successfully",
        "item": serialize_doc(record_doc),
        "record": serialize_doc(record_doc)
    }), 201

# ============================================================
# UPDATE HEALTH RECORD
# PUT /api/health-records/<record_id>
# ============================================================
@health_records_bp.route("/<record_id>", methods=["PUT", "PATCH"], strict_slashes=False)
@token_required
def update_health_record(record_id):
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = (current_user.get("role") or "PATIENT").upper()

    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400

    existing = db.health_records.find_one({"_id": ObjectId(record_id), "deleted_at": None})
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Health record not found"}), 404

    data = request.get_json() or {}
    update_data = {}
    
    allowed_fields = [
        "title", "description", "diagnosis", "icd10_code", "record_type",
        "medications", "notes", "attachments", "status", "is_abnormal",
        "record_date", "doctor_name", "hospital_name"
    ]
    
    for f in allowed_fields:
        if f in data:
            if f == "record_type":
                update_data[f] = str(data[f]).upper()
            elif f == "status":
                update_data[f] = str(data[f]).lower()
            else:
                update_data[f] = data[f]

    update_data["updated_at"] = datetime.now(timezone.utc)

    db.health_records.update_one({"_id": ObjectId(record_id)}, {"$set": update_data})
    updated_doc = db.health_records.find_one({"_id": ObjectId(record_id)})

    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user_role,
        action="HEALTH_RECORD_UPDATE",
        resource="HEALTH_RECORDS",
        resource_id=record_id,
        details=f"Updated health record '{existing.get('title')}'"
    )

    return jsonify({
        "message": "Health record updated successfully",
        "item": serialize_doc(updated_doc),
        "record": serialize_doc(updated_doc)
    }), 200

# ============================================================
# SOFT DELETE HEALTH RECORD
# DELETE /api/health-records/<record_id>
# ============================================================
@health_records_bp.route("/<record_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_health_record(record_id):
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = (current_user.get("role") or "PATIENT").upper()

    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400

    existing = db.health_records.find_one({"_id": ObjectId(record_id), "deleted_at": None})
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Health record not found"}), 404

    now = datetime.now(timezone.utc)
    db.health_records.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": {"deleted_at": now, "updated_at": now}}
    )

    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user_role,
        action="HEALTH_RECORD_SOFT_DELETE",
        resource="HEALTH_RECORDS",
        resource_id=record_id,
        details=f"Soft deleted health record '{existing.get('title')}' for patient {existing.get('patient_name')}"
    )

    return jsonify({
        "message": "Health record deleted successfully",
        "record_id": record_id
    }), 200

# ============================================================
# RESTORE (UNDO SOFT DELETE)
# POST /api/health-records/<record_id>/restore
# ============================================================
@health_records_bp.route("/<record_id>/restore", methods=["POST"], strict_slashes=False)
@token_required
def restore_health_record(record_id):
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = (current_user.get("role") or "PATIENT").upper()

    if not is_valid_object_id(record_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid record ID"}), 400

    now = datetime.now(timezone.utc)
    res = db.health_records.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": {"deleted_at": None, "updated_at": now}}
    )

    if res.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Health record not found"}), 404

    log_audit_action(
        db=db,
        user_id=user_id,
        user_role=user_role,
        action="HEALTH_RECORD_RESTORE",
        resource="HEALTH_RECORDS",
        resource_id=record_id,
        details="Restored soft-deleted health record"
    )

    return jsonify({"message": "Health record restored successfully"}), 200

# ============================================================
# UPLOAD ATTACHMENT
# ============================================================
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
