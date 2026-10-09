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

    # Build MongoDB Filter
    filter_query = {
        "name": {"$nin": ["string", "None", "", None]}
    }

    if status_filter and status_filter.lower() != "all":
        filter_query["status"] = {"$regex": f"^{status_filter}$", "$options": "i"}

    if search:
        search_regex = {"$regex": re.escape(search), "$options": "i"}
        or_conditions = [
            {"name": search_regex},
            {"email": search_regex},
            {"phone": search_regex}
        ]
        if is_valid_object_id(search):
            or_conditions.append({"_id": ObjectId(search)})
        filter_query["$or"] = or_conditions

    # Sorting
    if sort_by == "oldest":
        sort_criteria = [("created_at", 1), ("_id", 1)]
    elif sort_by == "name_asc":
        sort_criteria = [("name", 1)]
    elif sort_by == "name_desc":
        sort_criteria = [("name", -1)]
    else:  # newest default
        sort_criteria = [("created_at", -1), ("_id", -1)]

    # Calculate overall stats
    total_all = db.patients.count_documents({"name": {"$nin": ["string", "None", "", None]}})
    active_count = db.patients.count_documents({
        "name": {"$nin": ["string", "None", "", None]},
        "status": {"$in": ["Active", None]}
    })
    telemetry_count = db.patients.count_documents({
        "name": {"$nin": ["string", "None", "", None]},
        "$or": [
            {"blood_group": {"$exists": True, "$ne": None}},
            {"medical_history": {"$exists": True, "$ne": []}}
        ]
    })

    # Count matching records
    filtered_total = db.patients.count_documents(filter_query)

    # Fetch records
    cursor = db.patients.find(filter_query).sort(sort_criteria)
    if limit > 0:
        cursor = cursor.skip((page - 1) * limit).limit(limit)

    raw_patients = list(cursor)
    serialized_patients = []
    for p in raw_patients:
        doc = serialize_doc(p)
        doc["patientId"] = doc.get("patient_id_code") or f"PT-{str(doc['_id'])[-6:].upper()}"
        doc["createdAt"] = doc.get("created_at") or doc.get("createdAt")
        serialized_patients.append(doc)

    total_pages = math.ceil(filtered_total / limit) if limit > 0 else 1

    # Check if caller wants pure list or full metadata
    # If limit is 0 or full_meta is false, we can still provide the full payload.
    # To be fully compatible with array consumers:
    return jsonify({
        "patients": serialized_patients,
        "total": filtered_total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "stats": {
            "total": total_all,
            "active": active_count,
            "telemetry": telemetry_count
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
