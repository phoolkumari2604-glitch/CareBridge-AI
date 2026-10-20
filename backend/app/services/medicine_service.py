"""
CareBridge AI - Clinical Medicine Assistant Service
Implements 5-Layer Safety Pipeline:
1. Red-Flag Emergency Triage
2. CDSCO Banned FDC Filter
3. Allergy Exclusion Filter
4. Age & Pregnancy Contraindication Filter
5. Drug-Drug Interaction Engine (DDInter Grounded)
"""

import os
import re
import uuid
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.medicines_db import get_medicines_db

def log_anonymous_query(symptoms: List[str], status: str, red_flag: bool, suggestions_count: int):
    """
    Logs query telemetry strictly without Personally Identifiable Information (non-PII).
    Records symptom keywords, timestamp, triage status, and suggestion counts only.
    """
    try:
        log_entry = {
            "query_id": uuid.uuid4().hex[:12],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "symptoms_evaluated": [s.strip().lower() for s in symptoms[:5]],
            "status": status,
            "red_flag": bool(red_flag),
            "suggestions_count": suggestions_count
        }
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "anonymous_query_audit.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass

DISCLAIMER_TEXT = (
    "Informational and educational guidance only. Not a medical prescription or clinical diagnosis. "
    "Always consult a qualified healthcare professional or pharmacist before starting or modifying any medication."
)

EMERGENCY_NUMBERS = [
    {"service": "National Emergency Services", "number": "112"},
    {"service": "National Ambulance Service", "number": "108"},
    {"service": "Tele-MANAS Mental Health Helpline", "number": "14416 / 1800-891-4416"}
]

RED_FLAG_PATTERNS = [
    (r"\b(chest\s+pain|chest\s+tightness|chest\s+pressure|radiat(ing|es)\s+to\s+arm|radiat(ing|es)\s+to\s+jaw)\b",
     "Possible cardiac event (myocardial ischemia/infarction). Immediate hospital emergency care required."),
    (r"\b(breathless(ness)?|difficulty\s+breathing|gasping|can'?t\s+breathe|severe\s+dyspnea|choking)\b",
     "Acute respiratory distress. Immediate clinical oxygenation and emergency support required."),
    (r"\b(facial\s+droop|slurred\s+speech|weakness\s+on\s+one\s+side|arm\s+weakness|stroke)\b",
     "Acute cerebrovascular stroke signs. Urgent immediate emergency medical intervention required (Golden Hour)."),
    (r"\b(heavy\s+bleeding|vomiting\s+blood|coughing\s+up\s+blood|uncontrolled\s+bleeding|hematemesis|hemoptysis)\b",
     "Severe vascular hemorrhage or internal bleeding. Seek emergency medical attention immediately."),
    (r"\b(seizure|convulsion|fainted|loss\s+of\s+consciousness|collapsed|passed\s+out)\b",
     "Neurological crisis / syncope. Protect airway and call emergency services immediately."),
    (r"\b(lip\s+swelling|tongue\s+swelling|throat\s+closing|anaphylaxis|swollen\s+throat)\b",
     "Severe systemic allergic reaction (anaphylaxis). Immediate emergency medical care indicated."),
    (r"\b(suicid(e|al)|kill\s+myself|end\s+my\s+life|self\s*harm)\b",
     "Mental health emergency. Confidential crisis support available immediately via Tele-MANAS (14416 / 1800-891-4416)."),
    (r"\b(infant|baby|neonate|newborn).*(high fever|fever\s*>|temp\s*>|febrile)\b",
     "URGENT PEDIATRIC WARNING: High fever in young infants requires immediate bedside physician evaluation to rule out neonatal sepsis."),
    (r"\b(blood\s+in\s+stool|bloody\s+diarrhea|rectal\s+bleeding|dysentery)\b",
     "URGENT: Dysentery or invasive bowel pathology suspected. Immediate medical evaluation required.")
]


def check_red_flag_symptoms(symptoms: List[str]) -> Optional[Dict[str, Any]]:
    """Checks input symptoms against red-flag clinical patterns and database flags."""
    db = get_medicines_db()
    try:
        cur = db.cursor()
        
        # 1. Regex evaluation
        combined_text = " ".join(symptoms).lower()
        for pattern, alert in RED_FLAG_PATTERNS:
            if re.search(pattern, combined_text, re.IGNORECASE):
                return {
                    "is_emergency": True,
                    "red_flag_triggered": True,
                    "matched_symptom": pattern,
                    "alert_message": alert,
                    "emergency_alert": f"EMERGENCY NOTICE: {alert} Call 112 / 108 immediately.",
                    "emergency_contacts": EMERGENCY_NUMBERS,
                    "suggestions": [],
                    "excluded_medicines": [],
                    "filtered_out": [],
                    "disclaimer": "Emergency triage detected critical red-flag symptoms. Do not take OTC medication; seek immediate hospital care."
                }

        # 2. Database lookup with strict boundary / token checking
        for s in symptoms:
            s_clean = s.strip().lower()
            if not s_clean:
                continue

            cur.execute("""
            SELECT id, symptom_name, medical_term, is_red_flag, red_flag_alert
            FROM symptoms
            WHERE is_red_flag = 1
            """)
            for row in cur.fetchall():
                rf_id = row["id"].lower()
                rf_name = row["symptom_name"].lower()
                rf_term = (row["medical_term"] or "").lower()

                # For infant high fever, require infant/baby context
                if rf_id == "infant_high_fever":
                    if ("infant" in s_clean or "baby" in s_clean or "newborn" in s_clean) and "fever" in s_clean:
                        return {
                            "is_emergency": True,
                            "red_flag_triggered": True,
                            "matched_symptom": row["symptom_name"],
                            "alert_message": row["red_flag_alert"] or "Urgent pediatric escalation required.",
                            "emergency_alert": f"EMERGENCY NOTICE: {row['red_flag_alert']} Call 112 / 108 immediately.",
                            "emergency_contacts": EMERGENCY_NUMBERS,
                            "suggestions": [],
                            "excluded_medicines": [],
                            "filtered_out": [],
                            "disclaimer": "Emergency triage detected critical red-flag symptoms. Do not take OTC medication; seek immediate hospital care."
                        }
                elif s_clean == rf_id or s_clean == rf_name or s_clean == rf_term or (rf_id.replace("_", " ") in s_clean):
                    return {
                        "is_emergency": True,
                        "red_flag_triggered": True,
                        "matched_symptom": row["symptom_name"],
                        "alert_message": row["red_flag_alert"] or "Urgent medical escalation required.",
                        "emergency_alert": f"EMERGENCY NOTICE: {row['red_flag_alert']} Call 112 / 108 immediately.",
                        "emergency_contacts": EMERGENCY_NUMBERS,
                        "suggestions": [],
                        "excluded_medicines": [],
                        "filtered_out": [],
                        "disclaimer": "Emergency triage detected critical red-flag symptoms. Do not take OTC medication; seek immediate hospital care."
                    }

        return None
    finally:
        db.close()


def search_medicines(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Fuzzy / substring search across medicines, brands, and ingredients."""
    db = get_medicines_db()
    try:
        cur = db.cursor()
        q = f"%{query.strip()}%"

        # Search medicines + active ingredients
        cur.execute("""
        SELECT m.id, m.brand_name, m.manufacturer, m.dosage_form, m.strength, m.price_inr,
               m.is_otc, m.approved_for_suggestion, m.is_banned, m.ban_reason, m.is_nlem, m.is_who_eml,
               i.generic_name, i.drug_class, i.description,
               s.name AS source_name, s.attribution_text
        FROM medicines m
        LEFT JOIN medicine_ingredients mi ON m.id = mi.medicine_id
        LEFT JOIN ingredients i ON mi.ingredient_id = i.id
        LEFT JOIN sources s ON m.source_dataset = s.id
        WHERE m.brand_name LIKE ? OR i.generic_name LIKE ? OR m.strength LIKE ?
        LIMIT ?
        """, (q, q, q, limit))

        results = []
        for r in cur.fetchall():
            results.append({
                "id": r["id"],
                "brand_name": r["brand_name"],
                "generic_name": r["generic_name"] or r["brand_name"],
                "manufacturer": r["manufacturer"],
                "dosage_form": r["dosage_form"],
                "strength": r["strength"],
                "price_inr": r["price_inr"],
                "is_otc": bool(r["is_otc"]),
                "approved_for_suggestion": bool(r["approved_for_suggestion"]),
                "is_banned": bool(r["is_banned"]),
                "ban_reason": r["ban_reason"],
                "is_nlem": bool(r["is_nlem"]),
                "is_who_eml": bool(r["is_who_eml"]),
                "drug_class": r["drug_class"],
                "description": r["description"],
                "source": r["source_name"],
                "attribution": r["attribution_text"]
            })
        return results
    finally:
        db.close()


def check_drug_interactions(medicine_id_or_name: str, with_list: List[str]) -> Dict[str, Any]:
    """
    Rigorously checks pairwise interactions for a given medicine against a list of medicines.
    If interaction data is missing, explicitly notes that absence of data != safety.
    """
    db = get_medicines_db()
    try:
        cur = db.cursor()

        # Resolve primary ingredient
        def resolve_ingredient_id(term: str) -> Optional[str]:
            term = term.strip()
            # Direct ingredient ID
            cur.execute("SELECT id FROM ingredients WHERE id = ? OR generic_name LIKE ?", (term, f"%{term}%"))
            row = cur.fetchone()
            if row:
                return row["id"]

            # Medicine brand lookup
            cur.execute("""
            SELECT mi.ingredient_id
            FROM medicines m
            JOIN medicine_ingredients mi ON m.id = mi.medicine_id
            WHERE m.id = ? OR m.brand_name LIKE ?
            LIMIT 1
            """, (term, f"%{term}%"))
            m_row = cur.fetchone()
            if m_row:
                return m_row["ingredient_id"]
            return None

        primary_ingr_id = resolve_ingredient_id(medicine_id_or_name)
        if not primary_ingr_id:
            return {
                "medicine": medicine_id_or_name,
                "interactions_found": [],
                "missing_data": with_list,
                "notes": f"Could not map '{medicine_id_or_name}' to a standardized pharmaceutical active ingredient."
            }

        interactions_found = []
        missing_data = []

        for other_item in with_list:
            if not other_item or not other_item.strip():
                continue
            other_ingr_id = resolve_ingredient_id(other_item)
            if not other_ingr_id or other_ingr_id == primary_ingr_id:
                missing_data.append({
                    "with": other_item,
                    "status": "No interaction record available in DDInter. Do not assume combination is safe; consult physician."
                })
                continue

            cur.execute("""
            SELECT i.severity, i.mechanism, i.clinical_advice, s.attribution_text
            FROM interactions i
            JOIN sources s ON i.source_dataset = s.id
            WHERE (i.ingredient_a_id = ? AND i.ingredient_b_id = ?)
               OR (i.ingredient_a_id = ? AND i.ingredient_b_id = ?)
            LIMIT 1
            """, (primary_ingr_id, other_ingr_id, other_ingr_id, primary_ingr_id))
            int_row = cur.fetchone()

            if int_row:
                interactions_found.append({
                    "partner_medicine": other_item,
                    "with": other_item,
                    "severity": int_row["severity"],
                    "mechanism": int_row["mechanism"],
                    "clinical_advice": int_row["clinical_advice"],
                    "attribution": int_row["attribution_text"]
                })
            else:
                missing_data.append({
                    "partner_medicine": other_item,
                    "with": other_item,
                    "status": "No interaction record found in DDInter dataset. A lack of recorded interaction does NOT imply absence of risk."
                })

        return {
            "medicine": medicine_id_or_name,
            "primary_ingredient_id": primary_ingr_id,
            "interactions": interactions_found,
            "interactions_found": interactions_found,
            "missing_data": missing_data,
            "missing_interaction_data_for": [m["with"] for m in missing_data],
            "missing_data_notice": "Never assume unlisted combinations are safe. Absence of recorded interaction does not imply lack of risk.",
            "safety_reminder": "Never combine medications without verifying compatibility with your doctor or pharmacist."
        }
    finally:
        db.close()


def suggest_otc_medicines(
    symptoms: List[str],
    age: Optional[int] = None,
    gender: Optional[str] = None,
    pregnant: bool = False,
    pregnancy_trimester: Optional[str] = None,
    allergies: Optional[List[str]] = None,
    current_medicines: Optional[List[str]] = None,
    conditions: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Suggests OTC medications based on symptoms, passing through the 5-layer safety filter:
    1. Red-Flag Emergency Triage
    2. CDSCO Banned Filter
    3. Allergy Exclusion Filter
    4. Age & Pregnancy Contraindication Filter
    5. Drug-Drug Interaction Check
    """
    allergies = [a.strip().lower() for a in (allergies or []) if a.strip()]
    current_medicines = [m.strip() for m in (current_medicines or []) if m.strip()]
    conditions = [c.strip().lower() for c in (conditions or []) if c.strip()]

    # 1. RED-FLAG CHECK
    emergency_eval = check_red_flag_symptoms(symptoms)
    if emergency_eval:
        log_anonymous_query(symptoms, "emergency_triaged", True, 0)
        return emergency_eval

    # 2. PEDIATRIC WARNING FOR CHILDREN UNDER 12
    is_pediatric = age is not None and age < 12
    pediatric_warning = None
    if is_pediatric:
        pediatric_warning = (
            f"Patient is {age} years old (under 12). Pediatric weight-based dosing must be calculated "
            "by a licensed pediatrician. Do not administer adult OTC formulations or give aspirin to children."
        )

    # 3. PREGNANCY WARNING
    pregnancy_warning = None
    if pregnant:
        pregnancy_warning = (
            "Patient is pregnant. Many common OTC medications (including NSAIDs like ibuprofen) "
            "can cross the placenta and carry fetal safety risks. Consult your obstetrician before taking any medication."
        )

    db = get_medicines_db()
    try:
        cur = db.cursor()

        # Step A: Identify matching conditions from symptoms
        matched_condition_ids = set()
        matched_conditions_info = []

        SYMPTOM_SYNONYM_MAP = {
            "body pain": ["cond_fever", "cond_common_cold"],
            "joint pain": ["cond_fever"],
            "muscle pain": ["cond_fever"],
            "body ache": ["cond_fever", "cond_common_cold"],
            "body aches": ["cond_fever", "cond_common_cold"],
            "fever": ["cond_fever", "cond_common_cold"],
            "high temp": ["cond_fever"],
            "headache": ["cond_headache"],
            "head ache": ["cond_headache"],
            "cold": ["cond_common_cold", "cond_allergic_rhinitis"],
            "runny nose": ["cond_allergic_rhinitis", "cond_common_cold"],
            "sneezing": ["cond_allergic_rhinitis", "cond_common_cold"],
            "dry cough": ["cond_dry_cough"],
            "wet cough": ["cond_productive_cough"],
            "chesty cough": ["cond_productive_cough"],
            "cough": ["cond_dry_cough", "cond_productive_cough"],
            "sore throat": ["cond_sore_throat"],
            "throat irritation": ["cond_sore_throat"],
            "heartburn": ["cond_heartburn"],
            "acidity": ["cond_heartburn"],
            "acid reflux": ["cond_heartburn"],
            "gas": ["cond_heartburn"],
            "loose motion": ["cond_acute_diarrhea", "cond_dehydration"],
            "loose motions": ["cond_acute_diarrhea", "cond_dehydration"],
            "diarrhea": ["cond_acute_diarrhea", "cond_dehydration"],
            "dehydration": ["cond_dehydration"],
            "minor wound": ["cond_minor_wound"],
            "cut": ["cond_minor_wound"],
            "scrape": ["cond_minor_wound"],
            "abrasion": ["cond_minor_wound"],
            "athlete foot": ["cond_athlete_foot"],
            "fungal infection": ["cond_athlete_foot"]
        }

        for s in symptoms:
            s_clean = s.strip().lower()
            if not s_clean:
                continue

            # Check direct symptom synonyms
            for sym_term, c_ids in SYMPTOM_SYNONYM_MAP.items():
                if sym_term in s_clean or s_clean in sym_term:
                    for cid in c_ids:
                        matched_condition_ids.add(cid)

            # Query database
            cur.execute("""
            SELECT c.id, c.name, c.description, cs.relevance_weight
            FROM condition_symptoms cs
            JOIN conditions c ON cs.condition_id = c.id
            JOIN symptoms sym ON cs.symptom_id = sym.id
            WHERE sym.symptom_name LIKE ? OR sym.medical_term LIKE ? OR c.name LIKE ? OR sym.id LIKE ?
            ORDER BY cs.relevance_weight DESC
            """, (f"%{s_clean}%", f"%{s_clean}%", f"%{s_clean}%", f"%{s_clean}%"))

            for row in cur.fetchall():
                matched_condition_ids.add(row["id"])

        # Fetch descriptions for matched conditions
        if matched_condition_ids:
            placeholders_c = ",".join("?" * len(matched_condition_ids))
            cur.execute(f"SELECT id, name, description FROM conditions WHERE id IN ({placeholders_c})", list(matched_condition_ids))
            for row in cur.fetchall():
                matched_conditions_info.append({
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"]
                })

        # Step B: Identify candidate active ingredients mapped to these conditions
        # ONLY ALLOWED OTC INGREDIENTS WITH approved_for_suggestion = 1
        candidate_ingredients = {}
        if matched_condition_ids:
            placeholders = ",".join("?" * len(matched_condition_ids))
            cur.execute(f"""
            SELECT i.id, i.generic_name, i.drug_class, i.description,
                   i.pregnancy_category, i.min_age_years, mc.condition_id, c.name AS condition_name
            FROM medicine_conditions mc
            JOIN ingredients i ON mc.ingredient_id = i.id
            JOIN conditions c ON mc.condition_id = c.id
            WHERE mc.condition_id IN ({placeholders})
              AND i.approved_for_suggestion = 1
              AND i.is_otc = 1
            """, list(matched_condition_ids))

            for row in cur.fetchall():
                ingr_id = row["id"]
                if ingr_id not in candidate_ingredients:
                    candidate_ingredients[ingr_id] = {
                        "id": ingr_id,
                        "generic_name": row["generic_name"],
                        "drug_class": row["drug_class"],
                        "description": row["description"],
                        "pregnancy_category": row["pregnancy_category"],
                        "min_age_years": row["min_age_years"],
                        "conditions": [row["condition_name"]]
                    }
                else:
                    if row["condition_name"] not in candidate_ingredients[ingr_id]["conditions"]:
                        candidate_ingredients[ingr_id]["conditions"].append(row["condition_name"])

        # Step C: Run 5-Layer Clinical Filter
        filtered_out = []
        approved_suggestions = []

        for ingr_id, ingr in candidate_ingredients.items():
            generic_lower = ingr["generic_name"].lower()
            drug_class_lower = (ingr["drug_class"] or "").lower()

            # LAYER 1: Allergy Filter
            allergy_match = None
            for allergy in allergies:
                if allergy in generic_lower or allergy in drug_class_lower:
                    allergy_match = allergy
                    break
            if allergy_match:
                filtered_out.append({
                    "generic_name": ingr["generic_name"],
                    "reason": f"Filtered out due to reported allergy: '{allergy_match}'"
                })
                continue

            # LAYER 2: Age Filter
            if age is not None and age < ingr["min_age_years"]:
                filtered_out.append({
                    "generic_name": ingr["generic_name"],
                    "reason": f"Age {age} is below minimum recommended safety threshold ({ingr['min_age_years']} years)"
                })
                continue

            # LAYER 3: Pregnancy Filter
            if pregnant:
                if ingr["pregnancy_category"] in ["D", "X"] or "nsaid" in drug_class_lower:
                    filtered_out.append({
                        "generic_name": ingr["generic_name"],
                        "reason": f"Contraindicated in pregnancy (Category {ingr['pregnancy_category']}; fetal cardiovascular/renal risks)"
                    })
                    continue

            # LAYER 4: Condition Contraindications
            condition_contra = False
            for cond in conditions:
                if "ulcer" in cond and "nsaid" in drug_class_lower:
                    filtered_out.append({
                        "generic_name": ingr["generic_name"],
                        "reason": "Contraindicated due to reported peptic ulcer or gastrointestinal bleeding history"
                    })
                    condition_contra = True
                    break
                if "kidney" in cond and "nsaid" in drug_class_lower:
                    filtered_out.append({
                        "generic_name": ingr["generic_name"],
                        "reason": "Contraindicated in chronic kidney disease or renal impairment"
                    })
                    condition_contra = True
                    break
                if "liver" in cond and "paracetamol" in generic_lower:
                    filtered_out.append({
                        "generic_name": ingr["generic_name"],
                        "reason": "Severe caution in active hepatic impairment; require strict physician dosage calculation"
                    })
                    condition_contra = True
                    break
            if condition_contra:
                continue

            # LAYER 5: Drug-Drug Interaction Check against user's current medicines
            int_check = check_drug_interactions(ingr["generic_name"], current_medicines)
            major_conflict = None
            moderate_warnings = []

            for inter in int_check["interactions_found"]:
                if inter["severity"] == "MAJOR":
                    major_conflict = inter
                    break
                else:
                    moderate_warnings.append(f"{inter['severity']} Interaction with {inter['with']}: {inter['clinical_advice']}")

            if major_conflict:
                filtered_out.append({
                    "generic_name": ingr["generic_name"],
                    "reason": f"Major Drug Interaction with {major_conflict['with']}: {major_conflict['clinical_advice']}"
                })
                continue

            # Fetch representative approved medicines and brands for this ingredient
            cur.execute("""
            SELECT m.id, m.brand_name, m.manufacturer, m.dosage_form, m.strength, m.price_inr,
                   m.is_nlem, m.is_who_eml, s.name AS source_name, s.attribution_text
            FROM medicines m
            JOIN medicine_ingredients mi ON m.id = mi.medicine_id
            JOIN sources s ON m.source_dataset = s.id
            WHERE mi.ingredient_id = ?
              AND m.approved_for_suggestion = 1
              AND m.is_banned = 0
            LIMIT 3
            """, (ingr_id,))

            med_rows = cur.fetchall()
            common_brands = []
            for m in med_rows:
                # Get substitute brands
                cur.execute("SELECT brand_name, manufacturer, price_inr FROM brands WHERE medicine_id = ? LIMIT 3", (m["id"],))
                sub_rows = cur.fetchall()
                substitutes = [{"brand_name": b["brand_name"], "manufacturer": b["manufacturer"], "price_inr": b["price_inr"]} for b in sub_rows]

                common_brands.append({
                    "brand_name": m["brand_name"],
                    "manufacturer": m["manufacturer"],
                    "form": m["dosage_form"],
                    "strength": m["strength"],
                    "price_inr": m["price_inr"],
                    "is_essential": bool(m["is_nlem"] or m["is_who_eml"]),
                    "substitutes": substitutes
                })

            # Fetch side effects from SIDER
            cur.execute("""
            SELECT effect_name, frequency FROM side_effects WHERE ingredient_id = ? LIMIT 4
            """, (ingr_id,))
            side_effects = [{"effect": se["effect_name"], "frequency": se["frequency"]} for se in cur.fetchall()]

            # Fetch warnings
            cur.execute("""
            SELECT warning_text FROM contraindications WHERE ingredient_id = ?
            """, (ingr_id,))
            warnings = [w["warning_text"] for w in cur.fetchall()]
            if moderate_warnings:
                warnings.extend(moderate_warnings)

            # Missing interaction notes
            missing_interaction_notes = [m["status"] for m in int_check["missing_data"]]

            approved_suggestions.append({
                "generic_name": ingr["generic_name"],
                "drug_class": ingr["drug_class"],
                "commonly_used_for": f"Commonly used for symptomatic relief of {', '.join(ingr['conditions'])}.",
                "description": ingr["description"],
                "common_brands": common_brands,
                "warnings": warnings,
                "side_effects": side_effects,
                "interactions": missing_interaction_notes if missing_interaction_notes else ["No known major interactions documented with your current medications."],
                "interactions_caution": missing_interaction_notes if missing_interaction_notes else None,
                "source": "A-Z Medicine Dataset of India, NLEM 2022, RxNorm, openFDA",
                "attribution": "Dataset provenance: NLM RxNorm, CDSCO India, and openFDA public databases.",
                "source_and_attribution": "A-Z Medicine Dataset of India (CC0), NLEM 2022 (GODL), DDInter (CC BY-NC-SA 4.0), openFDA public domain."
            })

        log_anonymous_query(symptoms, "evaluated", False, len(approved_suggestions))
        return {
            "is_emergency": False,
            "red_flag_triggered": False,
            "emergency_alert": None,
            "matched_conditions": matched_conditions_info,
            "suggestions": approved_suggestions,
            "filtered_out": filtered_out,
            "excluded_medicines": filtered_out,
            "pediatric_warning": pediatric_warning,
            "age_warning": pediatric_warning,
            "pregnancy_warning": pregnancy_warning,
            "disclaimer": DISCLAIMER_TEXT
        }
    finally:
        db.close()
