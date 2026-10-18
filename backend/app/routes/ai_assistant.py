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
from app.services.safety_layers import (
    evaluate_safety_pipeline,
    apply_output_filter,
    EMERGENCY_FIXED_RESPONSE,
    CRISIS_FIXED_RESPONSE
)
from app.services.conversation_manager import (
    detect_language,
    LOCALIZED_PROMPTS,
    SymptomCheckerStateMachine,
    SessionMemory,
    LANG_EN
)
from app.services.clinical_kb import (
    load_knowledge_base,
    search_health_knowledge,
    lookup_glossary,
    format_glossary_card,
    format_role_response,
    evaluate_vitals_safety,
    check_drug_interactions,
    log_unmatched_query,
    format_protocol_card,
    search_kb_conditions,
    seed_clinical_kb_if_empty,
    _KB_ENTRIES
)

ai_assistant_bp = Blueprint("ai_assistant", __name__)

CLINICAL_DISCLAIMER = (
    "CareBridge AI provides educational health insights and clinical decision support based on accredited guidelines. "
    "It is not a substitute for formal physical examination, bedside diagnostics, or emergency care."
)


# ============================================================================
# 1. CORE AI CHAT & STREAMING ENDPOINT (/chat, /chat/stream)
# ============================================================================
@ai_assistant_bp.route("/chat", methods=["POST"], strict_slashes=False)
@ai_assistant_bp.route("/chat/stream", methods=["POST", "GET"], strict_slashes=False)
@token_required
def clinical_ai_chat():
    """
    CareBridge Clinical AI Assistant Chat & SSE Stream Endpoint
    1. Safety Layers 1-4 (Emergency, Crisis, Prompt-injection, Controlled Drugs)
    2. Vision Guard (Layer 5: Non-diagnostic observation)
    3. Abnormal Vitals Safety Check with simulated vs real distinction
    4. Symptom-checker ladder for vague queries (max 5 questions)
    5. Role-based structured answer (Patient, Doctor, Staff)
    6. Multilingual support across EN, HI, Hinglish, TE, TA
    7. Ambiguity detection with clarification pills
    """
    db = get_database()
    load_knowledge_base()

    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "PATIENT").upper()
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    user_name = current_user.get("name") or "User"

    if request.method == "GET":
        message = request.args.get("message", "").strip()
        patient_id = request.args.get("patient_id")
        stream_requested = True
        attachments = []
        is_simulated = request.args.get("simulated", "false").lower() == "true"
        session_id = request.args.get("session_id") or user_id
    else:
        data = request.get_json() or {}
        message = data.get("message", "").strip()
        patient_id = data.get("patient_id")
        stream_requested = data.get("stream", True)
        attachments = data.get("attachments") or []
        is_simulated = data.get("is_simulated", False)
        session_id = data.get("session_id") or user_id

    if not message:
        return jsonify({"error": "Validation Error", "detail": "Message is required"}), 400

    # ------------------------------------------------------------------------
    # STEP 1: SAFETY PIPELINE EVALUATION (Layers 1-3)
    # ------------------------------------------------------------------------
    safety = evaluate_safety_pipeline(
        message=message,
        role=role,
        has_attachments=bool(attachments)
    )

    if safety["blocked"]:
        blocked_text = safety["response"]
        now = datetime.now(timezone.utc)
        db.ai_conversations.insert_one({
            "user_id": user_id,
            "patient_id": patient_id,
            "role": role,
            "user_message": message,
            "ai_response": blocked_text,
            "layer_triggered": safety["layer_triggered"],
            "is_emergency": safety["is_emergency"],
            "is_crisis": safety["is_crisis"],
            "created_at": now
        })

        if not stream_requested:
            return jsonify({
                "message": message,
                "response": blocked_text,
                "is_emergency": safety["is_emergency"],
                "is_crisis": safety["is_crisis"],
                "blocked": True,
                "layer_triggered": safety["layer_triggered"],
                "disclaimer": CLINICAL_DISCLAIMER
            }), 200

        def stream_blocked():
            yield f"data: {json.dumps({'type': 'content', 'delta': blocked_text, 'is_emergency': safety['is_emergency'], 'is_crisis': safety['is_crisis']})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'disclaimer': CLINICAL_DISCLAIMER})}\n\n"

        return Response(stream_with_context(stream_blocked()), mimetype="text/event-stream")

    # ------------------------------------------------------------------------
    # STEP 2: CONTEXT & VITALS BUILDING
    # ------------------------------------------------------------------------
    context = {
        "patient_name": user_name,
        "role": role,
        "age": 45,
        "gender": "Unspecified",
        "blood_group": "O+",
        "vitals": {},
        "is_simulated": is_simulated
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

        latest_vital = db.vital_signs.find_one(
            {"$or": [{"patient_id": p_obj}, {"patient_id": patient_id}] if p_obj else [{"patient_id": patient_id}]},
            sort=[("recorded_at", -1)]
        )
        if latest_vital:
            context["vitals"] = latest_vital
            context["is_simulated"] = False
    elif not context["vitals"] and data.get("vitals") if request.method != "GET" else None:
        context["vitals"] = data.get("vitals")
        context["is_simulated"] = is_simulated

    # Evaluate Vitals Safety Alert
    vitals_alert_md = evaluate_vitals_safety(context["vitals"], is_simulated=context.get("is_simulated", False))

    # ------------------------------------------------------------------------
    # STEP 3: ATTACHMENTS (IMAGE / LAB REPORT GUARD - Layer 5)
    # ------------------------------------------------------------------------
    attachment_analysis_md = ""
    if attachments:
        obs_banner = "> ⚠️ **AI Observation Only, Not a Diagnosis**: *The following analysis is an automated observational report intended to assist medical discussions with your physician. It does not constitute a definitive medical diagnosis.*\n\n"
        attachment_analysis_md = obs_banner + analyze_medical_images(attachments, message, context)

    # ------------------------------------------------------------------------
    # STEP 4: SYMPTOM CHECKER STATE MACHINE (VAGUE SYMPTOMS)
    # ------------------------------------------------------------------------
    is_vague = SymptomCheckerStateMachine.is_vague_query(message)
    current_step = SessionMemory.get_step_count(session_id)
    symptom_next_step = None
    clarification_options = []

    final_response_text = ""

    if is_vague and current_step < 5:
        detected_lang = detect_language(message)
        q_info = SymptomCheckerStateMachine.get_next_question(current_step, lang=detected_lang)
        if q_info:
            symptom_next_step, q_text = q_info
            final_response_text = q_text

    # ------------------------------------------------------------------------
    # STEP 5: CLINICAL KNOWLEDGE BASE SEARCH & RETRIEVAL
    # ------------------------------------------------------------------------
    kb_entry = None
    if not final_response_text:
        search_res = search_health_knowledge(message, role=role)
        detected_lang = search_res.get("lang", LANG_EN)

        # A. Glossary Match
        if search_res.get("glossary"):
            final_response_text = format_glossary_card(search_res["glossary"], lang=detected_lang)

        # B. Ambiguity Handling
        elif search_res.get("ambiguous") and search_res.get("options"):
            clarification_options = search_res.get("options", [])
            prompts = LOCALIZED_PROMPTS.get(detected_lang, LOCALIZED_PROMPTS[LANG_EN])
            intro = prompts.get("ambiguity_intro", "Did you mean one of these specific health topics?")
            options_text = "\n".join([f"- **{opt['topic']}**" for opt in clarification_options])
            final_response_text = f"### ❓ Clarification Needed\n{intro}\n\n{options_text}\n\n*Please select one of the topics below or clarify your question.*"

        # C. Best Direct Match in KB
        elif search_res.get("entry"):
            kb_entry = search_res["entry"]
            final_response_text = format_role_response(kb_entry, role=role, lang=detected_lang)

        # D. Drug-Drug Interaction Check
        else:
            drug_interaction_md = check_drug_interactions(message)
            if drug_interaction_md:
                final_response_text = drug_interaction_md
            else:
                log_unmatched_query(message, user_id)
                # Fallback role-appropriate message
                if role in ("DOCTOR", "CLINICIAN"):
                    final_response_text = f"""### 🩺 Clinical Decision Support Query: *"{message}"*
> ⚠️ **Peer-Review Queue Notice**: No direct protocol match found in the local knowledge base.

#### 1. 📋 General Clinical Approach
Perform focused clinical history, symptom onset timeline, and physical examination.

#### 2. 🔬 Recommended General Diagnostics
CBC, basic metabolic panel, and diagnostic investigations tailored to organ system.

#### 3. 💊 Evidence-Based Management
Provide supportive care and symptomatic relief pending confirmed diagnosis."""
                else:
                    final_response_text = f"""### 🩺 Guidance for: *"{message}"*
1. **Rest & Hydration**: Drink plenty of clear liquids and rest comfortably in a cool room.
2. **Monitor Symptoms**: Keep track of any changes in temperature or worsening discomfort.
3. **When to See a Doctor**: Consult a healthcare provider if symptoms persist for more than 48 hours or if severe pain, difficulty breathing, or dizziness develops.

> *CareBridge Health Education Guidance*"""

    # ------------------------------------------------------------------------
    # STEP 6: ASSEMBLE FINAL RESPONSE (VITALS ALERT + VISION + RESPONSE)
    # ------------------------------------------------------------------------
    full_parts = []
    if vitals_alert_md:
        full_parts.append(vitals_alert_md)
    if attachment_analysis_md:
        full_parts.append(attachment_analysis_md)
    if final_response_text:
        full_parts.append(final_response_text)

    assembled_output = "\n\n".join(full_parts)

    # Record to session memory
    SessionMemory.add_turn(
        session_id=session_id,
        user_msg=message,
        ai_msg=assembled_output,
        metadata={"symptom_checker_step": symptom_next_step}
    )

    # Record to database
    now = datetime.now(timezone.utc)
    db.ai_conversations.insert_one({
        "user_id": user_id,
        "patient_id": patient_id,
        "session_id": session_id,
        "role": role,
        "user_message": message,
        "attachments": attachments,
        "ai_response": assembled_output,
        "has_kb_entry": bool(kb_entry),
        "entry_id": kb_entry.get("id") if kb_entry else None,
        "clarification_options": clarification_options,
        "symptom_checker_step": symptom_next_step,
        "has_vitals_alert": bool(vitals_alert_md),
        "created_at": now
    })

    # Return Non-streaming JSON
    if not stream_requested:
        return jsonify({
            "message": message,
            "response": assembled_output,
            "has_kb_entry": bool(kb_entry),
            "entry_id": kb_entry.get("id") if kb_entry else None,
            "clarification_options": clarification_options,
            "symptom_checker_step": symptom_next_step,
            "has_vitals_alert": bool(vitals_alert_md),
            "disclaimer": CLINICAL_DISCLAIMER
        }), 200

    # Stream SSE Token-by-Token
    def generate_sse():
        # First send clarification options if any
        if clarification_options:
            yield f"data: {json.dumps({'type': 'clarifications', 'options': clarification_options})}\n\n"

        chunk_size = 32
        for i in range(0, len(assembled_output), chunk_size):
            chunk = assembled_output[i:i + chunk_size]
            yield f"data: {json.dumps({'type': 'content', 'delta': chunk})}\n\n"
            time.sleep(0.015)

        yield f"data: {json.dumps({'type': 'done', 'clarification_options': clarification_options, 'disclaimer': CLINICAL_DISCLAIMER})}\n\n"

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
# 2. FEEDBACK & REPORTING API (/feedback)
# ============================================================================
@ai_assistant_bp.route("/feedback", methods=["POST"], strict_slashes=False)
@token_required
def submit_ai_feedback():
    """Submit user rating (thumbs up/down) or report wrong answer"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    data = request.get_json() or {}

    entry_id = data.get("entry_id")
    question = data.get("question")
    rating = data.get("rating")  # 1 for thumbs up, -1 for thumbs down
    report_wrong = data.get("report_wrong", False)
    comments = data.get("comments", "").strip()

    now = datetime.now(timezone.utc)
    feedback_doc = {
        "user_id": str(current_user.get("_id") or current_user.get("id") or ""),
        "user_name": current_user.get("name", "Anonymous"),
        "role": (current_user.get("role") or "PATIENT").upper(),
        "entry_id": entry_id,
        "question": question,
        "rating": rating,
        "report_wrong": report_wrong,
        "comments": comments,
        "created_at": now
    }
    db.ai_feedback.insert_one(feedback_doc)

    return jsonify({
        "message": "Feedback submitted successfully. Thank you for helping improve CareBridge clinical accuracy.",
        "id": str(feedback_doc.get("_id"))
    }), 201


# ============================================================================
# 3. CLINICAL REVIEW QUEUE & APPROVAL API (/review-queue, /entry/approve, /entry/edit)
# ============================================================================
@ai_assistant_bp.route("/review-queue", methods=["GET"], strict_slashes=False)
@token_required
def get_review_queue():
    """Retrieve all draft entries awaiting clinician peer review"""
    load_knowledge_base()
    current_user = getattr(g, "current_user", None) or {}
    category = request.args.get("category")

    drafts = []
    for entry in _KB_ENTRIES:
        if entry.get("review_status") == "draft":
            if not category or entry.get("category") == category:
                drafts.append(entry)

    return jsonify({
        "total_drafts": len(drafts),
        "queue": drafts
    }), 200


@ai_assistant_bp.route("/entry/approve", methods=["POST"], strict_slashes=False)
@token_required
def approve_kb_entry():
    """Approve a draft knowledge base entry (Doctor / Admin only)"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "").upper()

    if role not in ("DOCTOR", "ADMIN", "CLINICIAN"):
        return jsonify({"error": "Forbidden", "detail": "Only registered doctors or admins can approve clinical entries."}), 403

    data = request.get_json() or {}
    entry_id = data.get("entry_id")
    if not entry_id:
        return jsonify({"error": "Validation Error", "detail": "entry_id is required"}), 400

    now = datetime.now(timezone.utc)
    doctor_name = current_user.get("name") or "Medical Officer"

    # Update in memory
    matched = None
    for entry in _KB_ENTRIES:
        if entry.get("id") == entry_id:
            entry["review_status"] = "approved"
            entry["reviewed_by"] = doctor_name
            entry["reviewed_at"] = now.isoformat()
            matched = entry
            break

    # Persist in DB / audit
    db.kb_entry_approvals.insert_one({
        "entry_id": entry_id,
        "approved_by": doctor_name,
        "user_id": str(current_user.get("_id") or current_user.get("id") or ""),
        "approved_at": now
    })

    return jsonify({
        "message": f"Entry {entry_id} approved by {doctor_name}.",
        "entry": matched
    }), 200


@ai_assistant_bp.route("/entry/edit", methods=["POST"], strict_slashes=False)
@token_required
def edit_kb_entry():
    """Edit knowledge base entry with automated version history tracking"""
    db = get_database()
    current_user = getattr(g, "current_user", None) or {}
    role = (current_user.get("role") or "").upper()

    if role not in ("DOCTOR", "ADMIN", "CLINICIAN"):
        return jsonify({"error": "Forbidden", "detail": "Only registered clinicians or admins can edit clinical entries."}), 403

    data = request.get_json() or {}
    entry_id = data.get("entry_id")
    updates = data.get("updates") or {}

    if not entry_id or not updates:
        return jsonify({"error": "Validation Error", "detail": "entry_id and updates are required"}), 400

    now = datetime.now(timezone.utc)
    doctor_name = current_user.get("name") or "Clinician"

    matched = None
    for entry in _KB_ENTRIES:
        if entry.get("id") == entry_id:
            # Save version history
            if "version_history" not in entry:
                entry["version_history"] = []
            
            entry["version_history"].append({
                "patient_answer": entry.get("patient_answer"),
                "doctor_answer": entry.get("doctor_answer"),
                "edited_by": doctor_name,
                "edited_at": now.isoformat()
            })

            # Apply permitted updates
            for k, v in updates.items():
                if k not in ("id", "version_history"):
                    entry[k] = v

            entry["updated_at"] = now.isoformat()
            matched = entry
            break

    if not matched:
        return jsonify({"error": "Not Found", "detail": "Entry not found"}), 404

    return jsonify({
        "message": f"Entry {entry_id} updated successfully.",
        "entry": matched
    }), 200


@ai_assistant_bp.route("/session/clear", methods=["POST", "DELETE"], strict_slashes=False)
@token_required
def clear_session_memory():
    """Clear conversational session memory (trash icon action)"""
    current_user = getattr(g, "current_user", None) or {}
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id") or request.args.get("session_id") or user_id

    SessionMemory.clear_session(session_id)
    return jsonify({
        "message": "Session memory cleared successfully.",
        "session_id": session_id
    }), 200


# ============================================================================
# 4. BACKWARDS-COMPATIBLE KB & HISTORY ROUTES
# ============================================================================
@ai_assistant_bp.route("/kb/conditions", methods=["GET"], strict_slashes=False)
@token_required
def get_kb_conditions():
    """List knowledge base condition protocols"""
    db = get_database()
    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    load_knowledge_base()
    results = []
    for e in _KB_ENTRIES:
        if status and status.lower() != "all" and e.get("review_status") != status.lower():
            continue
        if search:
            q = search.lower()
            if q not in e.get("topic", "").lower() and not any(q in k.lower() for k in e.get("keywords", [])):
                continue
        results.append(e)

    return jsonify(results), 200


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
    SessionMemory.clear_session(patient_id)
    return jsonify({"message": "Conversation history cleared", "deleted_count": res.deleted_count}), 200
