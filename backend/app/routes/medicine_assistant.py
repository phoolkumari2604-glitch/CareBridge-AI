"""
CareBridge AI - Medicine Assistant API Blueprint
Routes:
- POST /assistant/suggest & /api/assistant/suggest
- GET /medicine/search & /api/medicine/search?q=
- GET /medicine/<id>/interactions & /api/medicine/<id>/interactions?with=
- GET /sources-attribution & /api/sources-attribution
"""

import os
import json
from flask import Blueprint, request, jsonify
from app.services.medicine_service import (
    suggest_otc_medicines,
    search_medicines,
    check_drug_interactions,
    DISCLAIMER_TEXT,
    EMERGENCY_NUMBERS
)
from app.services.medicine_rag_service import handle_rag_assistant_query

medicine_assistant_bp = Blueprint("medicine_assistant", __name__)

SOURCES_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "sources.json"
)


# ============================================================================
# 1. OTC MEDICINE SUGGESTION ENDPOINT
# ============================================================================
@medicine_assistant_bp.route("/assistant/suggest", methods=["POST"], strict_slashes=False)
@medicine_assistant_bp.route("/api/assistant/suggest", methods=["POST"], strict_slashes=False)
def suggest_endpoint():
    """
    Suggests OTC medications based on symptoms, running through 5 safety filters:
    allergy filter -> interaction check -> contraindication check (age, pregnancy, conditions) -> CDSCO ban filter.
    """
    data = request.get_json(silent=True) or {}
    symptoms = data.get("symptoms", [])

    if not symptoms or not isinstance(symptoms, list):
        return jsonify({
            "error": "At least one symptom is required in the 'symptoms' array.",
            "suggestions": [],
            "disclaimer": DISCLAIMER_TEXT
        }), 400

    age = data.get("age")
    if age is not None:
        try:
            age = int(age)
        except (ValueError, TypeError):
            age = None

    gender = data.get("gender")
    pregnant = bool(data.get("pregnant", False))
    pregnancy_trimester = data.get("pregnancy_trimester")
    allergies = data.get("allergies", [])
    current_medicines = data.get("current_medicines", [])
    conditions = data.get("conditions", [])

    response_data = suggest_otc_medicines(
        symptoms=symptoms,
        age=age,
        gender=gender,
        pregnant=pregnant,
        pregnancy_trimester=pregnancy_trimester,
        allergies=allergies,
        current_medicines=current_medicines,
        conditions=conditions
    )

    return jsonify(response_data), 200


# ============================================================================
# 1B. CONVERSATIONAL RAG ASSISTANT ENDPOINT
# ============================================================================
@medicine_assistant_bp.route("/assistant/chat", methods=["POST"], strict_slashes=False)
@medicine_assistant_bp.route("/api/assistant/chat", methods=["POST"], strict_slashes=False)
def assistant_chat_endpoint():
    """
    Conversational RAG assistant endpoint:
    - Runs red-flag emergency detector on every message
    - Asks follow-up intake questions if clinical profile is incomplete
    - Rejects prescription drugs, antibiotics, steroids, and controlled substances
    - Retrieves grounded suggestions from medicines.db only
    - Prevents self-directed dosage recommendations for children under 12 & pregnant users
    """
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({
            "error": "A message is required.",
            "reply": "Please describe your symptoms so I can assist you safely.",
            "disclaimer": DISCLAIMER_TEXT
        }), 400

    intake = data.get("intake") or {}
    history = data.get("history") or []

    rag_response = handle_rag_assistant_query(
        message=message,
        intake=intake,
        history=history
    )

    return jsonify(rag_response), 200


# ============================================================================
# 2. MEDICINE SEARCH ENDPOINT
# ============================================================================
@medicine_assistant_bp.route("/medicine/search", methods=["GET"], strict_slashes=False)
@medicine_assistant_bp.route("/api/medicine/search", methods=["GET"], strict_slashes=False)
def search_endpoint():
    """Fuzzy search medicines by brand or generic name."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": [], "query": ""}), 200

    limit = request.args.get("limit", 20)
    try:
        limit = min(50, max(1, int(limit)))
    except (ValueError, TypeError):
        limit = 20

    results = search_medicines(query=query, limit=limit)
    return jsonify({
        "query": query,
        "count": len(results),
        "results": results,
        "disclaimer": DISCLAIMER_TEXT
    }), 200


# ============================================================================
# 3. DRUG INTERACTIONS CHECK ENDPOINT
# ============================================================================
@medicine_assistant_bp.route("/medicine/<path:med_id>/interactions", methods=["GET"], strict_slashes=False)
@medicine_assistant_bp.route("/api/medicine/<path:med_id>/interactions", methods=["GET"], strict_slashes=False)
def interactions_endpoint(med_id: str):
    """
    Checks drug-drug interactions for a given medicine against query parameter 'with'.
    Example: /medicine/Crocin%20650/interactions?with=Aspirin&with=Warfarin
    """
    with_items = request.args.getlist("with")
    if not with_items:
        # Also support comma-separated string: ?with=Aspirin,Warfarin
        raw_with = request.args.get("with", "")
        if raw_with:
            with_items = [x.strip() for x in raw_with.split(",") if x.strip()]

    result = check_drug_interactions(medicine_id_or_name=med_id, with_list=with_items)
    return jsonify({
        **result,
        "disclaimer": DISCLAIMER_TEXT
    }), 200


# ============================================================================
# 4. DATA SOURCES & ATTRIBUTION ENDPOINT
# ============================================================================
@medicine_assistant_bp.route("/data-sources", methods=["GET"], strict_slashes=False)
@medicine_assistant_bp.route("/api/data-sources", methods=["GET"], strict_slashes=False)
@medicine_assistant_bp.route("/api/sources-attribution", methods=["GET"], strict_slashes=False)
def data_sources_endpoint():
    """Returns dataset registry, licensing terms, approval status and attribution notices."""
    if not os.path.exists(SOURCES_JSON_PATH):
        # Fallback to local data dir
        alt_path = os.path.join(os.getcwd(), "data", "sources.json")
        path_to_use = alt_path if os.path.exists(alt_path) else SOURCES_JSON_PATH
    else:
        path_to_use = SOURCES_JSON_PATH

    try:
        with open(path_to_use, "r", encoding="utf-8") as f:
            sources_data = json.load(f)
        # Normalize approval_status and status
        normalized_sources = [
            {**s, "status": s.get("approval_status", s.get("status", "APPROVED"))}
            for s in sources_data
        ]
        return jsonify({
            "project": "CareBridge AI (Educational, Non-Commercial Student Project)",
            "total_datasets": len(normalized_sources),
            "sources": normalized_sources,
            "disclaimer": "All pharmaceutical insights are for educational and clinical decision-support evaluation only."
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to load sources registry: {str(e)}"}), 500
