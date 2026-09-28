from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.dependencies import get_current_user, require_staff_or_admin

from app.schemas.health_alerts import HealthAlertResponse


router = APIRouter(
    prefix="/health-alerts",
    tags=["Health Alerts"],
)


@router.get("/{patient_id}", response_model=list[HealthAlertResponse])
def get_health_alerts(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own health alerts",
            )

    vitals = list(
        db.vital_signs.find(
            {"patient_id": ObjectId(patient_id)}
        ).sort("recorded_at", -1)
    )

    alerts = []

    for vital in vitals:
        vital_id = str(vital["_id"])
        recorded_at = vital.get("recorded_at")

        def add_alert(alert_type: str, severity: str, message: str):
            alerts.append({
                "patient_id": patient_id,
                "alert_type": alert_type,
                "severity": severity,
                "message": message,
                "vital_id": vital_id,
                "created_at": (
                    recorded_at.isoformat()
                    if recorded_at
                    else datetime.utcnow().isoformat()
                ),
            })

        heart_rate = vital.get("heart_rate")

        if heart_rate is not None:
            if heart_rate < 50:
                add_alert(
                    "HEART_RATE",
                    "HIGH",
                    "Heart rate is below the configured threshold.",
                )
            elif heart_rate > 120:
                add_alert(
                    "HEART_RATE",
                    "HIGH",
                    "Heart rate is above the configured threshold.",
                )

        systolic = vital.get("systolic_bp")
        diastolic = vital.get("diastolic_bp")

        if systolic is not None and systolic >= 140:
            add_alert(
                "BLOOD_PRESSURE",
                "HIGH",
                "Systolic blood pressure is above the configured threshold.",
            )

        if diastolic is not None and diastolic >= 90:
            add_alert(
                "BLOOD_PRESSURE",
                "HIGH",
                "Diastolic blood pressure is above the configured threshold.",
            )

        spo2 = vital.get("spo2")

        if spo2 is not None and spo2 < 94:
            add_alert(
                "SPO2",
                "HIGH",
                "SpO2 is below the configured threshold.",
            )

        temperature = vital.get("temperature")

        if temperature is not None and temperature >= 38.0:
            add_alert(
                "TEMPERATURE",
                "HIGH",
                "Temperature is above the configured threshold.",
            )

        blood_sugar = vital.get("blood_sugar")

        if blood_sugar is not None:
            if blood_sugar < 70:
                add_alert(
                    "BLOOD_SUGAR",
                    "HIGH",
                    "Blood sugar is below the configured threshold.",
                )
            elif blood_sugar > 200:
                add_alert(
                    "BLOOD_SUGAR",
                    "HIGH",
                    "Blood sugar is above the configured threshold.",
                )

    return alerts


@router.get("/{patient_id}/summary")
def get_health_alert_summary(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_record = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_record:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own health alerts",
            )

    vitals = list(
        db.vital_signs.find(
            {"patient_id": ObjectId(patient_id)}
        ).sort("recorded_at", -1)
    )

    total_alerts = 0
    high_alerts = 0

    for vital in vitals:
        heart_rate = vital.get("heart_rate")
        systolic = vital.get("systolic_bp")
        diastolic = vital.get("diastolic_bp")
        spo2 = vital.get("spo2")
        temperature = vital.get("temperature")
        blood_sugar = vital.get("blood_sugar")

        if heart_rate is not None and (
            heart_rate < 50 or heart_rate > 120
        ):
            total_alerts += 1
            high_alerts += 1

        if systolic is not None and systolic >= 140:
            total_alerts += 1
            high_alerts += 1

        if diastolic is not None and diastolic >= 90:
            total_alerts += 1
            high_alerts += 1

        if spo2 is not None and spo2 < 94:
            total_alerts += 1
            high_alerts += 1

        if temperature is not None and temperature >= 38.0:
            total_alerts += 1
            high_alerts += 1

        if blood_sugar is not None and (
            blood_sugar < 70 or blood_sugar > 200
        ):
            total_alerts += 1
            high_alerts += 1

    return {
        "patient_id": patient_id,
        "total_alerts": total_alerts,
        "high_alerts": high_alerts,
        "status": (
            "ALERT"
            if total_alerts > 0
            else "NORMAL"
        ),
        "message": (
            "Potentially concerning vital readings detected. "
            "Please review them with a qualified healthcare professional."
            if total_alerts > 0
            else "No configured vital-sign alerts detected."
        ),
    }
