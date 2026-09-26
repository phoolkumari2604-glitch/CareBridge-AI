from fastapi import FastAPI

from app.core.database import (
    connect_to_mongodb,
    close_mongodb_connection,
)

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


app = FastAPI(
    title="CareBridge AI",
    description="Patient Health Monitoring System API",
    version="1.0.0",
)


# ============================================================
# DATABASE STARTUP / SHUTDOWN
# ============================================================

@app.on_event("startup")
def startup_event():
    connect_to_mongodb()


@app.on_event("shutdown")
def shutdown_event():
    close_mongodb_connection()


# ============================================================
# BASIC API ENDPOINTS
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
# PATIENT API
# ============================================================

app.include_router(patient_router)


# ============================================================
# HOSPITAL API
# ============================================================

app.include_router(hospital_router)


# ============================================================
# DOCTOR API
# ============================================================

app.include_router(doctor_router)


# ============================================================
# APPOINTMENT API
# ============================================================

app.include_router(appointment_router)


# ============================================================
# APPROVAL API
# ============================================================

app.include_router(approval_router)


# ============================================================
# DIGITAL OPD PASS API
# ============================================================

app.include_router(opd_pass_router)


# ============================================================
# LIVE QUEUE API
# ============================================================

app.include_router(queue_router)


# ============================================================
# SMARTFLOW API
# ============================================================

app.include_router(smartflow_router)


# ============================================================
# AUTHENTICATION API
# ============================================================

app.include_router(auth_router)


# ============================================================
# HEALTH MONITORING API
# ============================================================

app.include_router(health_router)