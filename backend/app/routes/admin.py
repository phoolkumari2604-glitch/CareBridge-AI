import csv
import io
import re
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import admin_required, token_required
from app.utils.security import hash_password
from app.services.audit_service import log_audit_action
from app.services.email_service import send_user_invite_email, send_password_reset_email

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    db = get_database()
    
    total_users = db.users.count_documents({})
    total_doctors = db.users.count_documents({"role": "DOCTOR"})
    total_staff = db.users.count_documents({"role": "STAFF"})
    total_patients = db.users.count_documents({"role": "PATIENT"})
    total_admins = db.users.count_documents({"role": "ADMIN"})
    
    active_users = db.users.count_documents({"status": {"$ne": "inactive"}})
    inactive_users = db.users.count_documents({"status": "inactive"})
    pending_invites = db.users.count_documents({"status": "invited"})
    
    # 24 hour activity
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(hours=24)
    recent_logins_24h = db.users.count_documents({"last_login": {"$gte": one_day_ago}})
    audit_events_24h = db.audit_logs.count_documents({"created_at": {"$gte": one_day_ago}})
    
    return jsonify({
        "totalUsers": total_users,
        "doctorsCount": total_doctors,
        "staffCount": total_staff,
        "patientsCount": total_patients,
        "adminsCount": total_admins,
        "activeUsers": active_users,
        "inactiveUsers": inactive_users,
        "pendingInvites": pending_invites,
        "recentLogins24h": recent_logins_24h,
        "auditEvents24h": audit_events_24h,
    }), 200

@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    db = get_database()
    
    search = request.args.get("search", "").strip()
    role_filter = request.args.get("role", "").strip().upper()
    status_filter = request.args.get("status", "").strip().lower()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 15))
    
    query = {}
    
    if search:
        rgx = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"name": rgx},
            {"fullName": rgx},
            {"email": rgx},
            {"phone": rgx},
            {"staff_id": rgx},
            {"staffId": rgx},
        ]
        
    if role_filter and role_filter != "ALL":
        query["role"] = role_filter
        
    if status_filter and status_filter != "all":
        if status_filter == "active":
            query["status"] = {"$ne": "inactive"}
        else:
            query["status"] = status_filter
            
    total_count = db.users.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    users = []
    
    for u in cursor:
        uid = str(u["_id"])
        created = u.get("created_at")
        last_log = u.get("last_login")
        
        users.append({
            "id": uid,
            "_id": uid,
            "name": u.get("name") or u.get("fullName") or "Unnamed User",
            "fullName": u.get("fullName") or u.get("name") or "Unnamed User",
            "email": u.get("email"),
            "phone": u.get("phone", "—"),
            "role": u.get("role", "PATIENT"),
            "status": u.get("status", "active"),
            "emailVerified": bool(u.get("email_verified", True)),
            "staffId": u.get("staff_id") or u.get("staffId") or "—",
            "specialty": u.get("specialty") or u.get("specialization") or "—",
            "department": u.get("department") or "—",
            "createdAt": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
            "lastLogin": last_log.isoformat() if hasattr(last_log, "isoformat") else str(last_log or "Never"),
        })
        
    return jsonify({
        "users": users,
        "total": total_count,
        "page": page,
        "limit": limit,
        "totalPages": (total_count + limit - 1) // limit if limit else 1,
    }), 200

@admin_bp.route("/users/invite", methods=["POST"])
@admin_required
def invite_user():
    db = get_database()
    admin_user = g.current_user
    data = request.get_json() or {}
    
    email = data.get("email", "").strip().lower()
    full_name = data.get("fullName") or data.get("name", "").strip()
    role = data.get("role", "DOCTOR").strip().upper()
    phone = data.get("phone", "").strip()
    specialty = data.get("specialty", "").strip()
    department = data.get("department", "").strip()
    
    if not email or not full_name:
        return jsonify({"error": "Validation Error", "detail": "Email and Full Name are required"}), 400
        
    if role not in ["ADMIN", "DOCTOR", "STAFF", "PATIENT"]:
        return jsonify({"error": "Validation Error", "detail": f"Invalid role: {role}"}), 400
        
    existing = db.users.find_one({"email": email})
    if existing:
        return jsonify({"error": "Conflict", "detail": f"A user account with email '{email}' already exists."}), 409
        
    # Generate 24-hour invite token
    invite_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    token_expires = now + timedelta(hours=24)
    
    # 6-digit staff ID if doctor or staff
    staff_id = None
    if role in ["STAFF", "DOCTOR", "ADMIN"]:
        import random
        staff_id = str(random.randint(100000, 999999))
        
    user_doc = {
        "name": full_name,
        "fullName": full_name,
        "email": email,
        "phone": phone,
        "role": role,
        "status": "invited",
        "email_verified": True,
        "invite_token": invite_token,
        "invite_token_expires_at": token_expires,
        "invited_by": str(admin_user["_id"]),
        "staff_id": staff_id,
        "staffId": staff_id,
        "specialty": specialty,
        "department": department,
        "created_at": now,
        "updated_at": now,
    }
    
    res = db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    
    # If doctor, also create initial doctors document
    if role == "DOCTOR":
        doc_record = {
            "user_id": user_id,
            "name": full_name,
            "email": email,
            "phone": phone,
            "specialty": specialty or "General Medicine",
            "department": department or "Outpatient Department",
            "hospital": "CareBridge Multi-Specialty Hospital",
            "experience_years": 5,
            "consultation_fee": 600,
            "status": "invited",
            "created_at": now,
        }
        db.doctors.insert_one(doc_record)
        
    # Send email invite
    send_user_invite_email(
        to_email=email,
        full_name=full_name,
        role=role,
        invite_token=invite_token,
        invited_by=admin_user.get("name") or "CareBridge Administrator"
    )
    
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="USER_INVITED",
        resource="USERS",
        resource_id=user_id,
        details=f"Admin invited new {role} user '{email}'"
    )
    
    return jsonify({
        "message": f"Invitation successfully sent to {email}",
        "userId": user_id,
        "inviteToken": invite_token,
    }), 201

@admin_bp.route("/users/<user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    db = get_database()
    admin_user = g.current_user
    data = request.get_json() or {}
    
    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid ID", "detail": "Malformed user ID"}), 400
        
    target = db.users.find_one({"_id": oid})
    if not target:
        return jsonify({"error": "Not Found", "detail": "User not found"}), 404
        
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if "fullName" in data or "name" in data:
        name = (data.get("fullName") or data.get("name", "")).strip()
        if name:
            update_fields["name"] = name
            update_fields["fullName"] = name
            
    if "phone" in data:
        update_fields["phone"] = data["phone"].strip()
        
    if "role" in data:
        r = data["role"].strip().upper()
        if r in ["ADMIN", "DOCTOR", "STAFF", "PATIENT"]:
            update_fields["role"] = r
            
    if "status" in data:
        st = data["status"].strip().lower()
        if st in ["active", "inactive", "invited"]:
            update_fields["status"] = st
            
    if "specialty" in data:
        update_fields["specialty"] = data["specialty"].strip()
        
    if "department" in data:
        update_fields["department"] = data["department"].strip()
        
    db.users.update_one({"_id": oid}, {"$set": update_fields})
    
    # Also sync doctor profile if exists
    if target.get("role") == "DOCTOR":
        doc_sync = {}
        if "name" in update_fields:
            doc_sync["name"] = update_fields["name"]
        if "phone" in update_fields:
            doc_sync["phone"] = update_fields["phone"]
        if "specialty" in update_fields:
            doc_sync["specialty"] = update_fields["specialty"]
        if "department" in update_fields:
            doc_sync["department"] = update_fields["department"]
        if doc_sync:
            db.doctors.update_one({"user_id": user_id}, {"$set": doc_sync})
            
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="USER_UPDATED",
        resource="USERS",
        resource_id=user_id,
        details=f"Admin updated details for user '{target.get('email')}'"
    )
    
    return jsonify({"message": "User details updated successfully"}), 200

@admin_bp.route("/users/<user_id>/status", methods=["PATCH"])
@admin_required
def toggle_user_status(user_id):
    db = get_database()
    admin_user = g.current_user
    data = request.get_json() or {}
    
    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid ID", "detail": "Malformed user ID"}), 400
        
    target = db.users.find_one({"_id": oid})
    if not target:
        return jsonify({"error": "Not Found", "detail": "User not found"}), 404
        
    # Prevent admin from deactivating self
    if str(target["_id"]) == str(admin_user["_id"]):
        return jsonify({"error": "Forbidden", "detail": "You cannot deactivate your own master admin account."}), 403
        
    new_status = data.get("status")
    if not new_status:
        current_status = target.get("status", "active")
        new_status = "inactive" if current_status == "active" else "active"
        
    db.users.update_one(
        {"_id": oid},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="USER_STATUS_CHANGED",
        resource="USERS",
        resource_id=user_id,
        details=f"Admin changed status of '{target.get('email')}' to {new_status}"
    )
    
    return jsonify({"message": f"User status changed to {new_status}", "status": new_status}), 200

@admin_bp.route("/users/<user_id>/reset-password", methods=["POST"])
@admin_required
def trigger_user_password_reset(user_id):
    db = get_database()
    admin_user = g.current_user
    
    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid ID", "detail": "Malformed user ID"}), 400
        
    target = db.users.find_one({"_id": oid})
    if not target:
        return jsonify({"error": "Not Found", "detail": "User not found"}), 404
        
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    db.users.update_one(
        {"_id": oid},
        {"$set": {
            "password_reset_token": reset_token,
            "password_reset_expires_at": expires_at,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    send_password_reset_email(
        to_email=target["email"],
        full_name=target.get("name") or "User",
        reset_token=reset_token
    )
    
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="PASSWORD_RESET_TRIGGERED",
        resource="USERS",
        resource_id=user_id,
        details=f"Admin sent password reset link to '{target.get('email')}'"
    )
    
    return jsonify({
        "message": f"Password reset email sent to {target['email']}",
        "resetToken": reset_token
    }), 200

@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    db = get_database()
    admin_user = g.current_user
    
    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid ID", "detail": "Malformed user ID"}), 400
        
    target = db.users.find_one({"_id": oid})
    if not target:
        return jsonify({"error": "Not Found", "detail": "User not found"}), 404
        
    if str(target["_id"]) == str(admin_user["_id"]):
        return jsonify({"error": "Forbidden", "detail": "You cannot delete your own master admin account."}), 403
        
    email = target.get("email")
    role = target.get("role")
    
    # Delete from users
    db.users.delete_one({"_id": oid})
    
    # Clean up linked role collection documents
    if role == "DOCTOR":
        db.doctors.delete_many({"$or": [{"user_id": user_id}, {"email": email}]})
    elif role == "PATIENT":
        db.patients.delete_many({"$or": [{"user_id": user_id}, {"email": email}]})
        
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="USER_DELETED",
        resource="USERS",
        resource_id=user_id,
        details=f"Admin permanently deleted {role} user '{email}'"
    )
    
    return jsonify({"message": f"User '{email}' and all linked records permanently deleted"}), 200

@admin_bp.route("/users/bulk-import", methods=["POST"])
@admin_required
def bulk_import_users():
    db = get_database()
    admin_user = g.current_user
    
    users_to_import = []
    
    # Check for file upload (CSV) or JSON array
    if "file" in request.files:
        file = request.files["file"]
        if not file.filename.endswith(".csv"):
            return jsonify({"error": "Validation Error", "detail": "Uploaded file must be a CSV (.csv)"}), 400
            
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        reader = csv.DictReader(stream)
        for row in reader:
            users_to_import.append(row)
    else:
        data = request.get_json() or {}
        users_to_import = data.get("users", [])
        
    if not users_to_import or not isinstance(users_to_import, list):
        return jsonify({"error": "Validation Error", "detail": "No valid user records provided for bulk import."}), 400
        
    imported_count = 0
    skipped_count = 0
    errors = []
    
    now = datetime.now(timezone.utc)
    
    for idx, row in enumerate(users_to_import):
        full_name = (row.get("fullName") or row.get("full_name") or row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()
        phone = (row.get("phone") or "").strip()
        role = (row.get("role") or "DOCTOR").strip().upper()
        specialty = (row.get("specialty") or row.get("department") or "General Practice").strip()
        department = (row.get("department") or row.get("specialty") or "Clinical Staff").strip()
        
        if not email or not full_name:
            skipped_count += 1
            errors.append(f"Row {idx+1}: Missing email or name ({email or 'No email'})")
            continue
            
        if role not in ["DOCTOR", "STAFF", "PATIENT", "ADMIN"]:
            role = "DOCTOR"
            
        if db.users.find_one({"email": email}):
            skipped_count += 1
            errors.append(f"Row {idx+1}: User '{email}' already exists")
            continue
            
        invite_token = secrets.token_urlsafe(32)
        token_expires = now + timedelta(hours=48)
        
        import random
        staff_id = str(random.randint(100000, 999999)) if role in ["STAFF", "DOCTOR", "ADMIN"] else None
        
        user_doc = {
            "name": full_name,
            "fullName": full_name,
            "email": email,
            "phone": phone,
            "role": role,
            "status": "invited",
            "email_verified": True,
            "invite_token": invite_token,
            "invite_token_expires_at": token_expires,
            "invited_by": str(admin_user["_id"]),
            "staff_id": staff_id,
            "staffId": staff_id,
            "specialty": specialty,
            "department": department,
            "created_at": now,
            "updated_at": now,
        }
        
        res = db.users.insert_one(user_doc)
        uid = str(res.inserted_id)
        
        if role == "DOCTOR":
            db.doctors.insert_one({
                "user_id": uid,
                "name": full_name,
                "email": email,
                "phone": phone,
                "specialty": specialty,
                "department": department,
                "hospital": "CareBridge Multi-Specialty Hospital",
                "experience_years": 8,
                "consultation_fee": 700,
                "status": "invited",
                "created_at": now,
            })
            
        # Dispatch invitation email
        send_user_invite_email(
            to_email=email,
            full_name=full_name,
            role=role,
            invite_token=invite_token,
            invited_by=admin_user.get("name") or "Administrator"
        )
        
        imported_count += 1
        
    log_audit_action(
        db=db,
        user_id=str(admin_user["_id"]),
        user_role="ADMIN",
        action="USERS_BULK_IMPORTED",
        resource="USERS",
        resource_id=f"count_{imported_count}",
        details=f"Admin bulk imported and invited {imported_count} clinical users ({skipped_count} skipped)"
    )
    
    return jsonify({
        "message": f"Successfully imported and invited {imported_count} user(s).",
        "importedCount": imported_count,
        "skippedCount": skipped_count,
        "errors": errors,
    }), 200
