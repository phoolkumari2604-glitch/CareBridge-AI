"""
CareBridge Clinical Knowledge Base Service
- Fast multi-file JSON loader for 23 clinical datasets
- Multilingual synonym indexing across English, Hindi, Hinglish, Telugu, and Tamil
- Instant medical glossary lookup (300+ terms and abbreviations)
- Ambiguity detection (5% top-score margin triggers clarification pills)
- Role-based clinical response formatting (PATIENT, DOCTOR, STAFF)
- Vitals safety validation with real vs. simulated telemetry distinction
"""

import os
import re
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId

from app.core.database import get_database
from app.utils.helpers import is_valid_object_id
from app.services.safety_layers import apply_output_filter
from app.services.conversation_manager import detect_language, LOCALIZED_PROMPTS, LANG_EN

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Check backend/data/health_knowledge first, then data/health_knowledge
KB_DIR_BACKEND = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "health_knowledge"))
KB_DIR_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "data", "health_knowledge"))

KB_DIR = KB_DIR_BACKEND if os.path.exists(KB_DIR_BACKEND) else KB_DIR_ROOT

# In-memory caches for fast sub-millisecond retrieval
_KB_ENTRIES: List[Dict[str, Any]] = []
_MEDICAL_GLOSSARY: List[Dict[str, Any]] = []
_SYMPTOM_SYNONYMS: Dict[str, Dict[str, List[str]]] = {}
_VITALS_RANGES: List[Dict[str, Any]] = []
_DRUG_INTERACTIONS: List[Dict[str, Any]] = []
_IS_INITIALIZED: bool = False


def normalize_text(text: str) -> str:
    """Normalize text for fuzzy alias matching preserving Indic Unicode characters"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_knowledge_base():
    """Load and index all 23 JSON clinical knowledge base files into memory"""
    global _KB_ENTRIES, _MEDICAL_GLOSSARY, _SYMPTOM_SYNONYMS, _VITALS_RANGES, _DRUG_INTERACTIONS, _IS_INITIALIZED

    if _IS_INITIALIZED and _KB_ENTRIES:
        return

    _KB_ENTRIES = []
    _MEDICAL_GLOSSARY = []
    _SYMPTOM_SYNONYMS = {}
    _VITALS_RANGES = []
    _DRUG_INTERACTIONS = []

    if not os.path.exists(KB_DIR):
        return

    for fname in os.listdir(KB_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(KB_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            if fname == "medical_glossary.json":
                _MEDICAL_GLOSSARY = data if isinstance(data, list) else []
            elif fname == "symptom_synonyms.json":
                _SYMPTOM_SYNONYMS = data if isinstance(data, dict) else {}
            elif fname == "vitals_ranges.json":
                _VITALS_RANGES = data if isinstance(data, list) else []
            elif fname == "drug_interactions.json":
                _DRUG_INTERACTIONS = data if isinstance(data, list) else []
                # Also index as regular entries
                if isinstance(data, list):
                    _KB_ENTRIES.extend(data)
            else:
                if isinstance(data, list):
                    _KB_ENTRIES.extend(data)
        except Exception as e:
            print(f"[ClinicalKB] Error loading {fname}: {e}")

    _IS_INITIALIZED = True
    print(f"[ClinicalKB] Loaded {len(_KB_ENTRIES)} clinical entries, {len(_MEDICAL_GLOSSARY)} glossary terms, {len(_SYMPTOM_SYNONYMS)} synonym maps.")


# Call load immediately on module import
load_knowledge_base()


# ============================================================================
# MEDICAL GLOSSARY LOOKUP
# ============================================================================
def lookup_glossary(query_text: str) -> Optional[Dict[str, Any]]:
    """Instant match for abbreviation, definition, or medical term questions"""
    load_knowledge_base()
    q = normalize_text(query_text)
    if not q or not _MEDICAL_GLOSSARY:
        return None

    # Check if query is looking for a definition
    def_intent = re.search(r"\b(what\s+is|what\s+does|meaning\s+of|full\s+form\s+of|define|stands?\s+for|kya\s+hota\s+hai|kya\s+hai|ante\s+enti|enna)\b", q)
    
    # Extract query tokens
    tokens = set(q.split())

    for item in _MEDICAL_GLOSSARY:
        term = item.get("term", "").lower()
        full_form = item.get("full_form", "").lower()

        # Split slash variants (e.g. "ECG / EKG")
        term_variants = [normalize_text(t) for t in term.split("/")]

        for v in term_variants:
            if not v:
                continue
            # Direct exact match or definition query match
            if v == q or (def_intent and re.search(r"\b" + re.escape(v) + r"\b", q)):
                return item
            if full_form and (full_form == q or (def_intent and full_form in q)):
                return item

    return None


def format_glossary_card(item: Dict[str, Any], lang: str = LANG_EN) -> str:
    """Format glossary item as a clean educational card"""
    term = item.get("term", "")
    full_form = item.get("full_form", "")
    defn = item.get("definition", "")
    cat = item.get("category", "General Medicine")

    return f"""### 📖 Medical Glossary: **{term}**
**Full Form:** {full_form}
**Specialty:** *{cat}*

{defn}

> *MedAI Medical Terminology Directory*"""


# ============================================================================
# MULTILINGUAL SYNONYM EXPANSION & SEARCH
# ============================================================================
def expand_query_multilingual(query_text: str) -> Tuple[List[str], str]:
    """
    Expands user query across EN, HI, Hinglish, TE, TA using symptom_synonyms.json.
    Returns (expanded_tokens, detected_language).
    """
    load_knowledge_base()
    q = query_text.lower()
    lang = detect_language(query_text)
    norm_q = normalize_text(query_text)
    expanded = set(norm_q.split())

    if not _SYMPTOM_SYNONYMS:
        return list(expanded), lang

    q_words = set(norm_q.split())

    for symptom_key, lang_map in _SYMPTOM_SYNONYMS.items():
        matched = False
        for l_code, syn_list in lang_map.items():
            for syn in syn_list:
                syn_norm = syn.lower()
                syn_words = set(normalize_text(syn).split())
                if len(syn_words) == 1:
                    # Single word match - check in normalized words or regex boundary for ascii
                    if syn_norm in q_words or (syn_norm.isascii() and re.search(r"\b" + re.escape(syn_norm) + r"\b", q)):
                        matched = True
                        break
                elif len(syn_words) > 1:
                    # Multi-word phrase - check contiguous substring or token subset
                    if syn_norm in q or (syn_words and syn_words.issubset(q_words)):
                        matched = True
                        break
            if matched:
                break

        if matched:
            # Add canonical symptom key and all English equivalents to search tokens
            expanded.add(symptom_key.replace("_", " "))
            for en_syn in lang_map.get("en", []):
                expanded.update(normalize_text(en_syn).split())

    return list(expanded), lang


def search_health_knowledge(
    query_text: str,
    role: str = "PATIENT",
    limit: int = 3
) -> Dict[str, Any]:
    """
    Core retrieval function:
    - Multilingual token expansion
    - Keyword, topic, and intent scoring
    - 5% margin ambiguity detection
    - Returns structured result with best match and clarification options if ambiguous
    """
    load_knowledge_base()
    q = normalize_text(query_text)
    if not q:
        return {"entry": None, "ambiguous": False, "options": [], "lang": LANG_EN}

    # 1. First check glossary
    glossary_match = lookup_glossary(query_text)
    if glossary_match:
        lang = detect_language(query_text)
        return {
            "entry": None,
            "glossary": glossary_match,
            "ambiguous": False,
            "options": [],
            "lang": lang
        }

    expanded_tokens, lang = expand_query_multilingual(query_text)
    expanded_set = set(expanded_tokens)

    hits: List[Tuple[float, Dict[str, Any]]] = []

    for entry in _KB_ENTRIES:
        score = 0.0
        topic = normalize_text(entry.get("topic", ""))
        keywords = [normalize_text(k) for k in entry.get("keywords", [])]
        intent = normalize_text(entry.get("intent", ""))

        # 1. Exact or phrase match in topic
        if q and q == topic:
            score += 100.0
        elif q and q in topic:
            score += 40.0
        elif topic and topic in q:
            score += 35.0

        # 2. Keywords match
        for kw in keywords:
            if not kw:
                continue
            if kw == q:
                score += 50.0
            elif kw in q or q in kw:
                score += 25.0
            # Word overlap with expanded tokens
            kw_words = set(kw.split())
            overlap = len(kw_words.intersection(expanded_set))
            score += overlap * 8.0

        # 3. Topic words overlap with expanded query
        topic_words = set(topic.split())
        t_overlap = len(topic_words.intersection(expanded_set))
        score += t_overlap * 6.0

        # 4. Intent match boost
        if intent and intent in q:
            score += 15.0

        if score > 0:
            hits.append((score, entry))

    hits.sort(key=lambda x: x[0], reverse=True)

    if not hits:
        return {"entry": None, "ambiguous": False, "options": [], "lang": lang}

    top_score, top_entry = hits[0]

    # Ambiguity check: if 2nd hit score is within 5% of top score
    ambiguous = False
    options = []
    if len(hits) >= 2:
        second_score, second_entry = hits[1]
        if top_score > 0 and (second_score / top_score) >= 0.95:
            ambiguous = True
            options = [
                {"id": top_entry.get("id"), "topic": top_entry.get("topic")},
                {"id": second_entry.get("id"), "topic": second_entry.get("topic")}
            ]
            if len(hits) >= 3 and (hits[2][0] / top_score) >= 0.90:
                options.append({"id": hits[2][1].get("id"), "topic": hits[2][1].get("topic")})

    return {
        "entry": top_entry,
        "score": top_score,
        "ambiguous": ambiguous,
        "options": options,
        "lang": lang
    }


# ============================================================================
# ROLE-BASED RESPONSE FORMATTER
# ============================================================================
def format_role_response(
    entry: Dict[str, Any],
    role: str = "PATIENT",
    lang: str = LANG_EN
) -> str:
    """
    Formats the clinical answer strictly tailored to the user's role:
    - PATIENT: Plain language numbered action steps, home care, red flags, avoid items
    - DOCTOR: Clinical assessment, differential diagnosis, investigations, management, references
    - STAFF: Triage level, vital sign monitoring protocol, escalation triggers
    """
    role_upper = (role or "PATIENT").upper()
    topic = entry.get("topic", "Clinical Information")
    source = entry.get("source", "Standard Healthcare Protocols")
    review_status = entry.get("review_status", "draft")
    reviewed_by = entry.get("reviewed_by")

    # PATIENT FORMAT
    if role_upper == "PATIENT":
        patient_steps = entry.get("patient_answer", [])
        if isinstance(patient_steps, str):
            steps_md = patient_steps
        else:
            steps_md = "\n".join([f"{i+1}. {step}" for i, step in enumerate(patient_steps)])

        red_flags = entry.get("red_flags", [])
        red_flags_md = ""
        if red_flags:
            red_flags_md = "\n\n#### 🚨 When to Seek Immediate Medical Help\n" + "\n".join([f"- **{flag}**" for flag in red_flags])

        avoid = entry.get("avoid", [])
        avoid_md = ""
        if avoid:
            avoid_md = "\n\n#### ⚠️ What to Avoid\n" + "\n".join([f"- {item}" for item in avoid])

        md = f"""### 🩺 {topic}
{steps_md}{avoid_md}{red_flags_md}

---
*Source: {source}*"""
        return apply_output_filter(md, entry)

    # DOCTOR / CLINICIAN FORMAT
    elif role_upper in ("DOCTOR", "CLINICIAN"):
        doc_ans = entry.get("doctor_answer", {})
        if isinstance(doc_ans, str):
            body_md = doc_ans
        else:
            assessment = doc_ans.get("assessment", "")
            investigations = doc_ans.get("investigations", "")
            management = doc_ans.get("management", "")
            refs = doc_ans.get("references", [])
            refs_md = ", ".join(refs) if refs else source

            body_md = f"""#### 1. 📋 Clinical Assessment
{assessment}

#### 2. 🔬 Recommended Investigations
{investigations}

#### 3. 💊 Evidence-Based Management
{management}

#### 4. 📚 Clinical References
{refs_md}"""

        red_flags = entry.get("red_flags", [])
        red_flags_md = ""
        if red_flags:
            red_flags_md = "\n\n#### 🚨 Critical Red Flags & Admission Criteria\n" + "\n".join([f"- ⚠️ {flag}" for flag in red_flags])

        md = f"""### 🩺 Clinical Protocol: {topic}
{body_md}{red_flags_md}"""
        return apply_output_filter(md, entry)

    # STAFF / NURSE FORMAT
    else:
        staff_ans = entry.get("staff_answer", "")
        if not staff_ans:
            staff_ans = f"Standard inpatient / OPD care workflow for {topic}. Verify baseline vitals and report any deterioration to the attending medical officer."

        red_flags = entry.get("red_flags", [])
        red_flags_md = ""
        if red_flags:
            red_flags_md = "\n\n#### 🚨 Triage Red Flags to Report to Medical Officer Immediately\n" + "\n".join([f"- ⚠️ {flag}" for flag in red_flags])

        md = f"""### 🏥 Nursing & Clinical Staff Protocol: {topic}
{staff_ans}{red_flags_md}

---
*Source: {source}*"""
        return apply_output_filter(md, entry)


# ============================================================================
# VITALS SAFETY CHECKER (SIMULATED VS REAL DISTINCTION)
# ============================================================================
def evaluate_vitals_safety(
    vitals: Dict[str, Any],
    is_simulated: bool = False
) -> Optional[str]:
    """
    Checks patient vitals against clinical thresholds:
    - Detects severe abnormalities (e.g. SBP < 90, SpO2 < 94%, HR > 120 or < 50)
    - Distinguishes between simulated demo vitals and real patient records
    """
    if not vitals or not isinstance(vitals, dict):
        return None

    alerts = []

    # Blood Pressure
    sbp = vitals.get("systolic_bp") or vitals.get("sbp")
    dbp = vitals.get("diastolic_bp") or vitals.get("dbp")
    if sbp is not None:
        try:
            sbp = float(sbp)
            if sbp < 90:
                alerts.append(f"Severe Hypotension (SBP {sbp:g} mmHg < 90 mmHg)")
            elif sbp >= 160:
                alerts.append(f"Stage 2 / Urgent Hypertension (SBP {sbp:g} mmHg >= 160 mmHg)")
        except (ValueError, TypeError):
            pass

    if dbp is not None:
        try:
            dbp = float(dbp)
            if dbp < 60:
                alerts.append(f"Low Diastolic Pressure (DBP {dbp:g} mmHg < 60 mmHg)")
            elif dbp >= 100:
                alerts.append(f"Elevated Diastolic Pressure (DBP {dbp:g} mmHg >= 100 mmHg)")
        except (ValueError, TypeError):
            pass

    # Oxygen Saturation (SpO2)
    spo2 = vitals.get("spo2") or vitals.get("oxygen_saturation")
    if spo2 is not None:
        try:
            spo2 = float(spo2)
            if spo2 < 90:
                alerts.append(f"Critical Hypoxemia (SpO2 {spo2:g}% < 90% - Emergency O2 required)")
            elif spo2 < 94:
                alerts.append(f"Subnormal Oxygen Saturation (SpO2 {spo2:g}% < 94%)")
        except (ValueError, TypeError):
            pass

    # Heart Rate
    hr = vitals.get("heart_rate") or vitals.get("pulse")
    if hr is not None:
        try:
            hr = float(hr)
            if hr > 120:
                alerts.append(f"Significant Tachycardia (HR {hr:g} bpm > 120 bpm)")
            elif hr < 50:
                alerts.append(f"Bradycardia (HR {hr:g} bpm < 50 bpm)")
        except (ValueError, TypeError):
            pass

    # Temperature
    temp = vitals.get("temperature")
    if temp is not None:
        try:
            temp = float(temp)
            # If Fahrenheit (e.g. 101.5)
            if temp > 60:
                if temp >= 103:
                    alerts.append(f"High Fever ({temp:g}°F >= 103°F)")
            else:
                # Celsius
                if temp >= 39.5:
                    alerts.append(f"High Fever ({temp:g}°C >= 39.5°C)")
                elif temp >= 38.5:
                    alerts.append(f"Moderate Febrile Temperature ({temp:g}°C)")
        except (ValueError, TypeError):
            pass

    if not alerts:
        return None

    source_tag = "*(Simulated Dashboard Telemetry)*" if is_simulated else "*(Live EHR Patient Record)*"
    alerts_list = "\n".join([f"- ⚠️ **{a}**" for a in alerts])

    return f"""> 🚨 **CRITICAL VITALS ALERT** {source_tag}
> The following abnormal physiological parameters were detected:
{alerts_list}
> *Action Required: Notify on-duty medical officer or nursing supervisor immediately.*"""


# ============================================================================
# BACKWARDS COMPATIBILITY WRAPPERS
# ============================================================================
def seed_clinical_kb_if_empty():
    """Retained for MongoDB initialization compatibility"""
    load_knowledge_base()


def search_kb_conditions(query_text: str, limit: int = 2):
    """Retained for compatibility; uses the new search engine"""
    res = search_health_knowledge(query_text, limit=limit)
    if res.get("entry"):
        return [res["entry"]]
    return []


def format_protocol_card(cond: dict) -> str:
    """Format an entry as protocol card"""
    return format_role_response(cond, role="DOCTOR")


CANONICAL_INTERACTIONS = [
    {
        "drugs": [["amlodipine"], ["metformin"]],
        "pair": "Amlodipine + Metformin",
        "severity": "minor",
        "mechanism": "Minimal pharmacokinetic interaction. Mild additive hypotensive and vasodilatory effects.",
        "effect": "Generally safe when prescribed together. Routine blood pressure and glycemic monitoring is standard care.",
        "management": "No dosage adjustment needed. Continue routine monitoring of blood pressure and blood glucose."
    },
    {
        "drugs": [["amlodipine"], ["simvastatin"]],
        "pair": "Amlodipine + Simvastatin",
        "severity": "moderate",
        "mechanism": "Amlodipine inhibits CYP3A4-mediated metabolism of Simvastatin, increasing its systemic AUC by ~77%.",
        "effect": "Elevated simvastatin plasma levels significantly increase the risk of statin-induced myopathy and rhabdomyolysis.",
        "management": "FDA safety limit: Do NOT exceed Simvastatin 20 mg daily when co-prescribed with Amlodipine. Consider switching to Atorvastatin or Rosuvastatin if higher statin intensity is required."
    },
    {
        "drugs": [["aspirin", "disprin"], ["warfarin", "coumadin"]],
        "pair": "Aspirin + Warfarin",
        "severity": "major",
        "mechanism": "Synergistic pharmacological hemostasis impairment: Aspirin blocks platelet thromboxane A2 while Warfarin inhibits vitamin K-dependent clotting factors (II, VII, IX, X).",
        "effect": "Markedly elevated risk of major internal, gastrointestinal, and life-threatening intracranial hemorrhage.",
        "management": "Avoid routine combination unless strictly indicated for high-risk cardiac conditions (e.g., mechanical prosthetic heart valves). Monitor INR closely (target usually 2.0-2.5 in combination) and prescribe gastroprotection (PPI)."
    },
    {
        "drugs": [["enalapril", "ramipril", "lisinopril", "telmisartan", "losartan"], ["spironolactone", "eplerenone"]],
        "pair": "Enalapril (ACEi / ARB) + Spironolactone",
        "severity": "major",
        "mechanism": "Dual blockade of the renin-angiotensin-aldosterone system (RAAS) severely impairs renal potassium excretion.",
        "effect": "High risk of life-threatening severe hyperkalemia (>5.5-6.0 mmol/L) and fatal cardiac conduction blocks / arrhythmias.",
        "management": "Check baseline serum potassium and eGFR before initiating. Recheck electrolytes at 1 week, 4 weeks, and every 3-6 months. Advise patient strictly against salt substitutes containing potassium."
    },
    {
        "drugs": [["metformin"], ["contrast", "iodinated contrast", "radiocontrast", "contrast dye"]],
        "pair": "Metformin + Iodinated Radiocontrast",
        "severity": "contraindicated",
        "mechanism": "Intravascular iodinated contrast media can precipitate acute renal impairment or contrast-induced nephropathy (CIN), impairing metformin clearance.",
        "effect": "Metformin accumulation leading to severe, life-threatening Metformin-Associated Lactic Acidosis (MALA) with high mortality (>30%).",
        "management": "Contraindicated: Withhold Metformin 48 hours prior to elective contrast procedures (or at time of emergency scan). Re-evaluate renal function (eGFR/serum creatinine) 48 hours post-procedure; restart only if renal function remains stable."
    },
    {
        "drugs": [["theophylline", "deriphyllin"], ["ciprofloxacin", "cipro"]],
        "pair": "Theophylline + Ciprofloxacin",
        "severity": "contraindicated",
        "mechanism": "Ciprofloxacin is a potent inhibitor of hepatic CYP1A2, which is the primary metabolic clearance pathway for theophylline, decreasing its clearance by 30-50%.",
        "effect": "Rapid rise in serum theophylline levels to toxic range (>20 mcg/mL), causing intractable nausea, agitation, supraventricular tachycardia, refractory seizures, and cardiac arrest.",
        "management": "Contraindicated: Avoid co-prescription. If a fluoroquinolone is essential, choose Levofloxacin or Ofloxacin (minimal CYP1A2 inhibition), or reduce theophylline dose by 50% with daily therapeutic drug monitoring."
    },
    {
        "drugs": [["aspirin", "disprin"], ["ibuprofen", "brufen", "nsaids", "combiflam"]],
        "pair": "Aspirin + Ibuprofen / NSAIDs",
        "severity": "major",
        "mechanism": "Ibuprofen competitively and reversibly binds COX-1, sterically hindering aspirin from irreversibly acetylating Serine-529; blunts cardioprotection.",
        "effect": "Loss of cardioprotective antiplatelet effect and synergistic ulcerogenic mucosal damage causing major GI bleeding.",
        "management": "Take immediate-release Aspirin at least 30 minutes before or 8 hours after Ibuprofen. Switch to Paracetamol for analgesia."
    },
    {
        "drugs": [["sildenafil", "viagra"], ["nitroglycerin", "sorbitrate", "nitrates", "isorbide"]],
        "pair": "Sildenafil + Nitrates",
        "severity": "contraindicated",
        "mechanism": "Excessive accumulation of cyclic GMP from PDE-5 inhibition plus nitric oxide donation.",
        "effect": "Severe refractory hypotension, syncope, coronary hypoperfusion, and fatal myocardial infarction.",
        "management": "Absolute contraindication: Do NOT co-administer. Minimum 24-hour separation required for Sildenafil (48h for Tadalafil)."
    },
    {
        "drugs": [["clopidogrel", "plavix"], ["omeprazole", "esomeprazole"]],
        "pair": "Clopidogrel + Omeprazole",
        "severity": "major",
        "mechanism": "Omeprazole inhibits CYP2C19, preventing bioactivation of clopidogrel into its active antiplatelet metabolite.",
        "effect": "Decreased antiplatelet efficacy, increasing risk of stent thrombosis and recurrent myocardial infarction.",
        "management": "Switch PPI to Pantoprazole or Rabeprazole, which exhibit minimal CYP2C19 inhibition, or use H2-blockers like Famotidine."
    },
    {
        "drugs": [["digoxin", "lanoxin"], ["amiodarone", "cordarone"]],
        "pair": "Digoxin + Amiodarone",
        "severity": "major",
        "mechanism": "Amiodarone inhibits P-glycoprotein renal and biliary transport of digoxin, doubling serum digoxin levels.",
        "effect": "Digoxin toxicity: severe bradycardia, heart blocks, xanthopsia (yellow-green vision), and ventricular arrhythmias.",
        "management": "Reduce digoxin dosage by 50% upon starting amiodarone. Monitor digoxin levels and ECG closely."
    },
    {
        "drugs": [["lithium"], ["ibuprofen", "diclofenac", "naproxen", "hydrochlorothiazide"]],
        "pair": "Lithium + NSAIDs / Thiazides",
        "severity": "major",
        "mechanism": "Decreased renal prostaglandin synthesis reduces renal blood flow and lithium clearance.",
        "effect": "Elevated lithium levels causing tremors, ataxia, confusion, and acute renal failure.",
        "management": "Avoid concurrent NSAIDs or thiazides with lithium. Use paracetamol for analgesia; monitor serum lithium levels."
    },
    {
        "drugs": [["metronidazole", "flagyl"], ["alcohol", "ethanol", "wine", "beer"]],
        "pair": "Metronidazole + Alcohol",
        "severity": "contraindicated",
        "mechanism": "Inhibition of aldehyde dehydrogenase enzyme causing accumulation of toxic acetaldehyde.",
        "effect": "Disulfiram-like reaction: severe facial flushing, throbbing headache, palpitations, nausea, vomiting, hypotension.",
        "management": "Contraindicated: Strictly avoid alcohol during treatment and for at least 48 hours following final metronidazole dose."
    }
]


def check_drug_interactions(query_text: str):
    """Detect drug mentions in user query and check knowledge base for interactions"""
    load_knowledge_base()
    q = normalize_text(query_text)
    if not q:
        return None

    detected = []

    # 1. Match against canonical interaction pairs table
    ql = query_text.lower()
    for inter in CANONICAL_INTERACTIONS:
        g1, g2 = inter["drugs"]
        m1 = any(k in ql for k in g1)
        m2 = any(k in ql for k in g2)
        if m1 and m2:
            detected.append(inter)

    # 2. Check JSON dataset for any additional matches
    if not detected and _DRUG_INTERACTIONS:
        for inter in _DRUG_INTERACTIONS:
            da = normalize_text(inter.get("drug_a", ""))
            db = normalize_text(inter.get("drug_b", ""))
            if da and db:
                if re.search(r"\b" + re.escape(da) + r"\b", q) and re.search(r"\b" + re.escape(db) + r"\b", q):
                    detected.append(inter)

    if not detected:
        return None

    severity_badges = {
        "minor": ("🟢", "Minor Interaction (Low Risk)"),
        "moderate": ("🟡", "Moderate Interaction (Caution & Monitoring Required)"),
        "major": ("🔴", "Major Interaction (High Clinical Risk)"),
        "contraindicated": ("⛔", "Contraindicated (Avoid Co-Prescription)")
    }

    table_rows = []
    for inter in detected:
        sev = inter.get("severity", "moderate").lower()
        badge_icon, badge_text = severity_badges.get(sev, ("🟡", "Moderate"))
        pair = inter.get("pair") or f"{inter.get('drug_a', '').title()} + {inter.get('drug_b', '').title()}"
        mech = inter.get("mechanism", "")
        effect = inter.get("effect", "")
        mgmt = inter.get("management", "")

        table_rows.append(f"""
| Drug Combination | **{pair}** |
| :--- | :--- |
| **Severity Level** | {badge_icon} **{badge_text}** |
| **Pharmacological Mechanism** | {mech} |
| **Clinical Effect** | {effect} |
| **Management Recommendation** | {mgmt} |
""")

    return "### 💊 Detected Pharmacological Drug-Drug Interactions\n" + "\n---\n".join(table_rows)


def log_unmatched_query(query: str, user_id: str = None):
    """Log queries that had no direct KB condition match for clinical expansion"""
    db = get_database()
    db.kb_unmatched_queries.insert_one({
        "query": query,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
