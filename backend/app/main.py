from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import (
    connect_to_mongodb,
    close_mongodb_connection,
)
from app.core.indexes import create_indexes
from app.core.error_handler import register_error_handlers

from app.routes.patient import router as patient_router
from app.routes.hospital import router as hospital_router
from app.routes.doctor import router as doctor_router
from app.routes.appointment import router as appointment_router
from app.routes.approval import router as approval_router
from app.routes.opd_pass import router as opd_pass_router
from app.routes.queue import router as queue_router
from app.routes.smartflow import router as smartflow_router
from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.vitals import router as vitals_router
from app.routes.health_records import router as health_records_router
from app.routes.health_alerts import router as health_alerts_router
from app.routes.ai_assistant import router as ai_assistant_router
from app.routes.conversation import router as conversation_router
from app.routes.audit import router as audit_router
from app.routes.notification import router as notification_router


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="CareBridge AI",
    description="Patient Health Monitoring System API",
    version="1.0.0",
)


# ============================================================
# ERROR HANDLING
# ============================================================

register_error_handlers(app)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE LIFECYCLE
# ============================================================

@app.on_event("startup")
def startup_event():
    connect_to_mongodb()
    create_indexes()


@app.on_event("shutdown")
def shutdown_event():
    close_mongodb_connection()


# ============================================================
# BASIC ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "message": "CareBridge AI Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================================
# API ROUTES
# ============================================================

app.include_router(patient_router)
app.include_router(hospital_router)
app.include_router(doctor_router)
app.include_router(appointment_router)
app.include_router(approval_router)
app.include_router(opd_pass_router)
app.include_router(queue_router)
app.include_router(smartflow_router)
app.include_router(auth_router)
app.include_router(health_router)
app.include_router(vitals_router)
app.include_router(health_records_router)
app.include_router(health_alerts_router)
app.include_router(ai_assistant_router)
app.include_router(conversation_router)
app.include_router(audit_router)
app.include_router(notification_router)