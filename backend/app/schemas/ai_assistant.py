from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.ai_assistant import AIChatRequest, AIChatResponse


router = APIRouter(
    prefix="/ai-assistant",
    tags=["AI Assistant"],
)


@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(
    request: AIChatRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # Validate patient ID
    if not ObjectId.is_valid(request.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID",
        )

    patient = db.patients.find_one(
        {"_id": ObjectId(request.patient_id)}
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    # Patient ownership protection
    if current_user.get("role") == "PATIENT":
        current_user_id = str(current_user["_id"])

        owns_patient = (
            patient.get("user_id") == current_user_id
            or patient.get("email") == current_user.get("email")
        )

        if not owns_patient:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own AI health assistant",
            )

    # Get latest vital signs
    latest_vital = db.vital_signs.find_one(
        {"patient_id": ObjectId(request.patient_id)},
        sort=[("recorded_at", -1)],
    )

    # Get health profile
    health_profile = db.health_profiles.find_one(
        {"patient_id": ObjectId(request.patient_id)}
    )

    # Get recent health records
    health_records = list(
        db.health_records.find(
            {"patient_id": ObjectId(request.patient_id)}
        )
        .sort("created_at", -1)
        .limit(5)
    )

    # Check configured health alerts
    alerts = []

    if latest_vital:
        heart_rate = latest_vital.get("heart_rate")
        systolic = latest_vital.get("systolic_bp")
        diastolic = latest_vital.get("diastolic_bp")
        spo2 = latest_vital.get("spo2")
        temperature = latest_vital.get("temperature")
        blood_sugar = latest_vital.get("blood_sugar")

        if heart_rate is not None and (
            heart_rate < 50 or heart_rate > 120
        ):
            alerts.append(
                "heart rate outside the configured range"
            )

        if systolic is not None and systolic >= 140:
            alerts.append(
                "high systolic blood pressure"
            )

        if diastolic is not None and diastolic >= 90:
            alerts.append(
                "high diastolic blood pressure"
            )

        if spo2 is not None and spo2 < 94:
            alerts.append("low SpO2")

        if temperature is not None and temperature >= 38:
            alerts.append("elevated temperature")

        if blood_sugar is not None and (
            blood_sugar < 70 or blood_sugar > 200
        ):
            alerts.append(
                "blood sugar outside the configured range"
            )

    user_message = request.message.lower()

    # Generate response
    if alerts:
        response = (
            "I found some configured health alerts in your "
            "recent vital-sign data: "
            + ", ".join(alerts)
            + ". Please review these readings with a "
              "qualified healthcare professional."
        )

    elif latest_vital:
        response = (
            "Your latest recorded vital signs do not currently "
            "trigger the configured health alerts. I can help "
            "you understand your recorded health information."
        )

    elif health_profile or health_records:
        response = (
            "I found health information in your CareBridge AI "
            "profile. I can help you understand the recorded "
            "information, but I cannot provide a medical diagnosis."
        )

    else:
        response = (
            "I do not have enough recorded health information yet. "
            "Please add your health profile or vital-sign readings first."
        )

    # Appointment-related response
    if "appointment" in user_message:
        response += (
            " You can also use the appointment section to view "
            "doctors and schedule an appointment."
        )

    # Hospital-related response
    if "hospital" in user_message:
        response += (
            " You can use Hospital Search to find available hospitals."
        )

    disclaimer = (
        "This AI assistant provides informational support based on "
        "recorded application data and is not a substitute for "
        "professional medical advice, diagnosis, or emergency care."
    )

    # ---------------------------------------------------------
    # SAVE USER MESSAGE
    # ---------------------------------------------------------

    now = datetime.now(timezone.utc)

    db.ai_conversations.insert_one(
        {
            "patient_id": ObjectId(request.patient_id),
            "message": request.message,
            "sender": "USER",
            "created_at": now,
        }
    )

    # ---------------------------------------------------------
    # SAVE AI RESPONSE
    # ---------------------------------------------------------

    db.ai_conversations.insert_one(
        {
            "patient_id": ObjectId(request.patient_id),
            "message": response,
            "sender": "AI",
            "created_at": datetime.now(timezone.utc),
        }
    )

    return {
        "patient_id": request.patient_id,
        "message": request.message,
        "response": response,
        "disclaimer": disclaimer,
    }




