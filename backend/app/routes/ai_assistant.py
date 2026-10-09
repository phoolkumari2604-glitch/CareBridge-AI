from datetime import datetime, timezone
import os
import re
import secrets
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.ai_safety import detect_emergency, get_emergency_response
from app.services.ai_vision import strip_exif_and_sanitize, analyze_medical_images, MAX_IMAGES, MAX_IMAGE_SIZE_BYTES, ALLOWED_EXTENSIONS
from app.config import UPLOAD_FOLDER

ai_assistant_bp = Blueprint("ai_assistant", __name__)

CLINICAL_DISCLAIMER = (
    "CareBridge AI provides educational health insights and triage assistance. "
    "It is not a substitute for professional medical diagnosis, prescription, or emergency clinical care."
)

def generate_clinical_ai_response(role: str, message: str, context: dict) -> str:
    """
    Intelligent healthcare reasoning engine providing accurate clinical guidance,
    patient insights, staff workflows, and evidence-based general medical knowledge.
    """
    msg = message.lower().strip()
    role = (role or "PATIENT").upper()
    
    patient_name = context.get("patient_name", "Patient")
    vital = context.get("vitals") or {}
    alerts = context.get("alerts", [])
    records = context.get("records", [])
    
    # -------------------------------------------------------------
    # 1. DOCTOR ROLE CLINICAL DECISION SUPPORT
    # -------------------------------------------------------------
    if role == "DOCTOR":
        if "differential" in msg or "ddx" in msg or "diagnos" in msg:
            return (
                "**Clinical Decision Support — Differential Considerations:**\n\n"
                "1. **Primary Etiology Evaluation**: Correlate presenting symptoms with current telemetry data, CBC, metabolic panel, and inflammatory markers (CRP/ESR).\n"
                "2. **Rule-Out Priorities**: Exclude acute coronary syndrome, pulmonary embolism, severe sepsis, or acute neurological deficits if red-flag symptoms are present.\n"
                "3. **Diagnostic Workup Recommendation**: Consider 12-lead ECG, targeted ultrasound/CT, serum troponin, and comprehensive electrolyte panel based on clinical acuity.\n"
                "4. **ICD-10 Categorization**: Verify specific diagnostic codes according to ICD-10-CM clinical guidelines."
            )
        elif "interaction" in msg or "drug" in msg or "medication" in msg or "dose" in msg or "contraindication" in msg:
            return (
                "**Pharmacological & Interaction Reference:**\n\n"
                "• **Cross-Reactivity Check**: Screen patient's recorded allergies before administering beta-lactams, sulfonamides, or NSAIDs.\n"
                "• **Renal/Hepatic Adjustment**: For patients with GFR < 50 mL/min or elevated ALT/AST, titrate dose intervals and monitor therapeutic drug levels.\n"
                "• **Anticoagulant & Antiplatelet Caution**: Check for concurrent use of DOACs/Warfarin with NSAIDs or SSRIs to avoid increased bleeding risk.\n"
                "• **Cytochrome P450**: Verify potential CYP3A4/CYP2D6 inhibition/induction when co-prescribing statins, macrolides, or antifungals."
            )
        elif "soap" in msg or "note" in msg or "summary" in msg:
            return (
                "**Standard Clinical SOAP Note Framework:**\n\n"
                "• **Subjective (S)**: Chief complaint, history of present illness (HPI), duration, severity (1-10), aggravating/alleviating factors.\n"
                "• **Objective (O)**: Vital signs (BP, HR, SpO2, Temp), physical exam findings by system, lab/imaging review.\n"
                "• **Assessment (A)**: Primary clinical diagnosis with differential considerations and risk stratification.\n"
                "• **Plan (P)**: Pharmacotherapy, diagnostic tests ordered, dietary/activity instructions, follow-up timeline."
            )
        elif "vital" in msg or "telemetry" in msg or "ecg" in msg or "spo2" in msg:
            if vital:
                return (
                    f"**Patient Telemetry Review ({patient_name}):**\n\n"
                    f"• **Heart Rate**: {vital.get('heart_rate', 'N/A')} bpm\n"
                    f"• **Blood Pressure**: {vital.get('systolic_bp', 'N/A')}/{vital.get('diastolic_bp', 'N/A')} mmHg\n"
                    f"• **Oxygen Saturation (SpO2)**: {vital.get('spo2', 'N/A')}%\n"
                    f"• **Core Temperature**: {vital.get('temperature', 'N/A')} °C\n"
                    f"• **Blood Glucose**: {vital.get('blood_sugar', 'N/A')} mg/dL\n"
                    f"• **Clinical Status**: {vital.get('status', 'STABLE')}\n\n"
                    + ("*Active Alerts Detected*: " + ", ".join(alerts) if alerts else "*All recorded vital metrics fall within expected clinical parameters.*")
                )
            return (
                "**Patient Telemetry Notice:**\n"
                "No recent vital telemetry stream is on file for this patient. You can record fresh vitals in the **Vital Signs** tab or perform a bed-side intake assessment."
            )
        else:
            return (
                f"**Clinical rounds assistance for Dr. {context.get('doctor_name', 'Doctor')}:**\n\n"
                "I am ready to assist with clinical summaries, ICD-10 coding queries, drug interaction verification, or telemetry vital trend analysis. "
                "You can also attach clinical observations, imaging photos, or query specific patient vitals."
            )

    # -------------------------------------------------------------
    # 2. STAFF ROLE ADMINISTRATIVE & TRIAGE WORKFLOW
    # -------------------------------------------------------------
    if role == "STAFF":
        if "queue" in msg or "token" in msg or "wait" in msg:
            return (
                "**OPD Live Queue Management Protocol:**\n\n"
                "1. Direct walk-in patients to the registration kiosk to generate their digital OPD pass and token.\n"
                "2. High-priority/elderly patients can be escalated via the Queue Manager interface.\n"
                "3. Monitor average consultation duration and notify waiting patients if doctor delays exceed 20 minutes."
            )
        elif "appointment" in msg or "booking" in msg or "schedule" in msg:
            return (
                "**Appointment & Doctor Slot Management:**\n\n"
                "• Appointments can be approved, rescheduled, or cancelled from the 'Approvals' and 'Appointments' panels.\n"
                "• Emergency walk-ins may be assigned to available duty doctors with open buffer slots."
            )
        else:
            return (
                "**CareBridge Hospital Staff Assistant:**\n\n"
                "I can help you with patient intake protocols, live queue status updates, bed allocation guidance, and doctor availability schedules."
            )

    # -------------------------------------------------------------
    # 3. PATIENT & GENERAL HEALTH INQUIRIES
    # -------------------------------------------------------------
    # Vitals Inquiry
    if "my vital" in msg or "my bp" in msg or "heart rate" in msg or "blood pressure" in msg or "sugar" in msg or "temperature" in msg:
        if vital:
            return (
                f"**Your Latest Recorded Vital Signs:**\n\n"
                f"• **Heart Rate**: {vital.get('heart_rate', 72)} BPM (Normal range: 60-100 BPM)\n"
                f"• **Blood Pressure**: {vital.get('systolic_bp', 120)}/{vital.get('diastolic_bp', 80)} mmHg (Ideal: < 120/80 mmHg)\n"
                f"• **Oxygen Level (SpO2)**: {vital.get('spo2', 98)}% (Normal: 95-100%)\n"
                f"• **Body Temperature**: {vital.get('temperature', 36.8)} °C (Normal: 36.5-37.5 °C)\n"
                f"• **Blood Sugar**: {vital.get('blood_sugar', 95)} mg/dL\n\n"
                + (f"⚠️ *Notice*: Elevated or alerted parameters noted for {', '.join(alerts)}. Please consider scheduling a consultation with your doctor." if alerts else "✅ All your current vital parameters are within stable reference ranges.")
            )
        return (
            "**Welcome to CareBridge Health Monitoring!**\n\n"
            "We don't have your latest vital readings recorded yet. Here is how you can easily get started:\n"
            "1. **Log Your Vitals**: Visit your **My Health** section to enter your current Blood Pressure, Heart Rate, and Blood Sugar.\n"
            "2. **Upload a Report**: Click the 📎 paperclip icon or 📷 camera below to share a photo of your recent lab report or prescription.\n"
            "3. **Book a Checkup**: Click **Find Doctor** to schedule a quick routine checkup.\n\n"
            "In the meantime, healthy adult benchmarks are: Heart Rate 60–100 BPM, Blood Pressure < 120/80 mmHg, and SpO2 95–100%."
        )

    # General Medical Questions: Blood Pressure
    if "high blood pressure" in msg or "hypertension" in msg or "lower bp" in msg:
        return (
            "**Understanding Blood Pressure & Healthy Habits:**\n\n"
            "• **Healthy Targets**: Normal blood pressure is below 120/80 mmHg. Consistent readings above 130/80 mmHg indicate hypertension.\n"
            "• **Dietary Approaches (DASH)**: Reduce sodium (< 2,000 mg/day), increase potassium-rich vegetables, fruits, whole grains, and lean proteins.\n"
            "• **Physical Activity**: Aim for at least 150 minutes of moderate aerobic exercise (brisk walking, cycling) per week.\n"
            "• **Stress & Sleep**: Prioritize 7-8 hours of quality sleep and practice deep breathing or meditation.\n"
            "• **When to Consult**: If your BP repeatedly exceeds 140/90 mmHg, consult your doctor for a tailored management plan."
        )

    # Diabetes & Blood Sugar
    if "diabetes" in msg or "blood sugar" in msg or "glucose" in msg:
        return (
            "**Blood Sugar & Diabetes Management Insights:**\n\n"
            "• **Reference Ranges (Fasting)**: Normal fasting glucose is 70–99 mg/dL. Pre-diabetes is 100–125 mg/dL; diabetes is diagnosed at ≥ 126 mg/dL on multiple tests.\n"
            "• **HbA1c Target**: For most adults with diabetes, an HbA1c below 7.0% helps prevent microvascular complications.\n"
            "• **Key Lifestyle Pillars**:\n"
            "  1. Balanced meals with low glycemic index carbohydrates, dietary fiber, and healthy fats.\n"
            "  2. Consistent daily physical movement to improve insulin sensitivity.\n"
            "  3. Regular monitoring and hydration.\n"
            "• Always adhere to your prescribed insulin or oral hypoglycemic medication schedule."
        )

    # Fever & Flu / Cold
    if "fever" in msg or "cold" in msg or "cough" in msg or "flu" in msg:
        return (
            "**Fever & Cold Home Care Guidelines:**\n\n"
            "• **Hydration**: Drink plenty of fluids (water, herbal teas, warm broths, oral rehydration solutions).\n"
            "• **Rest**: Get ample bed rest to allow your immune system to fight the infection.\n"
            "• **Temperature Control**: Wear light clothing, use a light blanket, and apply lukewarm sponge compresses if necessary.\n"
            "• **Red Flags for Prompt Medical Attention**:\n"
            "  - Fever > 39°C (102.2°F) or fever persisting over 3 days\n"
            "  - Stiff neck, confusion, shortness of breath, or rash\n"
            "  - Inability to keep fluids down"
        )

    # Headache & Migraine
    if "headache" in msg or "migraine" in msg:
        return (
            "**Headache Management & Triggers:**\n\n"
            "• **Common Triggers**: Dehydration, eye strain/screen fatigue, stress, irregular sleep, skipping meals, or caffeine withdrawal.\n"
            "• **Relief Steps**: Rest in a quiet, dark room, drink a large glass of water, apply a cold or warm compress to forehead/neck.\n"
            "• **Immediate Warning Signs**: Seek urgent medical care for 'thunderclap' sudden severe headache, headache with numbness/weakness, vision loss, or stiff neck with fever."
        )

    # Nutrition & Diet
    if "diet" in msg or "nutrition" in msg or "weight loss" in msg or "food" in msg or "eat" in msg:
        return (
            "**Balanced Nutrition & Wellness Principles:**\n\n"
            "• **Plate Composition**: Fill half your plate with colorful vegetables and salads, one quarter with lean protein (lentils, fish, poultry, tofu), and one quarter with complex carbohydrates (brown rice, oats, quinoa).\n"
            "• **Hydration**: Aim for 2 to 3 liters of clean water daily unless restricted by renal or cardiac conditions.\n"
            "• **Limit Processed Foods**: Minimize refined sugars, trans fats, and excess dietary sodium.\n"
            "• For personalized dietary plans suited to conditions like diabetes, kidney health, or hypertension, schedule a consultation with our hospital clinical nutritionist."
        )

    # Sleep & Mental Health
    if "sleep" in msg or "insomnia" in msg or "stress" in msg or "anxiety" in msg:
        return (
            "**Sleep Hygiene & Mental Well-Being:**\n\n"
            "• **Consistent Sleep Schedule**: Go to bed and wake up at the same time each day, including weekends.\n"
            "• **Screen Discipline**: Avoid blue-light screens (phones, laptops) 60 minutes before bedtime.\n"
            "• **Relaxation Ritual**: Engage in reading, warm baths, or box-breathing exercises (inhale 4s, hold 4s, exhale 4s, hold 4s).\n"
            "• If feelings of anxiety or low mood persist, professional counseling and psychiatric support are accessible through CareBridge AI."
        )

    # Appointments / Queue / OPD Pass
    if "appointment" in msg or "book" in msg or "doctor" in msg:
        return (
            "You can easily book or view appointments with CareBridge specialists:\n"
            "1. Navigate to the **Find Doctor** or **Appointments** section in your dashboard.\n"
            "2. Select your required specialty (Cardiology, Pediatrics, General Medicine, etc.).\n"
            "3. Choose a convenient date and available time slot to confirm your booking."
        )

    if "queue" in msg or "opd pass" in msg or "token" in msg:
        return (
            "**Live Queue & Digital OPD Pass:**\n\n"
            "• View your live token number, queue position, and estimated wait time in the **Live Queue** tab.\n"
            "• Your digital QR-coded OPD Pass is available for download and scanning under the **Digital OPD Pass** section."
        )

    if "record" in msg or "report" in msg or "lab" in msg:
        return (
            f"You currently have {len(records)} medical document(s) uploaded in your Health Records repository. "
            "You can securely upload new diagnostic reports, prescriptions, and lab test PDFs anytime from the **Health Records** tab or by attaching them here."
        )

    # General Greeting / Default Patient Response
    return (
        f"Hello {patient_name}! I am your CareBridge AI Health Assistant.\n\n"
        "You can ask me about:\n"
        "• Your recorded vital signs and physiological status\n"
        "• Explaining prescriptions, diagnostic photos, or lab reports (use 📎 or 📷)\n"
        "• Symptoms, first aid, and wellness questions\n"
        "• Scheduling appointments or checking your live OPD queue\n\n"
        "How can I assist you with your health today?"
    )

@ai_assistant_bp.route("/chat", methods=["POST"], strict_slashes=False)
@token_required
def chat_with_ai():
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "PATIENT").upper()
    
    # Handle multipart/form-data or JSON payloads
    message = ""
    patient_id = None
    uploaded_files_list = []
    
    if request.content_type and "multipart/form-data" in request.content_type:
        message = request.form.get("message", "").strip()
        patient_id = request.form.get("patient_id")
        
        # Check files in request
        raw_files = request.files.getlist("images") or request.files.getlist("file") or request.files.getlist("photos")
        if not raw_files and "image" in request.files:
            raw_files = [request.files["image"]]
            
        if len(raw_files) > MAX_IMAGES:
            return jsonify({"error": "Validation Error", "detail": f"Maximum {MAX_IMAGES} images allowed per request"}), 400
            
        for file in raw_files:
            if not file or not file.filename:
                continue
            ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({"error": "Validation Error", "detail": f"Invalid format '{ext}'. Allowed formats: PNG, JPG, WEBP"}), 400
                
            file_bytes = file.read()
            if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
                return jsonify({"error": "Validation Error", "detail": f"File '{file.filename}' exceeds 5 MB limit"}), 400
                
            # Strip EXIF & privacy sanitization
            clean_bytes, clean_name = strip_exif_and_sanitize(file_bytes, file.filename)
            unique_filename = f"ai_img_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(4)}_{clean_name}"
            save_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            with open(save_path, "wb") as f:
                f.write(clean_bytes)
                
            uploaded_files_list.append({
                "filename": clean_name,
                "file_url": f"/api/health-records/files/{unique_filename}",
                "size_bytes": len(clean_bytes)
            })
    else:
        data = request.get_json() or {}
        message = data.get("message", "").strip()
        patient_id = data.get("patient_id")
        # May contain pre-uploaded file URLs or image metadata
        uploaded_files_list = data.get("attachments") or data.get("images") or []

    if not message and not uploaded_files_list:
        return jsonify({"error": "Validation Error", "detail": "Message or image is required"}), 400

    # Emergency safety check on text query
    if message and detect_emergency(message):
        emergency_text = get_emergency_response()
        full_emergency_response = (
            "🚨 **CRITICAL MEDICAL EMERGENCY DETECTED**\n\n"
            f"{emergency_text}\n\n"
            "**Immediate Steps:**\n"
            "1. **Call Emergency Services Immediately**: Dial **102** (Ambulance) or **112** (Emergency Helpline).\n"
            "2. **Do Not Drive Yourself**: Have someone transport you or wait for an ambulance.\n"
            "3. **Stay Calm & Resting**: Keep in a comfortable, seated or recovery position while help arrives."
        )
        
        # Save emergency conversation
        db.ai_conversations.insert_one({
            "user_id": user_id,
            "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else None,
            "role": user_role,
            "message": message,
            "attachments": uploaded_files_list,
            "sender": "USER",
            "created_at": datetime.now(timezone.utc)
        })
        db.ai_conversations.insert_one({
            "user_id": user_id,
            "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else None,
            "role": user_role,
            "message": full_emergency_response,
            "sender": "AI",
            "created_at": datetime.now(timezone.utc)
        })
        
        return jsonify({
            "patient_id": str(patient_id) if patient_id else user_id,
            "message": message,
            "response": full_emergency_response,
            "is_emergency": True,
            "attachments": uploaded_files_list,
            "disclaimer": CLINICAL_DISCLAIMER
        }), 200

    # Context Resolution
    context = {
        "user_name": current_user.get("name", "User"),
        "doctor_name": current_user.get("name", "Doctor"),
        "patient_name": current_user.get("name", "Patient"),
        "vitals": None,
        "alerts": [],
        "records": []
    }

    patient_obj_id = None
    if patient_id and is_valid_object_id(patient_id):
        patient_obj_id = ObjectId(patient_id)
    elif user_role == "PATIENT":
        p_doc = db.patients.find_one({"$or": [{"user_id": user_id}, {"email": current_user.get("email")}]})
        if p_doc:
            patient_obj_id = p_doc["_id"]
            context["patient_name"] = p_doc.get("name", current_user.get("name"))

    if patient_obj_id:
        vital_doc = db.vital_signs.find_one({"patient_id": patient_obj_id}, sort=[("recorded_at", -1)])
        if vital_doc:
            context["vitals"] = vital_doc
            hr = vital_doc.get("heart_rate")
            sys = vital_doc.get("systolic_bp")
            dia = vital_doc.get("diastolic_bp")
            spo2 = vital_doc.get("spo2")
            temp = vital_doc.get("temperature")
            sugar = vital_doc.get("blood_sugar")
            
            if hr and (hr < 50 or hr > 110): context["alerts"].append(f"Heart Rate ({hr} bpm)")
            if sys and sys >= 140: context["alerts"].append(f"Systolic BP ({sys} mmHg)")
            if dia and dia >= 90: context["alerts"].append(f"Diastolic BP ({dia} mmHg)")
            if spo2 and spo2 < 94: context["alerts"].append(f"Oxygen SpO2 ({spo2}%)")
            if temp and temp >= 38.0: context["alerts"].append(f"Temperature ({temp}°C)")
            if sugar and (sugar < 70 or sugar > 180): context["alerts"].append(f"Blood Sugar ({sugar} mg/dL)")

        context["records"] = list(db.health_records.find({"patient_id": patient_obj_id}).sort("created_at", -1).limit(5))

    # Generate response (Vision vs Text Reasoning)
    if uploaded_files_list:
        ai_response = analyze_medical_images(uploaded_files_list, message, context)
    else:
        ai_response = generate_clinical_ai_response(user_role, message, context)

    # Persist conversation
    db.ai_conversations.insert_one({
        "user_id": user_id,
        "patient_id": patient_obj_id,
        "role": user_role,
        "message": message or f"[{len(uploaded_files_list)} Medical Image(s) Attached]",
        "attachments": uploaded_files_list,
        "sender": "USER",
        "created_at": datetime.now(timezone.utc)
    })
    db.ai_conversations.insert_one({
        "user_id": user_id,
        "patient_id": patient_obj_id,
        "role": user_role,
        "message": ai_response,
        "sender": "AI",
        "created_at": datetime.now(timezone.utc)
    })

    return jsonify({
        "patient_id": str(patient_obj_id) if patient_obj_id else user_id,
        "message": message,
        "response": ai_response,
        "attachments": uploaded_files_list,
        "is_emergency": False,
        "disclaimer": CLINICAL_DISCLAIMER
    }), 200

@ai_assistant_bp.route("/history/<target_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_ai_history(target_id):
    db = get_database()
    query = {
        "$or": [
            {"user_id": target_id},
            {"patient_id": ObjectId(target_id) if is_valid_object_id(target_id) else target_id}
        ]
    }
    messages = list(db.ai_conversations.find(query).sort("created_at", 1).limit(100))
    return jsonify(serialize_doc(messages)), 200

@ai_assistant_bp.route("/history/all/<target_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def clear_all_ai_history(target_id):
    db = get_database()
    query = {
        "$or": [
            {"user_id": target_id},
            {"patient_id": ObjectId(target_id) if is_valid_object_id(target_id) else target_id}
        ]
    }
    db.ai_conversations.delete_many(query)
    return jsonify({"message": "Conversation history cleared successfully"}), 200

@ai_assistant_bp.route("/history", methods=["POST"], strict_slashes=False)
@token_required
def save_ai_message():
    db = get_database()
    current_user = g.current_user
    user_id = str(current_user["_id"])
    data = request.get_json() or {}
    
    patient_id = data.get("patient_id")
    message = data.get("message")
    sender = data.get("sender", "USER").upper()
    
    if not message:
        return jsonify({"error": "Validation Error", "detail": "message is required"}), 400
        
    doc = {
        "user_id": user_id,
        "patient_id": ObjectId(patient_id) if is_valid_object_id(patient_id) else patient_id,
        "role": current_user.get("role", "PATIENT"),
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

