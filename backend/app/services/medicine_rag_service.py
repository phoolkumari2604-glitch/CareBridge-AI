"""
CareBridge AI - Medicine Assistant RAG & Clinical Guardrails Engine
Features:
1. Strict Red-Flag Triage on every message (India emergency 112 / 108 / 14416)
2. Interactive intake follow-up collector (age, pregnancy, allergies, current medicines, conditions)
3. Database retrieval grounding (answers ONLY from medicines.db)
4. Prescription, Antibiotic, Steroid, and Scheduled Narcotics Refusal
5. Zero dosage for children under 12 and pregnant users (refer to pediatrician / obstetrician)
6. Non-prescriptive information phrasing ("commonly used for...")
7. Full dataset attribution and persistent medical disclaimer
"""

import re
from typing import Dict, Any, List, Optional
from app.services.medicine_service import (
    suggest_otc_medicines,
    check_red_flag_symptoms,
    DISCLAIMER_TEXT,
    EMERGENCY_NUMBERS
)

# Extended red flags including chronic / worsening duration
PERSISTING_SYMPTOMS_PATTERN = re.compile(
    r"\b(worsening|getting\s+worse|lasting\s+(more\s+than|over)\s+(a\s+few|[2-9]|\d+)\s+days|"
    r"lasting\s+(for\s+)?weeks|for\s+(a\s+few|[2-9]|\d+)\s+weeks|unbearable|severe\s+deteriorat)\b",
    re.IGNORECASE
)

# Blocked prescription drug categories
PRESCRIPTION_TERMS = {
    "antibiotic": ["antibiotic", "antibiotics", "amoxicillin", "azithromycin", "ciprofloxacin", "augmentin",
                   "cefixime", "doxycycline", "metronidazole", "ofloxacin", "levofloxacin"],
    "steroid": ["steroid", "steroids", "prednisolone", "dexamethasone", "betamethasone", "hydrocortisone", "deflazacort"],
    "controlled_narcotic": ["sleeping pill", "sleeping pills", "diazepam", "alprazolam", "clonazepam", "tramadol",
                           "codeine", "morphine", "lorazepam", "zolpidem", "sedative", "sedatives"]
}


def evaluate_red_flags_and_worsening(message: str) -> Optional[Dict[str, Any]]:
    """Checks message for acute red-flag emergencies and chronic worsening symptoms."""
    # 1. Base red-flag detector
    base_eval = check_red_flag_symptoms([message])
    if base_eval and base_eval.get("is_emergency"):
        return base_eval

    # 2. Symptoms lasting more than a few days or worsening
    if PERSISTING_SYMPTOMS_PATTERN.search(message):
        return {
            "is_emergency": True,
            "red_flag_triggered": True,
            "matched_symptom": "worsening / persistent symptoms",
            "alert_message": (
                "Symptoms lasting more than a few days, worsening over time, or failing to respond to rest "
                "require professional in-person medical evaluation to rule out secondary bacterial infections, "
                "underlying pathology, or complications."
            ),
            "emergency_alert": (
                "MEDICAL ADVISORY: Symptoms lasting several days or worsening require physician evaluation. "
                "If experiencing acute distress, call 112 / 108 immediately."
            ),
            "emergency_contacts": EMERGENCY_NUMBERS,
            "suggestions": [],
            "excluded_medicines": [],
            "filtered_out": [],
            "disclaimer": "Do not rely on OTC self-medication for persistent or worsening symptoms. Please visit a clinic or hospital."
        }

    return None


def detect_prescription_requests(message: str) -> Optional[str]:
    """Detects requests for antibiotics, steroids, or controlled narcotics and returns a refusal message."""
    msg_lower = message.lower()
    for cat, terms in PRESCRIPTION_TERMS.items():
        for term in terms:
            if re.search(rf"\b{re.escape(term)}\b", msg_lower):
                if cat == "antibiotic":
                    return (
                        f"I cannot suggest or recommend antibiotics (such as '{term}'). Under Indian pharmaceutical law "
                        "(Schedule H/H1 of the Drugs and Cosmetics Rules), antibiotics are strictly prescription-only "
                        "and must never be taken without a confirmed bacterial diagnosis and doctor's prescription. "
                        "Indiscriminate antibiotic use contributes to antimicrobial resistance and offers no benefit for viral infections."
                    )
                elif cat == "steroid":
                    return (
                        f"I cannot suggest or recommend corticosteroids (such as '{term}'). Steroids are potent "
                        "prescription-only drugs that can cause severe endocrine, metabolic, and immunosuppressive "
                        "adverse effects. Please consult a qualified doctor for clinical assessment."
                    )
                elif cat == "controlled_narcotic":
                    return (
                        f"I cannot suggest or discuss habit-forming sedatives or scheduled narcotics (such as '{term}'). "
                        "These medications are strictly Schedule X/H controlled substances. Please consult a psychiatrist "
                        "or primary care physician for safe evaluation."
                    )
    return None


def extract_symptoms_from_text(message: str) -> List[str]:
    """Extracts known symptom keywords from user message."""
    msg_lower = message.lower()
    found_symptoms = []

    symptom_keywords = [
        ("fever", ["fever", "fevers", "temperature", "chills", "pyrexia", "feeling hot"]),
        ("headache", ["headache", "headaches", "head ache", "head aches", "head pain", "migraine", "cephalea"]),
        ("body_ache", ["body pain", "body ache", "body aches", "muscle pain", "muscle aches", "joint pain", "joint aches", "myalgia", "bodyaches"]),
        ("runny_nose", ["runny nose", "cold", "rhinorrhea", "watery nose"]),
        ("sneezing", ["sneezing", "sneeze"]),
        ("nasal_congestion", ["blocked nose", "stuffy nose", "nasal congestion"]),
        ("dry_cough", ["dry cough", "tickly cough", "cough without phlegm"]),
        ("wet_cough", ["wet cough", "chesty cough", "cough with phlegm", "mucus cough", "productive cough"]),
        ("sore_throat", ["sore throat", "throat pain", "throat irritation", "painful swallowing"]),
        ("heartburn", ["heartburn", "acid reflux", "acidity", "indigestion", "gerd", "gas in stomach"]),
        ("loose_motion", ["loose motion", "loose motions", "diarrhea", "diarrhoea", "watery stools", "watery motions"]),
        ("mild_dehydration", ["dehydration", "dry mouth", "extreme thirst"]),
        ("minor_cut", ["minor cut", "scratch", "abrasion", "scrape"]),
        ("skin_rash_itchy", ["athlete's foot", "athlete foot", "fungal itch", "ringworm", "itchy toes"])
    ]

    for sym_id, patterns in symptom_keywords:
        for p in patterns:
            if re.search(rf"\b{re.escape(p)}\b", msg_lower):
                found_symptoms.append(sym_id)
                break

    return list(dict.fromkeys(found_symptoms))


def handle_rag_assistant_query(
    message: str,
    intake: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Main RAG pipeline entrypoint:
    1. Red-flag triage (every message)
    2. Prescription / antibiotic refusal
    3. Direct pediatric & pregnancy dosage guardrail
    4. Clinical intake completeness check
    5. Database query and grounded OTC suggestion synthesis
    """
    intake = intake or {}
    message_clean = (message or "").strip()

    # 1. RED-FLAG CHECK
    red_flag = evaluate_red_flags_and_worsening(message_clean)
    if red_flag:
        return {
            "status": "emergency",
            "red_flag_triggered": True,
            "reply": (
                f"{red_flag['emergency_alert']}\n\n"
                f"Matched Red Flag: {red_flag.get('matched_symptom')}\n"
                f"Emergency Helpline Numbers in India:\n"
                f"- National Emergency: 112\n"
                f"- National Ambulance: 108\n"
                f"- Mental Health Crisis (Tele-MANAS): 14416 / 1800-891-4416\n\n"
                f"Please do not attempt self-medication. Seek immediate professional healthcare."
            ),
            "emergency_contacts": red_flag.get("emergency_contacts", EMERGENCY_NUMBERS),
            "suggestions": [],
            "sources": [],
            "disclaimer": red_flag.get("disclaimer", DISCLAIMER_TEXT)
        }

    # 2. PRESCRIPTION / ANTIBIOTICS REFUSAL
    rx_refusal = detect_prescription_requests(message_clean)
    if rx_refusal:
        return {
            "status": "refusal",
            "red_flag_triggered": False,
            "reply": f"{rx_refusal}\n\nPlease consult a licensed medical practitioner for prescription medication.",
            "suggestions": [],
            "sources": ["CDSCO Drugs and Cosmetics Act (Schedule H/H1)", "WHO Guidelines on Antimicrobial Stewardship"],
            "disclaimer": DISCLAIMER_TEXT
        }

    # 2B. DIRECT PEDIATRIC & PREGNANCY DOSAGE GUARDRAIL
    is_asking_dosage = bool(re.search(r"\b(dose|dosage|how\s+much|how\s+many|mg|ml|quantity)\b", message_clean, re.IGNORECASE))
    age_val = intake.get("age")
    is_ped_age = (age_val is not None and age_val < 12) or bool(re.search(r"\b(child|infant|baby|toddler|kid|[0-9]\s*year[- ]old|[0-9]+\s*month[- ]old)\b", message_clean, re.IGNORECASE))
    is_preg = bool(intake.get("pregnant")) or bool(re.search(r"\b(pregnant|pregnancy|trimester|nursing|breastfeeding)\b", message_clean, re.IGNORECASE))

    if is_asking_dosage and is_ped_age:
        ped_msg = (
            "STRICT PEDIATRIC DOSAGE GUARDRAIL: No dosage calculations are provided for children under 12 or infants. "
            "Pediatric drug doses require exact weight-based clinical calculations (mg/kg/dose) by a licensed pediatrician. "
            "Never give adult medications or aspirin to children due to risks of organ toxicity and Reye's syndrome. "
            "Please consult a pediatrician for exact pediatric dosing."
        )
        return {
            "status": "pediatric_dosage_refusal",
            "red_flag_triggered": False,
            "reply": ped_msg,
            "pediatric_notice": ped_msg,
            "suggestions": [],
            "sources": ["WHO Model Formulary for Children", "Indian Academy of Pediatrics (IAP) Guidelines"],
            "disclaimer": DISCLAIMER_TEXT
        }

    if is_asking_dosage and is_preg:
        preg_msg = (
            "STRICT PREGNANCY DOSAGE GUARDRAIL: No dosage recommendations are provided for pregnant or nursing individuals. "
            "Medications (especially NSAIDs like ibuprofen) can cross the placenta and affect fetal organogenesis and circulation. "
            "Please consult your obstetrician for safe clinical guidance."
        )
        return {
            "status": "pregnancy_dosage_refusal",
            "red_flag_triggered": False,
            "reply": preg_msg,
            "pregnancy_notice": preg_msg,
            "suggestions": [],
            "sources": ["FDA Pregnancy Categories & PLLR", "CDSCO Guidelines"],
            "disclaimer": DISCLAIMER_TEXT
        }

    # 3. EXTRACT SYMPTOMS
    symptoms = extract_symptoms_from_text(message_clean)
    if not symptoms:
        # Check if user mentioned raw symptom in intake
        symptoms = intake.get("symptoms", [])

    if not symptoms:
        return {
            "status": "clarification",
            "red_flag_triggered": False,
            "reply": (
                "I don't have enough specific symptom information. Could you please describe what discomfort or "
                "symptoms you are experiencing (e.g., mild fever, headache, dry cough, acidity, or nasal congestion)?"
            ),
            "follow_up_needed": True,
            "follow_up_questions": ["What symptoms are you experiencing?", "How long have they lasted?"],
            "suggestions": [],
            "sources": [],
            "disclaimer": DISCLAIMER_TEXT
        }

    # 4. INTAKE COMPLETENESS CHECK
    # Required clinical safety fields: age, pregnant, allergies, current_medicines, conditions
    age = intake.get("age")
    pregnant = bool(intake.get("pregnant", False))
    allergies = intake.get("allergies", [])
    current_medicines = intake.get("current_medicines", [])
    conditions = intake.get("conditions", [])

    # If age is completely missing and not answered
    if age is None:
        return {
            "status": "intake_needed",
            "red_flag_triggered": False,
            "reply": (
                "Before I can safely check verified OTC remedies from the medical database, please provide a few quick clinical details:\n"
                "1. What is your age (or the patient's age)?\n"
                "2. Are you pregnant or nursing?\n"
                "3. Do you have any known drug allergies (e.g. paracetamol, ibuprofen)?\n"
                "4. Are you taking any other medications or herbal supplements right now?\n"
                "5. Do you have any chronic conditions (e.g. liver, kidney, or peptic ulcer disease)?"
            ),
            "follow_up_needed": True,
            "follow_up_questions": [
                "Age of patient",
                "Pregnancy status",
                "Drug allergies",
                "Current medications",
                "Existing conditions"
            ],
            "extracted_symptoms": symptoms,
            "suggestions": [],
            "sources": [],
            "disclaimer": DISCLAIMER_TEXT
        }

    # 5. PEDIATRIC (<12) & PREGNANCY DOSAGE GUARDRAIL
    is_pediatric = isinstance(age, (int, float)) and age < 12
    pediatric_notice = None
    if is_pediatric:
        pediatric_notice = (
            f"IMPORTANT: The patient is {age} years old (under 12). By clinical safety protocols, "
            "no specific dosage is provided here. Children require exact weight-based pediatric dosing "
            "(mg/kg) calculated by a licensed pediatrician. Never give adult medications or aspirin to children."
        )

    pregnancy_notice = None
    if pregnant:
        pregnancy_notice = (
            "IMPORTANT: Patient is pregnant. Many common over-the-counter medications (especially NSAIDs like ibuprofen) "
            "carry risks to fetal development and kidney function. You must speak with your obstetrician before taking any medication."
        )

    # 6. DATABASE RETRIEVAL (STRICT GROUNDING)
    db_results = suggest_otc_medicines(
        symptoms=symptoms,
        age=age,
        gender=intake.get("gender"),
        pregnant=pregnant,
        pregnancy_trimester=intake.get("pregnancy_trimester"),
        allergies=allergies,
        current_medicines=current_medicines,
        conditions=conditions
    )

    if db_results.get("is_emergency"):
        return {
            "status": "emergency",
            "red_flag_triggered": True,
            "reply": f"{db_results['emergency_alert']}\n\nPlease seek urgent emergency medical attention (Call 112 / 108).",
            "emergency_contacts": db_results.get("emergency_contacts", EMERGENCY_NUMBERS),
            "suggestions": [],
            "sources": [],
            "disclaimer": db_results.get("disclaimer", DISCLAIMER_TEXT)
        }

    suggestions = db_results.get("suggestions", [])
    excluded = db_results.get("excluded_medicines", [])

    # If no approved items in database: Grounded Refusal
    if not suggestions:
        reply_lines = [
            "I don't have enough verified information in the pharmaceutical database to suggest a safe OTC remedy for this combination of symptoms and health profile."
        ]
        if excluded:
            reply_lines.append("\nMedications were safety-checked and excluded for your protection:")
            for ex in excluded:
                reply_lines.append(f"- {ex['generic_name']}: {ex['reason']}")
        reply_lines.append("\nPlease consult a qualified physician or licensed pharmacist for proper medical evaluation.")

        return {
            "status": "no_suggestions",
            "red_flag_triggered": False,
            "reply": "\n".join(reply_lines),
            "suggestions": [],
            "excluded_medicines": excluded,
            "sources": ["A-Z Medicine Dataset of India", "NLEM 2022", "DDInter"],
            "disclaimer": DISCLAIMER_TEXT
        }

    # 7. SYNTHESIZE GROUNDED INFORMATIONAL RESPONSE
    lines = []
    lines.append("Based on verified clinical records and Indian pharmaceutical datasets, here are common OTC first-line options:\n")

    if pediatric_notice:
        lines.append(f"> **Pediatric Warning**: {pediatric_notice}\n")
    if pregnancy_notice:
        lines.append(f"> **Pregnancy Advisory**: {pregnancy_notice}\n")

    for idx, s in enumerate(suggestions, start=1):
        lines.append(f"### {idx}. {s['generic_name']} ({s.get('drug_class', 'First-line Agent')})")
        lines.append(f"- **Commonly Used For**: {s['commonly_used_for']}")
        
        # Brands
        brands = s.get("common_brands", [])
        if brands:
            brand_names = [f"{b['brand_name']} (MRP ~Rs {b['price_inr']})" for b in brands[:2]]
            lines.append(f"- **Common Indian Brands**: {', '.join(brand_names)}")
        
        # Warnings
        warnings = s.get("warnings", [])
        if warnings:
            lines.append(f"- **Important Warnings**: {'; '.join(warnings[:2])}")
            
        # Side Effects
        side_effects = s.get("side_effects", [])
        if side_effects:
            se_text = ", ".join([f"{se['effect']} ({se['frequency'].lower()})" for se in side_effects[:3]])
            lines.append(f"- **Reported Side Effects**: {se_text}")

        # Interactions
        interactions = s.get("interactions_caution") or s.get("interactions") or []
        if interactions:
            lines.append(f"- **Interaction Cautions**: {interactions[0]}")
            
        lines.append(f"- **Source**: {s.get('source_and_attribution', 'A-Z Medicine Dataset of India, NLEM 2022, openFDA')}\n")

    if excluded:
        lines.append("\n**Safety Filters Applied (Excluded Options)**:")
        for ex in excluded:
            lines.append(f"- *{ex['generic_name']}* was removed: {ex['reason']}")

    lines.append(f"\n*{DISCLAIMER_TEXT}*")

    return {
        "status": "success",
        "red_flag_triggered": False,
        "reply": "\n".join(lines),
        "suggestions": suggestions,
        "excluded_medicines": excluded,
        "pediatric_notice": pediatric_notice,
        "pregnancy_notice": pregnancy_notice,
        "sources": [
            "A-Z Medicine Dataset of India (CC0)",
            "National List of Essential Medicines (NLEM 2022, GODL)",
            "DDInter Drug-Drug Interaction Database (CC BY-NC-SA 4.0)",
            "openFDA and DailyMed Drug Labels"
        ],
        "disclaimer": DISCLAIMER_TEXT
    }
