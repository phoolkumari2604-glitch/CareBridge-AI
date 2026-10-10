import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.indexes import create_indexes
from app.routes import (
    auth_bp,
    admin_bp,
    patient_bp,
    doctor_bp,
    hospital_bp,
    appointment_bp,
    approval_bp,
    opd_pass_bp,
    queue_bp,
    smartflow_bp,
    health_bp,
    vitals_bp,
    health_records_bp,
    health_alerts_bp,
    ai_assistant_bp,
    notification_bp,
    audit_bp,
    billing_bp,
)

def create_app():
    app = Flask(__name__)
    
    # ----------------------------------------------------
    # CORS CONFIGURATION
    # ----------------------------------------------------
    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5000",
                    "http://127.0.0.1:5000"
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
                "supports_credentials": True
            }
        }
    )

    # ----------------------------------------------------
    # DATABASE INITIALIZATION
    # ----------------------------------------------------
    with app.app_context():
        try:
            connect_to_mongodb()
            try:
                create_indexes()
            except Exception as e:
                print(f"[Warning] Error creating indexes: {e}")
            print("[Success] MongoDB connected successfully.")
        except Exception as e:
            print(f"[Error] Failed to connect to MongoDB: {e}")

    # ----------------------------------------------------
    # ROOT & HEALTH CHECK
    # ----------------------------------------------------
    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "CareBridge AI Flask Backend",
            "status": "healthy",
            "version": "1.0.0"
        }), 200

    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "framework": "Flask",
            "database": "connected"
        }), 200

    # ----------------------------------------------------
    # REGISTER BLUEPRINTS (Both /api and root prefixes)
    # ----------------------------------------------------
    blueprints = [
        (auth_bp, "/auth"),
        (admin_bp, "/admin"),
        (patient_bp, "/patients"),
        (patient_bp, "/patient"),
        (doctor_bp, "/doctors"),
        (hospital_bp, "/hospitals"),
        (hospital_bp, "/facilities"),
        (appointment_bp, "/appointments"),
        (approval_bp, "/approvals"),
        (opd_pass_bp, "/opd-pass"),
        (queue_bp, "/queue"),
        (smartflow_bp, "/smartflow"),
        (health_bp, "/health-profiles"),
        (vitals_bp, "/vitals"),
        (health_records_bp, "/health-records"),
        (health_alerts_bp, "/health-alerts"),
        (ai_assistant_bp, "/ai-assistant"),
        (ai_assistant_bp, "/ai"),
        (notification_bp, "/notifications"),
        (audit_bp, "/audit-logs"),
        (billing_bp, "/billing"),
    ]

    for bp, prefix in blueprints:
        p_clean = prefix.strip("/").replace("-", "_")
        # Register under /api/<prefix>
        app.register_blueprint(bp, url_prefix=f"/api{prefix}", name=f"api_{p_clean}")
        # Register under /<prefix> for direct backward compatibility
        app.register_blueprint(bp, url_prefix=prefix, name=f"root_{p_clean}")

    # ----------------------------------------------------
    # GLOBAL ERROR HANDLERS
    # ----------------------------------------------------
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request", "detail": getattr(error, 'description', str(error))}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized", "detail": getattr(error, 'description', "Authentication required")}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden", "detail": getattr(error, 'description', "Access denied")}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "detail": "The requested resource was not found"}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"error": "Internal Server Error", "detail": "An internal error occurred. Please try again later."}), 500

    return app
