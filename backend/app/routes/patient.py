import re
import secrets
import string
import math
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.utils.security import hash_password

patient_bp = Blueprint("patients", __name__)

# Allowed enums
VALID_GENDERS = ["Male", "Female", "Other"]
VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
VALID_STATUSES = ["Active", "Pending", "Inactive"]

def normalize_phone(phone_str: str) -> str:
    """Extract digits and format phone number as +91 XXXXXXXXXX if 10 digits."""
    if not phone_str or not isinstance(phone_str, str):
        return ""
    digits = re.sub(r"\D", "", phone_str)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return digits

def validate_patient_payload(data: dict, is_create: bool = True):
    """Validate and sanitize patient input fields."""
    errors = {}

    # 1. Name validation
    name = data.get("name")
    if is_create and not name:
        errors["name"] = "Patient full name is required."
    elif name is not None:
        name_str = str(name).strip()
        if name_str.lower() == "string" or len(name_str) < 2:
            errors["name"] = "Name must be at least 2 characters long."
        elif not re.match(r"^[a-zA-Z\s\.\'-]{2,80}$", name_str):
            errors["name"] = "Name can only contain letters, spaces, dots, and hyphens."
        data["name"] = name_str

    # 2. Phone validation
    phone = data.get("phone")
    if is_create and not phone:
        errors["phone"] = "Phone number is required."
    elif phone is not None:
        phone_str = str(phone).strip()
        digits = normalize_phone(phone_str)
        if phone_str.lower() == "string" or len(digits) != 10:
            errors["phone"] = "Please enter a valid 10-digit mobile number."
        else:
            data["phone"] = f"+91 {digits}"

    # 3. Email validation
    email = data.get("email")
    if email:
        email_str = str(email).strip().lower()
        if email_str == "string" or not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email_str):
            errors["email"] = "Please enter a valid email address."
        else:
            data["email"] = email_str
    elif data.get("create_account"):
        errors["email"] = "Email address is required to create a patient login account."

    # 4. Age validation
    age = data.get("age")
    if age is not None and age != "":
        try:
            age_int = int(age)
            if age_int < 0 or age_int > 120:
                errors["age"] = "Age must be between 0 and 120."
            else:
                data["age"] = age_int
        except (ValueError, TypeError):
            errors["age"] = "Age must be a valid number."
    else:
        data["age"] = None

    # 5. Gender validation
    gender = data.get("gender")
    if gender:
        gender_str = str(gender).strip().capitalize()
        if gender_str not in VALID_GENDERS:
            errors["gender"] = f"Gender must be one of: {', '.join(VALID_GENDERS)}."
        else:
            data["gender"] = gender_str
    else:
        data["gender"] = "Other"

    # 6. Blood group validation
    blood_group = data.get("blood_group")
    if blood_group:
        bg_str = str(blood_group).strip().upper()
        if bg_str not in VALID_BLOOD_GROUPS:
            errors["blood_group"] = f"Blood group must be one of: {', '.join(VALID_BLOOD_GROUPS)}."
        else:
            data["blood_group"] = bg_str
    else:
        data["blood_group"] = "O+"

    # 7. Status validation
    status = data.get("status")
    if status:
        status_str = str(status).strip().capitalize()
        if status_str not in VALID_STATUSES:
            data["status"] = "Active"
        else:
            data["status"] = status_str
    else:
        data["status"] = "Active"

    # 8. Emergency Contact
    emergency_contact = data.get("emergency_contact")
    if emergency_contact:
        ec_str = str(emergency_contact).strip()
        if ec_str.lower() == "string":
            data["emergency_contact"] = None
        else:
            data["emergency_contact"] = ec_str
    else:
        data["emergency_contact"] = None

    # 9. Allergies & Medical history
    for field in ["allergies", "medical_history"]:
        val = data.get(field)
        if isinstance(val, str):
            cleaned = [item.strip() for item in val.split(",") if item.strip() and item.strip().lower() != "string"]
            data[field] = cleaned
        elif isinstance(val, list):
            data[field] = [str(item).strip() for item in val if str(item).strip() and str(item).strip().lower() != "string"]
        else:
            data[field] = []

    return errors

def generate_secure_temp_password() -> str:
    """Generate a high-entropy 12-character temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
    chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ]
    chars += [secrets.choice(alphabet) for _ in range(8)]
    secrets.SystemRandom().shuffle(chars)
    return "CareBridge#" + "".join(chars[:8])

@patient_bp.route("", methods=["POST"], strict_slashes=False)
@patient_bp.route("/", methods=["POST"], strict_slashes=False)
@token_required
def create_patient():
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}

    # Validate payload
    errors = validate_patient_payload(data, is_create=True)
    if errors:
        return jsonify({
            "error": "Validation Error",
            "detail": "Please correct the errors in the form.",
            "fields": errors
        }), 400

    phone = data.get("phone")
    email = data.get("email")

    # Check duplicate phone in patients
    if phone:
        existing_phone = db.patients.find_one({"phone": phone})
        if existing_phone:
            return jsonify({
                "error": "Duplicate Record",
                "detail": f"A patient with phone number {phone} is already registered (ID #{str(existing_phone['_id'])[-6:].upper()})."
            }), 409

    # Check duplicate email in patients
    if email:
        existing_email = db.patients.find_one({"email": email})
        if existing_email:
            return jsonify({
                "error": "Duplicate Record",
                "detail": f"A patient with email {email} is already registered (ID #{str(existing_email['_id'])[-6:].upper()})."
            }), 409

    create_account = bool(data.get("create_account"))
    created_user_id = None
    temp_password = None

    if create_account:
        if not email:
            return jsonify({
                "error": "Validation Error",
                "detail": "An email address is required to create a patient login account."
            }), 400

        existing_user = db.users.find_one({"email": email.lower()})
        if existing_user:
            return jsonify({
                "error": "Duplicate Record",
                "detail": f"A user account with email {email} already exists."
            }), 409

        temp_password = generate_secure_temp_password()
        hashed_pw = hash_password(temp_password)

        user_doc = {
            "name": data["name"],
            "email": email.lower(),
            "phone": phone,
            "role": "PATIENT",
            "password": hashed_pw,
            "password_hash": hashed_pw,
            "must_change_password": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        user_result = db.users.insert_one(user_doc)
        created_user_id = str(user_result.inserted_id)
    elif current_user.get("role") == "PATIENT":
        created_user_id = str(current_user["_id"])

    # Prepare patient document
    patient_doc = {
        "user_id": created_user_id,
        "name": data["name"],
        "email": email,
        "phone": phone,
        "age": data.get("age"),
        "gender": data.get("gender", "Other"),
        "blood_group": data.get("blood_group", "O+"),
        "emergency_contact": data.get("emergency_contact"),
        "allergies": data.get("allergies", []),
        "medical_history": data.get("medical_history", []),
        "status": data.get("status", "Active"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = db.patients.insert_one(patient_doc)
    patient_id_str = str(result.inserted_id)
    patient_code = f"PT-{patient_id_str[-6:].upper()}"
    patient_doc["_id"] = result.inserted_id
    patient_doc["patient_id_code"] = patient_code

    # If account was created, update user with patient_id
    if created_user_id:
        db.users.update_one(
            {"_id": ObjectId(created_user_id)},
            {"$set": {"patient_id": patient_id_str}}
        )

    serialized_patient = serialize_doc(patient_doc)
    serialized_patient["patientId"] = patient_code
    serialized_patient["createdAt"] = patient_doc["created_at"].isoformat()

    return jsonify({
        "message": f"Patient profile created successfully (ID #{patient_code})",
        "patient": serialized_patient,
        "patient_id": patient_id_str,
        "patientId": patient_code,
        "account_created": create_account,
        "temp_password": temp_password
    }), 201

def determine_patient_telemetry_status(patient_doc: dict, latest_vital: dict = None, alert_summary: dict = None) -> tuple:
    """Determine patient's clinical monitoring status (critical, attention, stable) and reason."""
    if alert_summary and (alert_summary.get("status") == "ALERT" or alert_summary.get("high_alerts", 0) > 0):
        return "critical", "Critical", alert_summary.get("message") or "Acute health threshold flagged"

    if latest_vital:
        hr = latest_vital.get("heart_rate")
        sbp = latest_vital.get("systolic_bp")
        dbp = latest_vital.get("diastolic_bp")
        spo2 = latest_vital.get("spo2")
        temp = latest_vital.get("temperature")
        bs = latest_vital.get("blood_sugar")

        # Critical thresholds
        if (hr and (hr > 120 or hr < 45)) or \
           (spo2 and spo2 < 90) or \
           (sbp and sbp >= 160) or (dbp and dbp >= 100) or \
           (bs and (bs > 200 or bs < 60)) or \
           (temp and temp >= 39.0):
            return "critical", "Critical", "Acute physiological threshold breach"

        # Attention thresholds
        if (hr and (hr > 100 or hr < 55)) or \
           (spo2 and spo2 < 95) or \
           (sbp and sbp >= 135) or (dbp and dbp >= 88) or \
           (bs and (bs > 140 or bs < 70)) or \
           (temp and temp >= 37.8):
            return "attention", "Needs Attention", "Borderline vital readings"

        return "stable", "Stable", "Normal physiological parameters"

    # Default baseline
    status_str = str(patient_doc.get("status", "Active")).lower()
    if status_str == "pending":
        return "attention", "Needs Attention", "Pending baseline intake review"
    elif status_str == "inactive":
        return "stable", "Stable", "Inactive monitoring baseline"
    return "stable", "Stable", "Normal baseline"

@patient_bp.route("", methods=["GET"], strict_slashes=False)
@patient_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_patients():
    db = get_database()
    current_user = g.current_user
    role = current_user.get("role", "PATIENT")

    # If regular patient, return only their own records
    if role == "PATIENT":
        user_id = str(current_user["_id"])
        email = current_user.get("email", "").lower()
        patients = list(db.patients.find({
            "$or": [{"user_id": user_id}, {"email": email}]
        }).sort([("created_at", -1), ("_id", -1)]))
        return jsonify(serialize_doc(patients)), 200

    # Staff / Doctor / Admin: support search, filter, sort, pagination
    search = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "All").strip()
    sort_by = request.args.get("sort", "newest").strip()

    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        limit = int(request.args.get("limit", 10))
    except (ValueError, TypeError):
        limit = 10

    # Base Filter: exclude junk / "string"
    base_filter = {
        "name": {"$nin": ["string", "None", "", None]}
    }

    # Handle Search
    if search:
        search_lower = search.lower()
        or_conditions = [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"email": {"$regex": re.escape(search), "$options": "i"}}
        ]
        
        # Phone search: strip non-digits to match flexible input
        digits = re.sub(r"\D", "", search)
        if digits:
            digit_pattern = r"[\s\-\+\(\)]*".join(list(digits))
            or_conditions.append({"phone": {"$regex": digit_pattern, "$options": "i"}})
        else:
            or_conditions.append({"phone": {"$regex": re.escape(search), "$options": "i"}})

        # Patient ID search
        if search_lower.startswith("pt-"):
            clean_code = search[3:].strip()
            or_conditions.append({"patient_id_code": {"$regex": re.escape(search), "$options": "i"}})
            if is_valid_object_id(clean_code):
                or_conditions.append({"_id": ObjectId(clean_code)})
        elif is_valid_object_id(search):
            or_conditions.append({"_id": ObjectId(search)})
        else:
            or_conditions.append({"patient_id_code": {"$regex": re.escape(search), "$options": "i"}})

        base_filter["$or"] = or_conditions

    # Sorting
    if sort_by == "oldest":
        sort_criteria = [("created_at", 1), ("_id", 1)]
    elif sort_by == "name_asc":
        sort_criteria = [("name", 1)]
    elif sort_by == "name_desc":
        sort_criteria = [("name", -1)]
    else:  # newest default
        sort_criteria = [("created_at", -1), ("_id", -1)]

    # Fetch all candidate patients matching base filter for telemetry calculation & status filtering
    cursor = db.patients.find(base_filter).sort(sort_criteria)
    all_matched = list(cursor)

    if not all_matched:
        return jsonify({
            "patients": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 1,
            "stats": {
                "total": 0,
                "critical": 0,
                "attention": 0,
                "stable": 0,
                "active": 0,
                "telemetry": 0
            }
        }), 200

    # Batch fetch latest vitals for matched patients
    patient_ids = [p["_id"] for p in all_matched]
    vitals_cursor = db.vital_signs.aggregate([
        {"$match": {"patient_id": {"$in": patient_ids}}},
        {"$sort": {"recorded_at": -1}},
        {"$group": {
            "_id": "$patient_id",
            "latest_vital": {"$first": "$$ROOT"}
        }}
    ])
    vitals_map = {str(v["_id"]): v["latest_vital"] for v in vitals_cursor}

    # Batch fetch alert summaries
    alerts_cursor = db.health_alerts.aggregate([
        {"$match": {"patient_id": {"$in": patient_ids}, "is_acknowledged": {"$ne": True}}},
        {"$group": {
            "_id": "$patient_id",
            "total_alerts": {"$sum": 1},
            "high_alerts": {"$sum": {"$cond": [{"$in": ["$severity", ["Critical", "CRITICAL", "High", "HIGH"]]}, 1, 0]}}
        }}
    ])
    alerts_map = {str(a["_id"]): a for a in alerts_cursor}

    # Enrich each patient and count telemetry statuses
    total_stat_count = len(all_matched)
    critical_stat_count = 0
    attention_stat_count = 0
    stable_stat_count = 0

    enriched_all = []
    for p in all_matched:
        pid_str = str(p["_id"])
        vital = vitals_map.get(pid_str)
        alert = alerts_map.get(pid_str)

        level, label, reason = determine_patient_telemetry_status(p, vital, alert)
        if level == "critical":
            critical_stat_count += 1
        elif level == "attention":
            attention_stat_count += 1
        else:
            stable_stat_count += 1

        doc = serialize_doc(p)
        doc["patientId"] = doc.get("patient_id_code") or f"PT-{pid_str[-6:].upper()}"
        doc["createdAt"] = doc.get("created_at") or doc.get("createdAt")
        doc["telemetry_level"] = level
        doc["telemetry_label"] = label
        doc["telemetry_reason"] = reason
        doc["latest_vital"] = serialize_doc(vital) if vital else None
        doc["last_vitals_time"] = vital.get("recorded_at").isoformat() if vital and vital.get("recorded_at") else (p.get("last_vitals_at").isoformat() if p.get("last_vitals_at") else None)
        enriched_all.append(doc)

    # Apply Status Filter if active
    if status_filter and status_filter.lower() != "all":
        sf_lower = status_filter.lower()
        if sf_lower in ["critical", "attention", "stable"]:
            filtered_patients = [p for p in enriched_all if p["telemetry_level"] == sf_lower]
        else:
            filtered_patients = [p for p in enriched_all if str(p.get("status", "")).lower() == sf_lower]
    else:
        filtered_patients = enriched_all

    filtered_total = len(filtered_patients)
    total_pages = math.ceil(filtered_total / limit) if limit > 0 else 1

    # Slice page
    if limit > 0:
        start_idx = (page - 1) * limit
        page_slice = filtered_patients[start_idx : start_idx + limit]
    else:
        page_slice = filtered_patients

    return jsonify({
        "patients": page_slice,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "stats": {
            "total": total_stat_count,
            "critical": critical_stat_count,
            "attention": attention_stat_count,
            "stable": stable_stat_count,
            "active": total_stat_count,
            "telemetry": total_stat_count
        }
    }), 200

@patient_bp.route("/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_patient(patient_id):
    db = get_database()
    current_user = g.current_user

    if not is_valid_object_id(patient_id):
        patient = db.patients.find_one({"user_id": patient_id})
        if not patient:
            return jsonify({"error": "Not Found", "detail": "Invalid patient ID or patient not found"}), 404
    else:
        patient = db.patients.find_one({"_id": ObjectId(patient_id)})

    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient record not found"}), 404

    if current_user.get("role") == "PATIENT":
        user_id = str(current_user["_id"])
        owns_record = (
            patient.get("user_id") == user_id
            or patient.get("email") == current_user.get("email")
        )
        if not owns_record:
            return jsonify({"error": "Forbidden", "detail": "You can only access your own patient record"}), 403

    doc = serialize_doc(patient)
    doc["patientId"] = doc.get("patient_id_code") or f"PT-{str(doc['_id'])[-6:].upper()}"
    return jsonify(doc), 200

@patient_bp.route("/<patient_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_patient(patient_id):
    db = get_database()
    current_user = g.current_user
    data = request.get_json() or {}

    query = {"_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"user_id": patient_id}
    existing = db.patients.find_one(query)

    if not existing:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404

    if current_user.get("role") == "PATIENT":
        user_id = str(current_user["_id"])
        owns_record = (
            existing.get("user_id") == user_id
            or existing.get("email") == current_user.get("email")
        )
        if not owns_record:
            return jsonify({"error": "Forbidden", "detail": "You can only update your own patient record"}), 403

    errors = validate_patient_payload(data, is_create=False)
    if errors:
        return jsonify({"error": "Validation Error", "detail": "Invalid update data", "fields": errors}), 400

    data.pop("_id", None)
    data.pop("user_id", None)
    data["updated_at"] = datetime.now(timezone.utc)

    db.patients.update_one(query, {"$set": data})
    updated = db.patients.find_one(query)
    doc = serialize_doc(updated)
    doc["patientId"] = doc.get("patient_id_code") or f"PT-{str(doc['_id'])[-6:].upper()}"

    return jsonify({"message": "Patient updated successfully", "patient": doc}), 200

@patient_bp.route("/<patient_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_patient(patient_id):
    db = get_database()
    query = {"_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"user_id": patient_id}
    result = db.patients.delete_one(query)
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
    return jsonify({"message": "Patient deleted successfully"}), 200
