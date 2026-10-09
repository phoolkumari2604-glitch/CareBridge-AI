from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.patient import patient_bp
from app.routes.doctor import doctor_bp
from app.routes.hospital import hospital_bp
from app.routes.appointment import appointment_bp
from app.routes.approval import approval_bp
from app.routes.opd_pass import opd_pass_bp
from app.routes.queue import queue_bp
from app.routes.smartflow import smartflow_bp
from app.routes.health import health_bp
from app.routes.vitals import vitals_bp
from app.routes.health_records import health_records_bp
from app.routes.health_alerts import health_alerts_bp
from app.routes.ai_assistant import ai_assistant_bp
from app.routes.notification import notification_bp
from app.routes.audit import audit_bp

__all__ = [
    "auth_bp",
    "admin_bp",
    "patient_bp",
    "doctor_bp",
    "hospital_bp",
    "appointment_bp",
    "approval_bp",
    "opd_pass_bp",
    "queue_bp",
    "smartflow_bp",
    "health_bp",
    "vitals_bp",
    "health_records_bp",
    "health_alerts_bp",
    "ai_assistant_bp",
    "notification_bp",
    "audit_bp",
]

