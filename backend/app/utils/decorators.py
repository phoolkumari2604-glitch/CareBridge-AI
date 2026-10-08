from functools import wraps
from flask import request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.security import decode_access_token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization header is missing", "detail": "Missing Authorization header"}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token format", "detail": "Invalid token format, expected 'Bearer <token>'"}), 401
        
        token = parts[1]
        try:
            payload = decode_access_token(token)
        except Exception as e:
            return jsonify({"error": "Invalid or expired token", "detail": str(e)}), 401
        
        user_id = payload.get("sub")
        if not user_id:
            return jsonify({"error": "Invalid token payload", "detail": "Missing user ID in token"}), 401
        
        try:
            db = get_database()
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found", "detail": "User associated with token does not exist"}), 401
            
            g.current_user = user
        except Exception as e:
            return jsonify({"error": "Database error during authentication", "detail": str(e)}), 500
        
        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            current_user = g.current_user
            user_role = current_user.get("role", "").upper()
            allowed = [r.upper() for r in allowed_roles]
            if user_role not in allowed:
                return jsonify({
                    "error": "Forbidden",
                    "detail": f"Access restricted. Required roles: {', '.join(allowed)}, got: {user_role}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# Convenience decorators
patient_required = roles_required("PATIENT")
staff_required = roles_required("STAFF")
admin_required = roles_required("ADMIN")
doctor_required = roles_required("DOCTOR")
staff_or_admin_required = roles_required("STAFF", "ADMIN")
doctor_or_admin_required = roles_required("DOCTOR", "ADMIN", "STAFF")
any_authenticated_required = token_required
