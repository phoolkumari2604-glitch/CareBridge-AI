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

    # Resolve patient argument if specified
    target_patient_id = None
    target_patient_code = None
    if patient_arg and patient_arg.lower() != "all":
        if is_valid_object_id(patient_arg):
            target_patient_id = ObjectId(patient_arg)
        else:
            pat_match = db.patients.find_one({
                "$or": [
                    {"patient_code": patient_arg},
                    {"patient_id_code": patient_arg},
                    {"patient_id": patient_arg}
                ]
            })
            if pat_match:
                target_patient_id = pat_match["_id"]
                target_patient_code = pat_match.get("patient_code")
            else:
                target_patient_code = patient_arg

    # Role-based access authorization check
    if user_role == "DOCTOR":
        if target_patient_id:
            base_query["$or"] = [
                {"patient_id": target_patient_id},
                {"patient_code": str(target_patient_code or patient_arg)}
            ]
        elif target_patient_code:
            base_query["patient_code"] = str(target_patient_code)
        else:
            # In full overview mode, allow doctor access to practice EHR records
            doc = db.doctors.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
            doctor_oid = doc["_id"] if doc else None
            # Find any assigned or approved patients
            approvals = list(db.approvals.find({
                "$or": [
                    {"doctor_id": doctor_oid},
                    {"approved_by": user_id},
                    {"status": "APPROVED"}
                ]
            }))
            approved_patient_ids = [a["patient_id"] for a in approvals if a.get("patient_id")]
            if approved_patient_ids:
                base_query["$or"] = [
                    {"patient_id": {"$in": approved_patient_ids}},
                    {"doctor_id": doctor_oid},
                    {"created_by_user_id": user_id}
                ]
    elif user_role == "PATIENT":
        pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
        if pat:
            base_query["patient_id"] = pat["_id"]
        else:
            base_query["patient_id"] = ObjectId()  # Empty match safe guard
    else:
        # STAFF / ADMIN
        if target_patient_id:
            base_query["$or"] = [
                {"patient_id": target_patient_id},
                {"patient_code": str(target_patient_code or patient_arg)}
            ]
        elif target_patient_code:
            base_query["patient_code"] = str(target_patient_code)

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
        "icd10_code": 1,
        "patient_id": 1
    }))

    stat_records = len(all_matched)
    stat_consultations = sum(1 for r in all_matched if r.get("record_type") in ["CONSULTATION", "VISIT_NOTE"])
    stat_prescriptions = sum(1 for r in all_matched if r.get("record_type") == "PRESCRIPTION")
    stat_diagnoses = sum(1 for r in all_matched if r.get("record_type") in ["DIAGNOSIS", "LAB_REPORT", "IMAGING", "SCAN"] or (r.get("diagnosis") and str(r.get("diagnosis")).strip()) or (r.get("icd10_code") and str(r.get("icd10_code")).strip()))
    stat_checkups = sum(1 for r in all_matched if r.get("record_type") == "CHECKUP")
    stat_icd10 = sum(1 for r in all_matched if (r.get("icd10_code") and str(r.get("icd10_code")).strip()))

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
            "checkups": stat_checkups,
            "icd10_mapped": stat_icd10
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
                {"patient_code": str(patient_identifier).strip()},
                {"patient_id_code": str(patient_identifier).strip()},
                {"patient_code": int(patient_identifier) if str(patient_identifier).strip().isdigit() else -1}
            ]
        })

    if not patient:
        return jsonify({"error": "Validation Error", "detail": f"Patient '{patient_identifier}' not found"}), 404

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Validation Error", "detail": "title is required"}), 400

    type_aliases = {
        "LAB": "LAB_REPORT",
        "VISIT_NOTE": "CONSULTATION",
        "VISIT NOTE": "CONSULTATION",
        "RX": "PRESCRIPTION",
        "PRESCRIPTION/RX": "PRESCRIPTION",
        "DX": "DIAGNOSIS"
    }
    raw_type = (data.get("record_type") or "CONSULTATION").upper().strip()
    record_type = type_aliases.get(raw_type, raw_type)
    valid_types = ["CONSULTATION", "LAB_REPORT", "PRESCRIPTION", "SCAN", "IMAGING", "DIAGNOSIS", "CHECKUP", "DISCHARGE_SUMMARY"]
    if record_type not in valid_types:
        record_type = "CONSULTATION"

    # Normalize medications
    medications = data.get("medications", [])
    if isinstance(medications, str):
        try:
            import json
            medications = json.loads(medications)
        except Exception:
            medications = [{"name": m.strip(), "dose": "", "frequency": "", "duration": "", "drug_class": "General"} for m in medications.split(",") if m.strip()]

    now = datetime.now(timezone.utc)
    rec_date = data.get("record_date") or now.strftime("%Y-%m-%d")

    # Normalize attachments
    attachments = data.get("attachments", [])
    if isinstance(attachments, str):
        try:
            import json
            attachments = json.loads(attachments)
        except Exception:
            attachments = []

    # Process files uploaded directly in multipart/form-data
    uploaded_files = request.files.getlist("files") or request.files.getlist("file")
    if not uploaded_files and "file" in request.files:
        f_single = request.files["file"]
        if f_single and f_single.filename:
            uploaded_files = [f_single]

    for f in uploaded_files:
        if f and f.filename and allowed_file(f.filename):
            f_bytes = f.read()
            if len(f_bytes) <= MAX_FILE_SIZE_BYTES:
                ext = f.filename.rsplit(".", 1)[-1].lower()
                if ext in {"png", "jpg", "jpeg", "webp"}:
                    clean_bytes, clean_name = strip_exif_and_sanitize(f_bytes, f.filename)
                else:
                    clean_bytes, clean_name = f_bytes, secure_filename(f.filename)
                unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3)}_{clean_name}"
                save_path = os.path.join(UPLOAD_FOLDER, unique_name)
                try:
                    with open(save_path, "wb") as out_f:
                        out_f.write(clean_bytes)
                    attachments.append({
                        "file_name": clean_name,
                        "file_url": f"/api/health-records/files/{unique_name}",
                        "size_bytes": len(clean_bytes),
                        "uploaded_at": now.isoformat()
                    })
                except Exception as save_err:
                    print(f"Warning: Failed to save record file: {save_err}")

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
# GET SINGLE RECORD OR PATIENT RECORDS
# GET /api/health-records/<record_or_patient_id>
# ============================================================
@health_records_bp.route("/<identifier>", methods=["GET"], strict_slashes=False)
@token_required
def get_health_record_or_patient_records(identifier):
    db = get_database()
    current_user = g.current_user
    user_role = (current_user.get("role") or "PATIENT").upper()
    user_id = str(current_user["_id"])
    clean_id = (identifier or "").strip()

    is_latest = False
    if clean_id.endswith("/latest"):
        clean_id = clean_id.replace("/latest", "").strip()
        is_latest = True

    # 1. First, check if clean_id is a specific health record ID
    if is_valid_object_id(clean_id):
        record = db.health_records.find_one({"_id": ObjectId(clean_id), "deleted_at": None})
        if record:
            if user_role == "PATIENT":
                pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
                if not pat or str(record.get("patient_id")) != str(pat["_id"]):
                    return jsonify({"error": "Forbidden", "detail": "Access denied"}), 403
            return jsonify(serialize_doc(record)), 200

    # 2. Check if clean_id matches a patient by _id, patient_code, or patient_id
    target_patient = None
    if is_valid_object_id(clean_id):
        target_patient = db.patients.find_one({"_id": ObjectId(clean_id)})
    if not target_patient:
        target_patient = db.patients.find_one({
            "$or": [
                {"patient_code": clean_id},
                {"patient_id_code": clean_id},
                {"patient_id": clean_id}
            ]
        })

    if target_patient:
        if user_role == "PATIENT":
            pat = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
            if not pat or str(target_patient["_id"]) != str(pat["_id"]):
                return jsonify({"error": "Forbidden", "detail": "Access denied"}), 403

        query = {
            "$or": [
                {"patient_id": target_patient["_id"]},
                {"patient_code": str(target_patient.get("patient_code"))}
            ],
            "deleted_at": None,
            "is_test": {"$ne": True}
        }
        if is_latest:
            latest_rec = db.health_records.find_one(query, sort=[("record_date", -1), ("_id", -1)])
            return jsonify(serialize_doc(latest_rec) if latest_rec else {}), 200

        records = list(db.health_records.find(query).sort([("record_date", -1), ("_id", -1)]))
        return jsonify(serialize_doc(records)), 200

    # 3. Direct match on patient_code in health_records
    direct_records = list(db.health_records.find({
        "patient_code": clean_id,
        "deleted_at": None,
        "is_test": {"$ne": True}
    }).sort([("record_date", -1), ("_id", -1)]))
    if direct_records:
        if is_latest:
            return jsonify(serialize_doc(direct_records[0])), 200
        return jsonify(serialize_doc(direct_records)), 200

    return jsonify({"error": "Not Found", "detail": "Health record or patient not found"}), 404

@health_records_bp.route("/<identifier>/latest", methods=["GET"], strict_slashes=False)
@token_required
def get_latest_patient_record(identifier):
    return get_health_record_or_patient_records(f"{identifier}/latest")

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
    
    type_aliases = {
        "LAB": "LAB_REPORT",
        "VISIT_NOTE": "CONSULTATION",
        "VISIT NOTE": "CONSULTATION",
        "RX": "PRESCRIPTION",
        "PRESCRIPTION/RX": "PRESCRIPTION",
        "DX": "DIAGNOSIS"
    }

    for f in allowed_fields:
        if f in data:
            if f == "record_type":
                rt = str(data[f]).upper().strip()
                update_data[f] = type_aliases.get(rt, rt)
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
        action="HEALTH_RECORD_DELETE",
        resource="HEALTH_RECORDS",
        resource_id=record_id,
        details=f"Deleted health record '{existing.get('title')}' for patient {existing.get('patient_name')}"
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

# ============================================================
# ORGAN CLINICAL FINDINGS & ACTION PLAN (KIDNEYS, BRAIN, STOMACH, PANCREAS, THYROID, INTESTINES)
# ============================================================
VALID_ORGAN_KEYS = {"kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines", "lungs"}

def get_default_organ_data(organ_key):
    defaults = {
        "lungs": {
            "what_happened": "Mild bronchial hyper-reactivity and airway resistance variance noted during active physiological telemetry and dynamic respiration cycles.",
            "how_to_reduce": "Practice slow diaphragmatic deep breathing exercises (16 breaths/min), avoid aerosol and allergen exposures, maintain home air filtration, and stay well hydrated.",
            "medicines": [
                {"name": "Levosalbutamol Inhaler", "purpose": "Bronchial smooth muscle relaxation during acute airway constriction"},
                {"name": "Budesonide Respite", "purpose": "Airway mucosal anti-inflammatory stabilization"}
            ],
            "findings": [
                {
                    "id": "l1",
                    "x": 27.0,
                    "y": 38.0,
                    "label": "Right Lung Upper Area",
                    "title": "Right Lung Upper Area Finding",
                    "severity": "watch",
                    "note": "Apical bronchovesicular air entry attenuation and mild mucosal congestion on spirometric correlation."
                },
                {
                    "id": "l2",
                    "x": 28.0,
                    "y": 72.0,
                    "label": "Right Lung Lower Area",
                    "title": "Right Lung Lower Area Finding",
                    "severity": "watch",
                    "note": "Basilar breath sound coarsening without consolidation or pleural effusion on physical auscultation."
                },
                {
                    "id": "l3",
                    "x": 72.0,
                    "y": 72.0,
                    "label": "Left Lung Lower Area",
                    "title": "Left Lung Lower Area Finding",
                    "severity": "normal",
                    "note": "Clear vesicular breath sounds throughout left lower lobe; normal diaphragmatic excursion."
                },
                {
                    "id": "l4",
                    "x": 50.0,
                    "y": 52.0,
                    "label": "Carina / Main Bronchi Bifurcation",
                    "title": "Bronchial Bifurcation Finding",
                    "severity": "watch",
                    "note": "Transient bronchial airway resistance variation during peak inspiration at tracheal bifurcation."
                }
            ]
        },
        "kidneys": {
            "what_happened": "Elevated serum creatinine and reduced estimated GFR indicative of mild-to-moderate renal filtration compromise and hyperfiltration stress.",
            "how_to_reduce": "Maintain optimal hydration with 2.5–3.0L water daily, minimize dietary sodium (<2g/day), restrict NSAID use, and monitor blood pressure weekly.",
            "medicines": [
                {"name": "Telmisartan", "purpose": "Renal perfusion protection & arterial hypertension management"},
                {"name": "Torsemide", "purpose": "Fluid balance & edema reduction"}
            ],
            "findings": [
                {"id": "k1", "x": 35.0, "y": 50.0, "label": "Mild Cortical Thinning", "title": "Mild Cortical Thinning", "severity": "watch", "note": "Early bilateral cortical echogenicity and cortical thickness narrowing on renal ultrasound."},
                {"id": "k2", "x": 62.0, "y": 42.0, "label": "Elevated Resistance Index", "title": "Elevated Resistance Index", "severity": "critical", "note": "Renal interlobar arterial Doppler resistance index is 0.72, signaling vascular stiffness."}
            ]
        },
        "brain": {
            "what_happened": "Transient cerebral perfusion fluctuation related to systemic blood pressure elevation with tension-type cephalea and autonomic strain.",
            "how_to_reduce": "Engage in sleep hygiene (7-8 hours nightly), stress reduction techniques, regular aerobic walks, and avoid caffeine after midday.",
            "medicines": [
                {"name": "Amlodipine", "purpose": "Cerebrovascular tone stabilization"},
                {"name": "Magnesium Glycinate", "purpose": "Neurovascular muscular relaxation"}
            ],
            "findings": [
                {
                    "id": "b1",
                    "x": 22.0,
                    "y": 42.0,
                    "label": "Frontal Lobe Perfusion Area",
                    "title": "Frontal Lobe Finding",
                    "severity": "critical",
                    "note": "Frontal cortical perfusion pressure variance correlated with sustained systemic systolic hypertension load."
                },
                {
                    "id": "b2",
                    "x": 60.0,
                    "y": 22.0,
                    "label": "Parietal Lobe Perfusion Node",
                    "title": "Parietal Lobe (Top) Finding",
                    "severity": "critical",
                    "note": "Superior parietal microvascular resistance index elevation signaling cerebral auto-regulation challenge."
                },
                {
                    "id": "b3",
                    "x": 34.0,
                    "y": 63.0,
                    "label": "Temporal Lobe Area",
                    "title": "Temporal Lobe Finding",
                    "severity": "watch",
                    "note": "Mild temporal-insular arterial pulsation variance documented during peak hemodynamic intervals."
                },
                {
                    "id": "b4",
                    "x": 72.0,
                    "y": 68.0,
                    "label": "Cerebellar Hemisphere Node",
                    "title": "Cerebellum Finding",
                    "severity": "watch",
                    "note": "Vertebrobasilar posterior circulation flow symmetry maintained; minor muscular tension reflex noted."
                }
            ]
        },
        "stomach": {
            "what_happened": "Gastric mucosal irritation with hyperchlorhydria causing episodic epigastric pyrosis and postprandial discomfort.",
            "how_to_reduce": "Adopt smaller frequent meals, avoid spicy and deeply fried foods, remain upright for at least 2 hours post meals, and elevate bed head.",
            "medicines": [
                {"name": "Pantoprazole", "purpose": "Gastric acid suppression & mucosal healing"},
                {"name": "Sucralfate", "purpose": "Cytoprotective mucosal coating barrier"}
            ],
            "findings": [
                {"id": "s1", "x": 42.0, "y": 52.0, "label": "Antral Erythema", "severity": "watch", "note": "Focal mucosal erythema in gastric antrum without active hemorrhage or ulceration."},
                {"id": "s2", "x": 58.0, "y": 38.0, "label": "Fundic Irritation", "severity": "normal", "note": "Mild mucosal fold prominence in fundus, consistent with acid reflux response."}
            ]
        },
        "pancreas": {
            "what_happened": "Relative insulin secretory insufficiency with peripheral glycemic excursions and focal acute inflammatory edema across the pancreatic body.",
            "how_to_reduce": "Choose low-glycemic-index whole grains, integrate 30 minutes of daily post-meal brisk walking, restrict alcohol/rich fats, and maintain consistent hydration.",
            "medicines": [
                {"name": "Metformin", "purpose": "Hepatic gluconeogenesis reduction & insulin sensitivity improvement"},
                {"name": "Teneligliptin", "purpose": "Incretin axis enhancement & glycemic stabilization"}
            ],
            "findings": [
                {
                    "id": "p1",
                    "x": 50.0,
                    "y": 40.0,
                    "label": "Pancreatic Body Inflammatory Lesion",
                    "title": "Pancreatic Body Finding",
                    "severity": "critical",
                    "note": "Focal acute inflammatory edema and tissue hyperemia across the pancreatic body with elevated glycemic stress response."
                },
                {
                    "id": "p2",
                    "x": 30.0,
                    "y": 52.0,
                    "label": "Pancreatic Head Duodenal Interface",
                    "title": "Pancreatic Head Finding",
                    "severity": "watch",
                    "note": "Mild parenchymal prominent contour adjacent to the medial duodenal sweep without ductal dilatation."
                },
                {
                    "id": "p3",
                    "x": 84.0,
                    "y": 38.0,
                    "label": "Pancreatic Tail Splenic Hilum",
                    "title": "Pancreatic Tail Finding",
                    "severity": "watch",
                    "note": "Parenchymal attenuation in the distal tail with preserved peripancreatic fat planes."
                }
            ]
        },
        "thyroid": {
            "what_happened": "Subclinical thyroid metabolic sluggishness with elevated TSH and borderline free thyroxine levels.",
            "how_to_reduce": "Ensure adequate dietary iodine and selenium intake, maintain consistent morning medication timing on an empty stomach, and monitor energy patterns.",
            "medicines": [
                {"name": "Levothyroxine Sodium", "purpose": "Thyroid hormone replacement & metabolic normalization"}
            ],
            "findings": [
                {
                    "id": "t1",
                    "x": 31.0,
                    "y": 52.0,
                    "label": "Left Lobe Hypoechoic Nodule",
                    "title": "Left Lobe Hypoechoic Nodule",
                    "severity": "watch",
                    "note": "1.1 cm well-defined hypoechoic nodule in the left thyroid lobe. Benign sonographic architecture with peripheral vascularity and regular margins."
                },
                {
                    "id": "t2",
                    "x": 69.0,
                    "y": 52.0,
                    "label": "Right Lobe Colloid Nodule",
                    "title": "Right Lobe Colloid Nodule",
                    "severity": "watch",
                    "note": "0.8 cm well-circumscribed benign colloid nodule with internal comet-tail acoustic artifacts and no microcalcifications."
                },
                {
                    "id": "t3",
                    "x": 50.0,
                    "y": 62.0,
                    "label": "Isthmus Parenchymal Heterogeneity",
                    "title": "Isthmus Parenchymal Heterogeneity",
                    "severity": "watch",
                    "note": "Mild diffuse echotexture coarsening across the central thyroid isthmus bridge, characteristic of autoimmune thyroiditis in early evolution."
                }
            ]
        },
        "intestines": {
            "what_happened": "Enteric dysmotility with altered water reabsorption leading to episodic abdominal cramps, segmental cramping along jejunoileal loops, and irregular bowel transit.",
            "how_to_reduce": "Gradually increase dietary soluble fiber (psyllium/flaxseed), drink 8-10 glasses of clean water, incorporate fermented probiotic foods, and avoid gastrointestinal irritants.",
            "medicines": [
                {"name": "Mebeverine", "purpose": "Gastrointestinal smooth muscle antispasmodic"},
                {"name": "Lactobacillus Spores", "purpose": "Enteric microbiome equilibrium restoration"}
            ],
            "findings": [
                {
                    "id": "i1",
                    "x": 50.0,
                    "y": 32.0,
                    "label": "Upper Small Intestine (Duodenum / Jejunum)",
                    "title": "Upper Small Intestine Finding",
                    "severity": "watch",
                    "note": "Transient mucosal irritation and rapid peristaltic transit observed along proximal jejunal loops."
                },
                {
                    "id": "i2",
                    "x": 55.0,
                    "y": 50.0,
                    "label": "Middle Small Intestine (Jejunoileal)",
                    "title": "Middle Small Intestine Finding",
                    "severity": "watch",
                    "note": "Mild gaseous distension and segmental hyper-motility along mid-enteric coils."
                },
                {
                    "id": "i3",
                    "x": 45.0,
                    "y": 68.0,
                    "label": "Lower Small Intestine (Terminal Ileum)",
                    "title": "Lower Small Intestine Finding",
                    "severity": "watch",
                    "note": "Hyperactive ileocecal junctional tone with intermittent focal cramping response."
                },
                {
                    "id": "i4",
                    "x": 60.0,
                    "y": 84.0,
                    "label": "Large Intestine (Colon)",
                    "title": "Large Intestine Finding",
                    "severity": "watch",
                    "note": "Spasmodic segmental contraction wave in descending colon with localized hypersensitivity."
                }
            ]
        }
    }
    return defaults.get(organ_key, {
        "what_happened": "",
        "how_to_reduce": "",
        "medicines": [],
        "findings": []
    })

@health_records_bp.route("/patient/<patient_id>/organ-findings/<organ_key>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient_organ_findings(patient_id, organ_key):
    db = get_database()
    organ_key = (organ_key or "").strip().lower()
    if organ_key not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"Organ must be one of: {', '.join(VALID_ORGAN_KEYS)}"}), 400

    # Query existing custom record for this patient & organ
    query = {"patient_id": patient_id, "organ_key": organ_key}
    doc = db.patient_organ_findings.find_one(query)
    
    if not doc and is_valid_object_id(patient_id):
        # Also check with ObjectId
        doc = db.patient_organ_findings.find_one({"patient_id": ObjectId(patient_id), "organ_key": organ_key})

    default_data = get_default_organ_data(organ_key)

    if not doc:
        return jsonify({
            "patient_id": patient_id,
            "organ_key": organ_key,
            "what_happened": default_data["what_happened"],
            "how_to_reduce": default_data["how_to_reduce"],
            "medicines": default_data["medicines"],
            "findings": default_data["findings"],
            "is_customized": False
        }), 200

    return jsonify({
        "patient_id": patient_id,
        "organ_key": organ_key,
        "what_happened": doc.get("what_happened", default_data["what_happened"]),
        "how_to_reduce": doc.get("how_to_reduce", default_data["how_to_reduce"]),
        "medicines": doc.get("medicines", default_data["medicines"]),
        "findings": doc.get("findings", default_data["findings"]),
        "updated_at": doc.get("updated_at"),
        "updated_by": doc.get("updated_by"),
        "is_customized": True
    }), 200

@health_records_bp.route("/patient/<patient_id>/organ-findings/<organ_key>", methods=["PUT", "POST"], strict_slashes=False)
@token_required
def update_patient_organ_findings(patient_id, organ_key):
    current_user = g.current_user
    user_role = (current_user.get("role") or "").upper()
    if user_role not in {"DOCTOR", "ADMIN", "STAFF"}:
        return jsonify({"error": "Forbidden", "detail": "Only verified clinicians may edit clinical organ findings and care instructions."}), 403

    organ_key = (organ_key or "").strip().lower()
    if organ_key not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"Organ must be one of: {', '.join(VALID_ORGAN_KEYS)}"}), 400

    db = get_database()
    body = request.get_json() or {}

    sanitized_findings = []
    for f in body.get("findings", []):
        if not isinstance(f, dict):
            continue
        try:
            x_val = float(f.get("x", 50.0))
            y_val = float(f.get("y", 50.0))
        except (ValueError, TypeError):
            x_val, y_val = 50.0, 50.0
        x_val = max(5.0, min(95.0, x_val))
        y_val = max(5.0, min(95.0, y_val))
        
        sev = str(f.get("severity") or "watch").lower()
        if sev not in {"critical", "watch", "normal"}:
            sev = "watch"

        sanitized_findings.append({
            "id": str(f.get("id") or secrets.token_hex(4)),
            "x": round(x_val, 2),
            "y": round(y_val, 2),
            "label": str(f.get("label") or "Clinical Finding").strip()[:100],
            "severity": sev,
            "note": str(f.get("note") or "").strip()[:500]
        })

    # Sanitize medicines (name and purpose only - strictly NO dosages)
    sanitized_meds = []
    for m in body.get("medicines", []):
        if not isinstance(m, dict):
            continue
        name = str(m.get("name") or "").strip()[:80]
        purpose = str(m.get("purpose") or "").strip()[:160]
        if name:
            sanitized_meds.append({"name": name, "purpose": purpose})

    what_happened = str(body.get("what_happened") or "").strip()
    how_to_reduce = str(body.get("how_to_reduce") or "").strip()

    now = datetime.now(timezone.utc)
    doctor_name = current_user.get("name") or current_user.get("fullName") or "Doctor"
    if not doctor_name.startswith("Dr."):
        doctor_name = f"Dr. {doctor_name}"

    update_payload = {
        "what_happened": what_happened,
        "how_to_reduce": how_to_reduce,
        "medicines": sanitized_meds,
        "findings": sanitized_findings,
        "updated_at": now.isoformat(),
        "updated_by": doctor_name,
        "updated_by_id": str(current_user["_id"])
    }

    query = {"patient_id": patient_id, "organ_key": organ_key}
    db.patient_organ_findings.update_one(query, {"$set": update_payload}, upsert=True)

    log_audit_action(
        db=db,
        user_id=str(current_user["_id"]),
        user_role=user_role,
        action="ORGAN_FINDINGS_UPDATE",
        resource="PATIENT_ORGAN_FINDINGS",
        resource_id=f"{patient_id}:{organ_key}",
        details=f"Updated findings & care instructions for {organ_key}"
    )

    return jsonify({
        "message": f"Organ findings for {organ_key} updated successfully",
        "patient_id": patient_id,
        "organ_key": organ_key,
        **update_payload
    }), 200

# ============================================================
# LIVE ORGAN CLINICAL CHAT (SAVED PER PATIENT & ORGAN)
# ============================================================
@health_records_bp.route("/patient/<patient_id>/organ-chat/<organ_key>", methods=["GET"], strict_slashes=False)
@token_required
def get_organ_chat_messages(patient_id, organ_key):
    db = get_database()
    organ_key = (organ_key or "").strip().lower()
    if organ_key not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"Organ must be one of: {', '.join(VALID_ORGAN_KEYS)}"}), 400

    query = {"patient_id": patient_id, "organ_key": organ_key}
    cursor = db.organ_chat_messages.find(query).sort("timestamp", 1)
    messages = []
    for doc in cursor:
        messages.append({
            "id": str(doc["_id"]),
            "sender_role": doc.get("sender_role", "PATIENT"),
            "sender_name": doc.get("sender_name", "Anonymous"),
            "sender_id": str(doc.get("sender_id", "")),
            "text": doc.get("text", ""),
            "timestamp": doc.get("timestamp")
        })

    # If empty, return a welcoming initial message
    if not messages:
        messages.append({
            "id": "welcome-1",
            "sender_role": "SYSTEM",
            "sender_name": "CareBridge Clinical System",
            "sender_id": "system",
            "text": f"Direct consultation channel for {organ_key.capitalize()} care. Messages sent here are saved and visible to both patient and treating doctor.",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    return jsonify({"patient_id": patient_id, "organ_key": organ_key, "messages": messages}), 200

@health_records_bp.route("/patient/<patient_id>/organ-chat/<organ_key>", methods=["POST"], strict_slashes=False)
@token_required
def send_organ_chat_message(patient_id, organ_key):
    current_user = g.current_user
    db = get_database()
    organ_key = (organ_key or "").strip().lower()
    if organ_key not in VALID_ORGAN_KEYS:
        return jsonify({"error": "Validation Error", "detail": f"Organ must be one of: {', '.join(VALID_ORGAN_KEYS)}"}), 400

    body = request.get_json() or {}
    text = str(body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Validation Error", "detail": "Message text cannot be empty"}), 400

    user_role = (current_user.get("role") or "PATIENT").upper()
    sender_name = current_user.get("name") or current_user.get("fullName") or ("Doctor" if user_role == "DOCTOR" else "Patient")
    if user_role == "DOCTOR" and not sender_name.startswith("Dr."):
        sender_name = f"Dr. {sender_name}"

    now_iso = datetime.now(timezone.utc).isoformat()
    msg_doc = {
        "patient_id": patient_id,
        "organ_key": organ_key,
        "sender_role": user_role,
        "sender_name": sender_name,
        "sender_id": str(current_user["_id"]),
        "text": text[:1000],
        "timestamp": now_iso
    }

    result = db.organ_chat_messages.insert_one(msg_doc)

    return jsonify({
        "message": "Message sent successfully",
        "chat_message": {
            "id": str(result.inserted_id),
            "sender_role": user_role,
            "sender_name": sender_name,
            "sender_id": str(current_user["_id"]),
            "text": text[:1000],
            "timestamp": now_iso
        }
    }), 201


