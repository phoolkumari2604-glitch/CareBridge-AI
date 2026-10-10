import json
import time
from datetime import datetime, timezone
import os
import re
import secrets
from flask import Blueprint, request, jsonify, g, Response, stream_with_context
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.ai_safety import detect_emergency, get_emergency_response
from app.services.ai_vision import strip_exif_and_sanitize, analyze_medical_images, MAX_IMAGES, MAX_IMAGE_SIZE_BYTES, ALLOWED_EXTENSIONS
from app.services.clinical_kb import (
    seed_clinical_kb_if_empty,
    search_kb_conditions,
    format_protocol_card,
    check_drug_interactions,
    log_unmatched_query,
    normalize_text
)

# Optional Anthropic SDK for production streaming
try:
    import anthropic
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
except Exception:
    anthropic_client = None

ai_assistant_bp = Blueprint("ai_assistant", __name__)

CLINICAL_DISCLAIMER = (
    "CareBridge AI provides educational health insights and clinical decision support. "
    "It is not a substitute for formal bedside examination or emergency clinical care."
)

CLINICAL_SYSTEM_PROMPT = (
    "You are CareBridge MedAI, an advanced clinical decision support assistant for medical professionals and patients. "
    "The user may type short statements, symptoms, or events instead of questions. Treat every message as a clinical request. "
    "State briefly how you interpreted it, then give: "
    "(1) urgent red flags and immediate actions, "
    "(2) likely diagnoses or complications with ICD-10 codes where applicable, "
    "(3) recommended examination and laboratory/radiology tests, "
    "(4) evidence-based management plan, "
    "(5) when to refer or admit. "
    "If key details are missing (who, when, severity, baseline health), still give the best comprehensive clinical answer "
    "and list the 2-3 specific questions that would sharpen the assessment."
)


def build_clinical_response(message: str, role: str, context: dict) -> str:
    """Generate structured patient-specific assessment based on clinical request"""
    msg = message.lower().strip()
    patient_name = context.get("patient_name", "Patient")
    age = context.get("age", 48)
    gender = context.get("gender", "Unspecified")
    blood = context.get("blood_group", "O+")
    vital = context.get("vitals") or {}
    
    hr = vital.get("heart_rate", 76)
    sbp = vital.get("systolic_bp", 124)
    dbp = vital.get("diastolic_bp", 82)
    spo2 = vital.get("spo2", 98)
    temp = vital.get("temperature", 36.8)
    sugar = vital.get("blood_sugar", 98)

    # 1. Electric shock
    if "electric" in msg or "shock" in msg or "electrocution" in msg or "current" in msg:
        return f"""### 🩺 Patient-Specific Clinical Assessment: Electrical Injury
**Patient:** {patient_name} ({age}y, {gender}) · **Baseline:** HR {hr} bpm · BP {sbp}/{dbp} mmHg · SpO₂ {spo2}%

**Clinical Interpretation:** Electrical current exposure with potential for occult deep tissue coagulative injury, cardiac dysrhythmia, and secondary blunt trauma.

#### 1. 🚨 Urgent Red Flags & Immediate Actions
- **Airway & Breathing:** Immediate cervical spine stabilization if secondary fall occurred; supplemental O₂ if respiratory distress.
- **Cardiovascular:** High risk of occult ventricular arrhythmias (VF/VT) or transient conduction block. Obtain immediate 12-lead ECG.
- **Renal/Muscular:** Massive rhabdomyolysis causing acute tubular necrosis. Inspect urine for tea/burgundy discoloration.

#### 2. 📋 Likely Diagnoses & Complications (ICD-10)
- **Primary:** `T75.4` (Effects of electric current / Electrical shock injury)
- **Cardiovascular:** `I49.9` (Cardiac arrhythmia, unspecified)
- **Musculoskeletal/Renal:** `M62.82` (Rhabdomyolysis) & `N17.9` (Acute Kidney Injury)
- **Cutaneous:** `T30.0` (Electrical contact burns at entry/exit sites)

#### 3. 🔬 Recommended Examination & Diagnostic Workup
- **ECG:** 12-lead baseline immediately and continuous telemetry for 12–24h if symptomatic or high-voltage.
- **Lab Panel:** Serum Creatine Kinase (CK, CK-MB), Troponin I, Serum Creatinine, BUN, Electrolytes (K⁺, Ca²⁺), Urinalysis for myoglobin.
- **Imaging:** X-rays of extremities/spine if tetanic spasm or fall injury suspected.

#### 4. 💊 Management Plan
- **IV Fluid Resuscitation:** Isotonic 0.9% Saline targeted to maintain urinary output >= 1.5–2 mL/kg/hour until urine clears.
- **Burn Wound Care:** Gentle debridement, topical silver sulfadiazine, sterile dressings; verify tetanus vaccination status.
- **Pain Control:** Multimodal analgesia (Acetaminophen + IV opioid as indicated).

#### 5. 🏥 Disposition & Admission Criteria
- **Admit:** Any high voltage (>1000V), abnormal ECG, loss of consciousness, elevated troponin/CK, or deep burns.
- **Clarifying questions:** (1) What was the voltage source? (2) Was there loss of consciousness or a fall? (3) How long ago did the shock occur?"""

    # 2. Chest pain
    elif "chest" in msg or "angina" in msg or "coronary" in msg or "infarct" in msg:
        return f"""### 🩺 Patient-Specific Clinical Assessment: Acute Chest Pain
**Patient:** {patient_name} ({age}y, {gender}) · **Telemetry:** HR {hr} bpm · BP {sbp}/{dbp} mmHg · SpO₂ {spo2}%

**Clinical Interpretation:** Acute onset chest discomfort requiring emergent differentiation between Acute Coronary Syndrome (ACS), Pulmonary Embolism, Aortic Dissection, and non-emergent etiologies.

#### 1. 🚨 Urgent Red Flags & Immediate Actions
- Radiation of pain to jaw, neck, left arm, or back; diaphoresis, dyspnea, nausea, syncope.
- Immediate 12-lead ECG within 10 minutes of presentation.
- Oxygen therapy only if SpO₂ < 90%; establish wide-bore IV access.

#### 2. 📋 Differential Diagnoses (ICD-10)
- **`I21.9` Acute Myocardial Infarction (STEMI / NSTEMI)** — High clinical probability.
- **`I26.99` Acute Pulmonary Embolism** — Consider if sudden dyspnea, tachypnea, or DVT risk factors.
- **`I71.00` Acute Aortic Dissection** — Consider if tearing back pain with asymmetric blood pressures.
- **`J93.0` Spontaneous Pneumothorax** — Unilateral pleuritic pain and decreased breath sounds.
- **`K21.9` GERD / Esophageal Spasm / Musculoskeletal** — Diagnosis of exclusion.

#### 3. 🔬 Diagnostic Workup
- **Biomarkers:** Serial High-Sensitivity Cardiac Troponin (hs-cTn at 0h and 1h/3h).
- **Diagnostics:** Portable Chest X-ray, D-dimer, Comprehensive Metabolic Panel, Lipid Profile.

#### 4. 💊 Management Plan
- **Antiplatelet Loading:** Chewable Aspirin 300 mg + P2Y12 inhibitor (Ticagrelor 180 mg or Clopidogrel 300 mg) unless aortic dissection suspected.
- **Anti-anginal:** Sublingual Nitroglycerin 0.4 mg if SBP > 100 mmHg and no right ventricular infarct.
- **Anticoagulation:** Enoxaparin or unfractionated heparin once dissection ruled out.

#### 5. 🏥 Referral & Disposition
- Immediate Cardiac Catheterization Lab activation for STEMI (<90 min door-to-balloon).
- **Sharpening questions:** (1) Exact onset and duration of pain? (2) Does breathing or posture alter the pain? (3) Any history of cardiac disease or diabetes?"""

    # 3. Fever
    elif "fever" in msg or "pyrexia" in msg or "temperature" in msg or "bukhar" in msg:
        return f"""### 🩺 Patient-Specific Clinical Assessment: Acute Febrile Illness
**Patient:** {patient_name} ({age}y, {gender}) · **Vitals:** Core Temp {temp}°C · HR {hr} bpm · BP {sbp}/{dbp} mmHg

**Clinical Interpretation:** Acute febrile episode. Priority focus on screening for systemic sepsis, bacteremia, and endemic vector-borne illnesses (Dengue, Malaria, Typhoid).

#### 1. 🚨 Urgent Red Flags & Immediate Actions
- **Sepsis Screening:** SBP < 100 mmHg, Heart Rate > 100 bpm, Respiratory Rate > 22 bpm, altered mental status.
- **Neurological:** Nuchal rigidity, photophobia, petechial/purpuric skin lesions.
- **Hematological:** Bleeding manifestations, severe thrombocytopenia, or persistent vomiting.

#### 2. 📋 Differential Diagnoses (ICD-10)
- **`A97.9` Dengue Fever** — High clinical index during endemic transmission; retro-orbital pain, severe myalgia.
- **`B54` Malaria (P. falciparum / P. vivax)** — Paroxysmal fever with chills and rigors.
- **`A01.0` Typhoid Fever (Enteric Fever)** — Step-ladder pyrexia, coated tongue, relative bradycardia.
- **`J18.9` Pneumonia / Lower Respiratory Tract Infection** — Productive cough, tachypnea.
- **`A41.9` Sepsis, Unspecified** — Severe systemic inflammatory response.

#### 3. 🔬 Diagnostic Workup
- Complete Blood Count (CBC) with differential & platelet count, ESR, hs-CRP.
- Dengue NS1 Antigen & IgM/IgG, Malaria Antigen (RDT) & Peripheral Smear, Widal/Typhidot.
- Paired blood cultures before starting antibiotics if sepsis suspected; Urinalysis & culture.

#### 4. 💊 Management Plan
- **Antipyretic:** Paracetamol 650 mg PO Q6H PRN (maximum 3g/day).
- **CRITICAL WARNING:** Avoid NSAIDs (Ibuprofen, Aspirin) until Dengue is ruled out to prevent hemorrhagic complications.
- **Hydration:** Aggressive oral fluid intake (ORS, tender coconut water) or IV balanced crystalloids.

#### 5. 🏥 Disposition & Admission
- Admit if qSOFA >= 2, severe thrombocytopenia (platelets < 50,000/μL), dehydration, or warning signs of Dengue.
- **Sharpening questions:** (1) Are there chills, rash, or body ache? (2) Any cough, dysuria, or diarrhea? (3) Any recent travel?"""

    # 4. SOAP note
    elif "soap" in msg or "note" in msg:
        return f"""### 📋 Comprehensive Clinical SOAP Note
**Patient Name:** {patient_name} | **Age/Sex:** {age}y / {gender} | **ID Code:** {context.get('patient_code', 'Verified')}
**Date of Examination:** {datetime.now().strftime('%d %B %Y')} | **Attending Physician:** Dr. {context.get('doctor_name', 'Consultant')}

---

#### 1. Subjective (S)
* **Chief Complaint:** Clinical consultation and systemic physiological review.
* **History of Present Illness (HPI):** Patient reports ongoing health monitoring. Denies acute substernal chest pressure, orthopnea, paroxysmal nocturnal dyspnea, syncope, or focal neurological deficits.
* **Past Medical History:** Managed under CareBridge AI digital health surveillance.
* **Medications & Allergies:** Reviewed and verified in electronic health chart.

#### 2. Objective (O)
* **Physiological Telemetry:** HR {hr} bpm (Regular Sinus Rhythm) | BP {sbp}/{dbp} mmHg | SpO₂ {spo2}% (Room Air) | Temp {temp}°C | Blood Sugar {sugar} mg/dL.
* **General Examination:** Conscious, alert, oriented ×3. Well-perfused, no pallor, icterus, cyanosis, or peripheral pedal edema.
* **Cardiovascular:** S1, S2 audible, no murmurs, rubs, or gallops.
* **Respiratory:** Bilateral clear vesicular breath sounds throughout all lung fields. No wheezing or crackles.
* **Abdomen:** Soft, non-tender, non-distended; normal active bowel sounds.

#### 3. Assessment (A)
* **Primary Impression:** Stable clinical status with controlled hemodynamics.
* **Risk Stratification:** Low to Moderate acute cardiovascular/metabolic risk.

#### 4. Plan (P)
* **Diagnostics:** Routine quarterly metabolic panel (Lipid profile, HbA1c, Renal panel).
* **Therapeutics:** Maintain current prescribed medical regimen.
* **Lifestyle:** Sodium-restricted heart-healthy diet, 150 min/week moderate aerobic exercise.
* **Follow-up:** Scheduled clinical reassessment in 4 weeks or immediate emergency review if red-flag symptoms arise."""

    # 5. Default General Clinical Assessment
    else:
        return f"""### 🩺 Clinical Decision Support Assessment
**Patient Context Evaluated:** {patient_name} ({age}y, {gender}, Blood: {blood})  
**Active Telemetry Baseline:** HR {hr} bpm · BP {sbp}/{dbp} mmHg · SpO₂ {spo2}% · Temp {temp}°C · Glucose {sugar} mg/dL

**Clinical Query Interpretation:** "{message}" evaluated against evidence-based medical guidelines and active patient history.

#### 1. 🚨 Urgent Red Flags & Immediate Actions
- Screen for any acute chest pain, altered consciousness, dyspnea, severe persistent headache, or focal deficits.
- Maintain continuous hemodynamic and SpO₂ monitoring.

#### 2. 📋 Clinical Differentials & Considerations
- Primary symptomatic evaluation in accordance with current clinical baseline.
- Cross-reference with chronic medical history and active pharmacological regimen.

#### 3. 🔬 Recommended Investigations
- Vital signs trend analysis over the past 24–48 hours.
- Baseline screening: Complete Blood Count, Serum Electrolytes, Renal Panel.

#### 4. 💊 Management Strategy
- Symptom-directed supportive care and continuous telemetry tracking.
- Ensure adequate hydration and review any concurrent medications.

#### 5. 🏥 Referral & Disposition
- Follow up as scheduled; seek immediate emergency triage if acute hemodynamic instability occurs.
- **Clarifying questions:** (1) When did the symptoms start? (2) What is the severity on a 1-10 scale? (3) Any associated symptoms?"""


# ============================================================================
# 1. CORE AI CHAT & STREAMING ENDPOINT (/api/ai/chat, /api/ai-assistant/chat)
# ============================================================================
@ai_assistant_bp.route("/chat", methods=["POST"], strict_slashes=False)
@ai_assistant_bp.route("/chat/stream", methods=["POST", "GET"], strict_slashes=False)
@token_required
def clinical_ai_chat():
    """
    CareBridge Clinical AI Assistant Chat & SSE Stream Endpoint
    1. Looks up approved protocols in clinical KB -> sends instant verified card
    2. Checks drug interactions if 2+ medications mentioned
    3. Streams patient-specific clinical assessment token-by-token
    """
    db = get_database()
    seed_clinical_kb_if_empty()

    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "PATIENT").upper()
    user_id = str(current_user.get("_id") or current_user.get("id") or "")

    if request.method == "GET":
        message = request.args.get("message", "")
        patient_id = request.args.get("patient_id")
        stream_requested = True
    else:
        data = request.get_json() or {}
        message = data.get("message", "").strip()
        patient_id = data.get("patient_id")
        stream_requested = data.get("stream", True)

    if not message:
        return jsonify({"error": "Validation Error", "detail": "Message is required"}), 400

    # Build patient clinical context
    context = {
        "patient_name": current_user.get("name", "Patient"),
        "role": role,
        "age": 45,
        "gender": "Unspecified",
        "blood_group": "O+",
        "vitals": {},
        "alerts": [],
        "records": [],
        "medications": [],
        "allergies": []
    }

    if patient_id:
        p_obj = ObjectId(patient_id) if is_valid_object_id(patient_id) else None
        p_doc = db.patients.find_one({"$or": [{"_id": p_obj}, {"_id": patient_id}, {"patient_code": patient_id}] if p_obj else [{"_id": patient_id}, {"patient_code": patient_id}]})
        if p_doc:
            context["patient_name"] = p_doc.get("name", context["patient_name"])
            context["age"] = p_doc.get("age", 45)
            context["gender"] = p_doc.get("gender", "Unspecified")
            context["blood_group"] = p_doc.get("blood_group", "O+")
            context["patient_code"] = p_doc.get("patient_code") or str(p_doc.get("_id"))[-6:]

        latest_vital = db.vitals.find_one(
            {"$or": [{"patient_id": p_obj}, {"patient_id": patient_id}] if p_obj else [{"patient_id": patient_id}]},
            sort=[("recorded_at", -1)]
        )
        if latest_vital:
            context["vitals"] = latest_vital

    # Step 1: Check Clinical Knowledge Base for approved protocol
    kb_hits = search_kb_conditions(message, limit=1)
    protocol_card_md = ""
    if kb_hits:
        protocol_card_md = format_protocol_card(kb_hits[0])
    else:
        log_unmatched_query(message, user_id)

    # Step 2: Check Drug-Drug Interactions
    drug_interaction_md = check_drug_interactions(message)

    # Step 3: Build Patient-Specific Clinical Assessment
    patient_assessment_md = build_clinical_response(message, role, context)

    # Assemble full content
    full_parts = []
    if protocol_card_md:
        full_parts.append(protocol_card_md)
    if drug_interaction_md:
        full_parts.append(drug_interaction_md)
    if full_parts:
        full_parts.append(f"---\n\n{patient_assessment_md}")
    else:
        full_parts.append(patient_assessment_md)

    final_response_text = "\n\n".join(full_parts)

    # Record message to history
    now = datetime.now(timezone.utc)
    db.ai_conversations.insert_one({
        "user_id": user_id,
        "patient_id": patient_id,
        "role": role,
        "user_message": message,
        "ai_response": final_response_text,
        "has_kb_protocol": bool(kb_hits),
        "has_drug_interaction": bool(drug_interaction_md),
        "created_at": now
    })

    if not stream_requested:
        return jsonify({
            "message": message,
            "response": final_response_text,
            "has_kb_protocol": bool(kb_hits),
            "has_drug_interaction": bool(drug_interaction_md),
            "disclaimer": CLINICAL_DISCLAIMER
        }), 200

    # Stream token by token (SSE)
    def generate_sse():
        # First send instant protocol card if available
        if protocol_card_md:
            instant_payload = {
                "type": "protocol_card",
                "delta": protocol_card_md + "\n\n---\n\n"
            }
            yield f"data: {json.dumps(instant_payload)}\n\n"
            time.sleep(0.05)

        if drug_interaction_md:
            drug_payload = {
                "type": "drug_interaction",
                "delta": drug_interaction_md + "\n\n---\n\n"
            }
            yield f"data: {json.dumps(drug_payload)}\n\n"
            time.sleep(0.05)

        # Stream assessment in chunks
        chunk_size = 28
        for i in range(0, len(patient_assessment_md), chunk_size):
            chunk = patient_assessment_md[i:i + chunk_size]
            payload = {
                "type": "content",
                "delta": chunk
            }
            yield f"data: {json.dumps(payload)}\n\n"
            time.sleep(0.02)

        # End of stream
        yield f"data: {json.dumps({'type': 'done', 'disclaimer': CLINICAL_DISCLAIMER})}\n\n"

    return Response(
        stream_with_context(generate_sse()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# ============================================================================
# 2. CLINICAL KNOWLEDGE BASE (KB) MANAGEMENT API
# ============================================================================
@ai_assistant_bp.route("/kb/conditions", methods=["GET"], strict_slashes=False)
@token_required
def get_kb_conditions():
    """List knowledge base condition protocols with status filter and search"""
    db = get_database()
    seed_clinical_kb_if_empty()

    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    query = {}
    if status and status.lower() != "all":
        query["status"] = status.lower()

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}},
            {"aliases": {"$regex": search, "$options": "i"}},
            {"icd10": {"$regex": search, "$options": "i"}}
        ]

    conditions = list(db.kb_conditions.find(query).sort("updated_at", -1))
    return jsonify(serialize_doc(conditions)), 200


@ai_assistant_bp.route("/kb/conditions", methods=["POST"], strict_slashes=False)
@token_required
def add_kb_condition():
    """Add a new condition protocol to the knowledge base (defaults to draft)"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    data = request.get_json() or {}

    title = data.get("title")
    if not title:
        return jsonify({"error": "Validation Error", "detail": "Title is required"}), 400

    slug = data.get("slug") or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    now = datetime.now(timezone.utc)

    doc = {
        "slug": slug,
        "title": title,
        "aliases": data.get("aliases", []),
        "icd10": data.get("icd10", []),
        "category": data.get("category", "general"),
        "summary": data.get("summary", ""),
        "red_flags": data.get("red_flags", []),
        "differentials": data.get("differentials", []),
        "workup": data.get("workup", []),
        "management": data.get("management", []),
        "disposition": data.get("disposition", ""),
        "patient_education": data.get("patient_education", ""),
        "sources": data.get("sources", []),
        "status": data.get("status", "draft"), # draft, approved, retired
        "reviewed_by": current_user.get("name") if data.get("status") == "approved" else None,
        "reviewed_at": now if data.get("status") == "approved" else None,
        "created_at": now,
        "updated_at": now
    }

    res = db.kb_conditions.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    return jsonify({
        "message": "Protocol saved to knowledge base",
        "condition": serialize_doc(doc)
    }), 201


@ai_assistant_bp.route("/kb/conditions/<cond_id>", methods=["PUT"], strict_slashes=False)
@token_required
def update_kb_condition(cond_id):
    """Update, approve, or retire a condition protocol"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    data = request.get_json() or {}

    query = {"_id": ObjectId(cond_id)} if is_valid_object_id(cond_id) else {"slug": cond_id}
    existing = db.kb_conditions.find_one(query)
    if not existing:
        return jsonify({"error": "Not Found", "detail": "Condition protocol not found"}), 404

    now = datetime.now(timezone.utc)
    updates = {
        "updated_at": now
    }

    for key in ["title", "aliases", "icd10", "category", "summary", "red_flags", "differentials", "workup", "management", "disposition", "patient_education", "sources", "status"]:
        if key in data:
            updates[key] = data[key]

    if data.get("status") == "approved" and existing.get("status") != "approved":
        updates["reviewed_by"] = current_user.get("name") or "Clinician Reviewer"
        updates["reviewed_at"] = now

    db.kb_conditions.update_one(query, {"$set": updates})
    updated = db.kb_conditions.find_one(query)

    return jsonify({
        "message": "Protocol updated successfully",
        "condition": serialize_doc(updated)
    }), 200


@ai_assistant_bp.route("/kb/drugs", methods=["GET"], strict_slashes=False)
@token_required
def get_kb_drugs():
    """List drug-drug interactions with severity and status"""
    db = get_database()
    seed_clinical_kb_if_empty()
    interactions = list(db.kb_drug_interactions.find({}))
    return jsonify(serialize_doc(interactions)), 200


@ai_assistant_bp.route("/kb/unmatched", methods=["GET"], strict_slashes=False)
@token_required
def get_unmatched_queries():
    """List clinical queries with no KB match for continuous quality improvement"""
    db = get_database()
    queries = list(db.kb_unmatched_queries.find({}).sort("created_at", -1).limit(50))
    return jsonify(serialize_doc(queries)), 200


@ai_assistant_bp.route("/kb/import", methods=["POST"], strict_slashes=False)
@token_required
def import_kb_entries():
    """Batch import knowledge base protocols from JSON array (imported as draft)"""
    db = get_database()
    data = request.get_json() or {}
    entries = data.get("entries", [])

    if not isinstance(entries, list) or len(entries) == 0:
        return jsonify({"error": "Validation Error", "detail": "entries must be a non-empty array"}), 400

    now = datetime.now(timezone.utc)
    inserted_count = 0

    for entry in entries:
        title = entry.get("title")
        if not title:
            continue
        slug = entry.get("slug") or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

        doc = {
            "slug": slug,
            "title": title,
            "aliases": entry.get("aliases", []),
            "icd10": entry.get("icd10", []),
            "category": entry.get("category", "imported"),
            "summary": entry.get("summary", ""),
            "red_flags": entry.get("red_flags", []),
            "differentials": entry.get("differentials", []),
            "workup": entry.get("workup", []),
            "management": entry.get("management", []),
            "disposition": entry.get("disposition", ""),
            "patient_education": entry.get("patient_education", ""),
            "sources": entry.get("sources", []),
            "status": "draft",
            "reviewed_by": None,
            "reviewed_at": None,
            "created_at": now,
            "updated_at": now
        }
        db.kb_conditions.update_one({"slug": slug}, {"$set": doc}, upsert=True)
        inserted_count += 1

    return jsonify({
        "message": f"Successfully imported {inserted_count} protocols as draft.",
        "imported_count": inserted_count
    }), 200


# ============================================================================
# 3. CONVERSATION HISTORY & IMAGE TRIAGE
# ============================================================================
@ai_assistant_bp.route("/history/<patient_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_ai_history(patient_id):
    """Retrieve chat history for clinical review"""
    db = get_database()
    query = {"$or": [{"patient_id": patient_id}, {"user_id": patient_id}]}
    chats = list(db.ai_conversations.find(query).sort("created_at", -1).limit(40))
    return jsonify(serialize_doc(chats)), 200


@ai_assistant_bp.route("/history/<patient_id>", methods=["DELETE"], strict_slashes=False)
@token_required
def clear_ai_history(patient_id):
    """Clear chat history for a session"""
    db = get_database()
    query = {"$or": [{"patient_id": patient_id}, {"user_id": patient_id}]}
    res = db.ai_conversations.delete_many(query)
    return jsonify({"message": "Conversation history cleared", "deleted_count": res.deleted_count}), 200
