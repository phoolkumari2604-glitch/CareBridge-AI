from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.ai_safety import detect_emergency, get_emergency_response

ai_assistant_bp = Blueprint("ai_assistant", __name__)

@ai_assistant_bp.route("/chat", methods=["POST"], strict_slashes=False)
@token_required
def chat_with_ai():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    message = data.get("message", "").strip()
    
    if not patient_id or not message:
        return jsonify({"error": "Validation Error", "detail": "patient_id and message are required"}), 400
        
    if is_valid_object_id(patient_id):
        patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    else:
        patient = db.patients.find_one({"user_id": patient_id})
        
    if not patient:
        return jsonify({"error": "Not Found", "detail": "Patient not found"}), 404
        
    p_id_obj = patient["_id"]
    p_id_str = str(patient["_id"])
    
    # Check for emergency symptoms
    if detect_emergency(message):
        response_text = get_emergency_response()
        disclaimer = "EMERGENCY: This assistant is not a replacement for emergency medical care. Call 102/112 immediately."
        
        db.ai_conversations.insert_one({
            "patient_id": p_id_obj,
            "message": message,
            "sender": "USER",
            "created_at": datetime.now(timezone.utc)
        })
        db.ai_conversations.insert_one({
            "patient_id": p_id_obj,
            "message": response_text,
            "sender": "AI",
            "created_at": datetime.now(timezone.utc)
        })
        
        return jsonify({
            "patient_id": p_id_str,
            "message": message,
            "response": response_text,
            "disclaimer": disclaimer
        }), 200
        
    # Context gathering
    latest_vital = db.vital_signs.find_one({"patient_id": p_id_obj}, sort=[("recorded_at", -1)])
    health_profile = db.health_profiles.find_one({"patient_id": p_id_obj})
    records = list(db.health_records.find({"patient_id": p_id_obj}).sort("created_at", -1).limit(3))
    
    alerts = []
    if latest_vital:
        hr = latest_vital.get("heart_rate")
        sys = latest_vital.get("systolic_bp")
        dia = latest_vital.get("diastolic_bp")
        spo2 = latest_vital.get("spo2")
        temp = latest_vital.get("temperature")
        sugar = latest_vital.get("blood_sugar")
        
        if hr and (hr < 50 or hr > 120): alerts.append(f"heart rate ({hr} bpm)")
        if sys and sys >= 140: alerts.append(f"systolic BP ({sys} mmHg)")
        if dia and dia >= 90: alerts.append(f"diastolic BP ({dia} mmHg)")
        if spo2 and spo2 < 94: alerts.append(f"oxygen saturation ({spo2}%)")
        if temp and temp >= 38.0: alerts.append(f"temperature ({temp}°C)")
        if sugar and (sugar < 70 or sugar > 200): alerts.append(f"blood sugar ({sugar} mg/dL)")

    user_msg_lower = message.lower()
    
    if "pain" in user_msg_lower or "fever" in user_msg_lower or "headache" in user_msg_lower or "cough" in user_msg_lower:
        response_text = f"I note your symptom '{message}'. Please monitor your hydration and resting temperature."
        if alerts:
            response_text += f" Also, your recorded vitals indicate elevated {', '.join(alerts)}. We recommend booking a consultation with your physician."
        else:
            response_text += " Your recent vital readings appear stable. If symptoms worsen, please book a doctor appointment."
    elif "appointment" in user_msg_lower or "book" in user_msg_lower or "doctor" in user_msg_lower:
        response_text = "You can view available doctors and schedule an appointment directly from the 'Find Doctor' or 'Appointments' section in your dashboard."
    elif "queue" in user_msg_lower or "token" in user_msg_lower:
        response_text = "You can check your real-time token number, patients ahead, and estimated wait time on the 'Live Queue' tab."
    elif "record" in user_msg_lower or "report" in user_msg_lower or "lab" in user_msg_lower:
        response_text = f"You have {len(records)} medical document(s) uploaded in your health records. You can upload new lab files from the 'Health Records' section."
    elif alerts:
        response_text = f"According to your latest vitals, there are active alerts for {', '.join(alerts)}. Please consult your healthcare provider for clinical evaluation."
    elif latest_vital:
        response_text = f"Your latest vital signs are: Heart Rate {latest_vital.get('heart_rate', 72)} BPM, BP {latest_vital.get('systolic_bp', 120)}/{latest_vital.get('diastolic_bp', 80)} mmHg, SpO2 {latest_vital.get('spo2', 98)}%. How can I assist you with your health today?"
    else:
        response_text = f"Hello {patient.get('name', 'there')}. I am your CareBridge Clinical AI Assistant. You can ask me about your vitals, appointments, medications, or hospital services."

    disclaimer = "CareBridge AI provides educational health insights and triage assistance. It is not a substitute for professional medical diagnosis or clinical prescription."

    # Save to history
    db.ai_conversations.insert_one({
        "patient_id": p_id_obj,
        "message": message,
        "sender": "USER",
        "created_at": datetime.now(timezone.utc)
    })
    db.ai_conversations.insert_one({
        "patient_id": p_id_obj,
        "message": response_text,
        "sender": "AI",
        "created_at": datetime.now(timezone.utc)
    })

    return jsonify({
        "patient_id": p_id_str,
        "message": message,
        "response": response_text,
        "disclaimer": disclaimer
    }), 200

@ai_assistant_bp.route("/history/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_ai_history(patient_id):
    db = get_database()
    query = {"patient_id": ObjectId(patient_id)} if is_valid_object_id(patient_id) else {"patient_id": patient_id}
    messages = list(db.ai_conversations.find(query).sort("created_at", 1).limit(100))
    return jsonify(serialize_doc(messages)), 200

@ai_assistant_bp.route("/history", methods=["POST"], strict_slashes=False)
@token_required
def save_ai_message():
    db = get_database()
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    message = data.get("message")
    sender = data.get("sender", "USER").upper()
    
    if not patient_id or not message:
        return jsonify({"error": "Validation Error", "detail": "patient_id and message are required"}), 400
        
    doc = {
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else patient_id,
        "message": message,
        "sender": sender,
        "created_at": datetime.now(timezone.utc)
    }
    res = db.ai_conversations.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return jsonify(serialize_doc(doc)), 201

@ai_assistant_bp.route("/history/<message_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def delete_ai_message(message_id):
    db = get_database()
    if is_valid_object_id(message_id):
        db.ai_conversations.delete_one({"_id": ObjectId(message_id)})
    return jsonify({"message": "Message deleted successfully"}), 200
