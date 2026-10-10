import re
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_database
from app.utils.helpers import is_valid_object_id

def normalize_text(text: str) -> str:
    """Normalize text for fuzzy alias matching"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def seed_clinical_kb_if_empty():
    """Seed initial clinical knowledge base conditions and drug interactions"""
    db = get_database()
    
    # 1. Conditions
    if db.kb_conditions.count_documents({}) == 0:
        starter_conditions = [
            {
                "slug": "electrical-injury",
                "title": "Electrical injury (electric shock)",
                "aliases": ["electric shock", "electrocution", "electrical burn", "got shock", "current shock", "lightning strike", "electric shock lagna", "current lagna"],
                "icd10": ["T75.4"],
                "category": "emergency",
                "summary": "Injury from electric current. Severity depends on voltage, current type, duration, pathway through the body and tissue resistance. Surface burns can underestimate deep tissue damage.",
                "red_flags": [
                    "Loss of consciousness or cardiac arrest",
                    "Chest pain, palpitations or syncope",
                    "High-voltage or lightning exposure (>1000V)",
                    "Current pathway crossing the chest (hand-to-hand / hand-to-foot)",
                    "Entry and exit burns, mouth burns in children",
                    "Severe muscle pain, dark urine (myoglobinuria / rhabdomyolysis)",
                    "Neurological deficit, confusion, or focal weakness",
                    "Pregnancy",
                    "Fall or secondary blunt trauma caused by the shock"
                ],
                "differentials": [
                    {"name": "Cardiac arrhythmia (VF / VT / Asystole)", "icd10": "I49.9", "note": "Most critical early fatal complication"},
                    {"name": "Rhabdomyolysis & Acute Kidney Injury", "icd10": "M62.82", "note": "Secondary to deep muscular thermal necrosis"},
                    {"name": "Thermal or Electrical Contact Burns", "icd10": "T30.0", "note": "Entry and exit cutaneous coagulative damage"},
                    {"name": "Secondary Traumatic Fractures / Spine Injury", "icd10": "T14.8", "note": "Due to tetanic spasm or falls"}
                ],
                "workup": [
                    "Ensure electrical power source is safely disconnected before touching patient (Primary ABCD Survey)",
                    "12-Lead ECG for all significant electrical shocks; continuous telemetry if ECG abnormal, LOC, or high voltage",
                    "Serum Creatine Kinase (CK), urine myoglobin, renal function (Creatinine, BUN), and serum electrolytes",
                    "Cardiac Troponin I / T if chest pain, palpitations, or abnormal rhythm detected",
                    "Radiographs / CT for suspected spine injury, blunt trauma, or extremity fractures",
                    "Full body cutaneous inspection for entry, exit, and arc flash burn wounds"
                ],
                "management": [
                    "Immediate ACLS resuscitation protocol if in cardiac arrest / unstable ventricular arrhythmia",
                    "IV fluid resuscitation (Isotonic Crystalloid 0.9% NaCl) aiming for urine output 1-2 mL/kg/h if rhabdomyolysis suspected",
                    "Analgesia and sterile burn wound dressings; assess tetanus immunization status",
                    "Immediate obstetric consultation and continuous fetal monitoring in pregnant patients",
                    "Treat compartment syndrome with urgent surgical consult / escharotomy if indicated"
                ],
                "disposition": "Admit to telemetry/ICU for high-voltage exposure, abnormal initial ECG, documented loss of consciousness, extensive burn injury, or neurological symptoms. Low-voltage (<220V) asymptomatic household shock with completely normal examination and normal ECG may be safely discharged with warning instructions.",
                "sources": ["CareBridge Clinical Guidelines", "AHA ACLS Electrical Injury Protocol", "ABA Burn Guidelines"],
                "status": "approved",
                "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)",
                "reviewed_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            },
            {
                "slug": "acute-chest-pain",
                "title": "Acute chest pain (Cardiac & Vascular Evaluation)",
                "aliases": ["chest pain", "chest tightness", "angina", "heart attack", "pain in chest", "chest pressure", "retrosternal pain"],
                "icd10": ["R07.9"],
                "category": "cardiology",
                "summary": "Acute chest pain requires rapid triage to differentiate life-threatening cardiopulmonary emergencies (ACS, dissection, PE, tension pneumothorax) from non-emergent benign etiologies.",
                "red_flags": [
                    "Retrosternal pressure/squeezing radiating to left arm, jaw, neck, or interscapular region",
                    "Diaphoresis, nausea, vomiting, dizziness, or lightheadedness",
                    "Hypotension (SBP < 90 mmHg) or syncope",
                    "Hypoxemia with SpO2 < 94% on ambient room air",
                    "Sudden tearing chest pain radiating to back with bilateral upper extremity BP differential (>20 mmHg)",
                    "Established CAD, prior PCI/CABG, or multiple atherosclerotic risk factors",
                    "Recent prolonged immobilization, major surgery, or high-risk DVT factors"
                ],
                "differentials": [
                    {"name": "Acute Coronary Syndrome (STEMI / NSTEMI / Unstable Angina)", "icd10": "I21.9", "note": "Primary critical coronary occlusion"},
                    {"name": "Acute Pulmonary Embolism", "icd10": "I26.99", "note": "Pleuritic onset with tachycardia, hypoxemia, D-dimer elevation"},
                    {"name": "Acute Aortic Dissection", "icd10": "I71.00", "note": "Tearing back pain, pulse deficit, asymmetric BP"},
                    {"name": "Tension Pneumothorax", "icd10": "J93.0", "note": "Unilateral absent breath sounds, tracheal deviation"},
                    {"name": "Acute Pericarditis", "icd10": "I30.9", "note": "Pleuritic pain improved sitting forward, diffuse ST elevation"},
                    {"name": "Gastroesophageal Reflux Disease (GERD) / Musculoskeletal", "icd10": "K21.9", "note": "Diagnosis of exclusion"}
                ],
                "workup": [
                    "Immediate 12-lead ECG acquired and interpreted within 10 minutes of presentation; repeat serially",
                    "Serial High-Sensitivity Cardiac Troponin (hs-cTn) per 0/1-hour or 0/3-hour protocol",
                    "Continuous bedside cardiac rhythm, pulse oximetry, and bilateral non-invasive blood pressure",
                    "Portable upright Chest Radiograph (CXR)",
                    "D-dimer assay and CT Pulmonary Angiography (CTPA) if Wells score indicates intermediate/high PE probability",
                    "CT Aortogram with contrast if aortic dissection suspected; avoid anticoagulants until ruled out"
                ],
                "management": [
                    "STEMI Alert: Immediate activation of Cardiac Cath Lab for Primary Percutaneous Coronary Intervention (<90 min door-to-balloon)",
                    "Antiplatelet loading: Aspirin 300 mg chewable + P2Y12 inhibitor (Ticagrelor 180 mg or Clopidogrel 300-600 mg) per local ACS protocol",
                    "Oxygen supplementation ONLY if SpO2 < 90% (avoid hyperoxia-induced vasoconstriction)",
                    "Sublingual Nitroglycerin 0.4 mg every 5 min (max 3 doses) if SBP > 100 mmHg and no PDE5 inhibitors used",
                    "Adequate analgesia (IV Fentanyl / Morphine) with continuous vital sign monitoring"
                ],
                "disposition": "Immediate admission to Cardiac Care Unit (CCU) / Catheterization Suite for STEMI/NSTEMI or unstable hemodynamic profiles. Intermediate-risk chest pain managed in Chest Pain Observation Unit with serial biomarkers and stress testing.",
                "sources": ["ESC Guidelines on ACS", "AHA/ACC Chest Pain Guidelines", "CareBridge Cardiology Protocol"],
                "status": "approved",
                "reviewed_by": "Dr. R. Kapoor (MD, DM Cardiology)",
                "reviewed_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            },
            {
                "slug": "fever-adult",
                "title": "Fever in an adult (Sepsis & Infection Triage)",
                "aliases": ["fever", "high temperature", "pyrexia", "bukhar", "temperature", "chills", "rigors"],
                "icd10": ["R50.9"],
                "category": "infectious",
                "summary": "Fever is a cardinal physiological response. Initial clinical triage must screen for systemic sepsis, bacteremia, and endemic vector-borne infections (Dengue, Malaria, Typhoid) before symptomatic management.",
                "red_flags": [
                    "Altered mental status, lethargy, encephalopathy, or severe agitation",
                    "Meningeal irritation signs: neck stiffness, Kernig/Brudzinski signs, severe photophobia, or non-blanching petechial/purpuric rash",
                    "Sepsis screening positive (qSOFA >= 2): SBP <= 100 mmHg, Respiratory Rate >= 22/min, GCS < 15",
                    "Hypoxemia with SpO2 < 94% on room air",
                    "Immunocompromised state (Chemotherapy, HIV, Post-transplant, Systemic steroids)",
                    "Prolonged fever > 3-5 days unresponsive to antipyretics",
                    "Recent international travel or endemic outbreak exposure"
                ],
                "differentials": [
                    {"name": "Acute Viral Syndrome / Upper Respiratory Tract Infection", "icd10": "B34.9", "note": "Self-limiting viral etiology"},
                    {"name": "Dengue Fever / Dengue Hemorrhagic Fever", "icd10": "A97.9", "note": "Retro-orbital pain, myalgias, thrombocytopenia, hemoconcentration"},
                    {"name": "Malaria (P. falciparum / P. vivax)", "icd10": "B54", "note": "Cyclical fevers with rigors, splenomegaly, hemolytic anemia"},
                    {"name": "Enteric Fever (Typhoid / Paratyphoid)", "icd10": "A01.0", "note": "Step-ladder fever, relative bradycardia (Faget sign), abdominal distension"},
                    {"name": "Urinary Tract Infection / Acute Pyelonephritis", "icd10": "N39.0", "note": "Dysuria, costovertebral flank tenderness"},
                    {"name": "Community-Acquired Pneumonia (CAP)", "icd10": "J18.9", "note": "Productive cough, localized crackles, consolidation on CXR"},
                    {"name": "Systemic Sepsis / Septic Shock", "icd10": "A41.9", "note": "End-organ hypoperfusion, elevated serum lactate"}
                ],
                "workup": [
                    "Complete Blood Count (CBC) with differential, ESR, and high-sensitivity CRP",
                    "Paired peripheral blood cultures (Aerobic + Anaerobic) prior to antimicrobial administration",
                    "Urinalysis (Routine + Microscopic) and urine culture",
                    "Rapid Diagnostic Tests: Dengue NS1 Antigen / IgM, Malaria Rapid Antigen (Pf/Pv) / Peripheral Blood Smear, Widal / Typhidot",
                    "Serum Lactate, Liver Function Tests (LFT), and Renal Function Panel (Creatinine, Electrolytes)",
                    "Chest X-Ray (PA View) if cough, tachypnea, or localized crepitations are present"
                ],
                "management": [
                    "Antipyresis and comfort: Paracetamol (Acetaminophen) 500-1000 mg PO every 6 hours (max 4g/day)",
                    "CRITICAL: AVOID NSAIDs (Ibuprofen, Diclofenac, Aspirin) when Dengue is suspected until platelet stability is verified",
                    "Adequate oral and IV hydration (balanced crystalloids) matching physiological losses",
                    "Sepsis Protocol (Hour-1 Bundle): Administer broad-spectrum empiric IV antimicrobials within 60 min if sepsis criteria met",
                    "Targeted antimicrobial therapy once microbiological culture and sensitivity sensitivities return"
                ],
                "disposition": "Immediate hospital admission for patients demonstrating signs of severe sepsis, hemodynamic instability, severe Dengue warning signs (persistent vomiting, abdominal pain, mucosal bleeding, rapid platelet drop), or inability to tolerate oral intake.",
                "sources": ["Surviving Sepsis Campaign 2021", "WHO Guidelines for Vector-Borne Diseases", "CareBridge Internal Medicine Protocol"],
                "status": "approved",
                "reviewed_by": "Dr. V. Nair (MD, Infectious Diseases)",
                "reviewed_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        ]
        db.kb_conditions.insert_many(starter_conditions)

    # 2. Drug-Drug Interactions
    if db.kb_drug_interactions.count_documents({}) == 0:
        starter_interactions = [
            {
                "drug_a": "amlodipine",
                "drug_b": "metformin",
                "severity": "minor",
                "mechanism": "Calcium channel blockers can occasionally impair glucose tolerance by inhibiting insulin secretion from pancreatic beta cells, slightly attenuating metformin hypoglycemic action.",
                "effect": "Minimal effect on glycemic control in standard therapeutic doses. Rare mild elevation in fasting plasma glucose.",
                "management": "Safe to co-prescribe. Monitor routine fasting blood glucose and HbA1c as part of standard diabetes care.",
                "source": "CareBridge Clinical Pharmacology Database",
                "status": "approved",
                "reviewed_by": "Dr. K. Patel (PharmD)",
                "reviewed_at": datetime.now(timezone.utc)
            },
            {
                "drug_a": "amlodipine",
                "drug_b": "simvastatin",
                "severity": "moderate",
                "mechanism": "CYP3A4 substrate competition by amlodipine significantly increases systemic simvastatin exposure (approx. 77% increase in AUC).",
                "effect": "Elevated risk of statin-induced myopathy, severe muscle pain, and rare fatal rhabdomyolysis.",
                "management": "Limit simvastatin dose to a maximum of 20 mg daily when taken with amlodipine, or switch to Rosuvastatin / Atorvastatin which do not share this metabolic limitation.",
                "source": "FDA Safety Alerts / CareBridge Pharmacology",
                "status": "approved",
                "reviewed_by": "Dr. K. Patel (PharmD)",
                "reviewed_at": datetime.now(timezone.utc)
            },
            {
                "drug_a": "aspirin",
                "drug_b": "warfarin",
                "severity": "major",
                "mechanism": "Additive pharmacodynamic anticoagulant effect (vitamin K antagonism + platelet cyclooxygenase-1 inhibition).",
                "effect": "Significantly heightened risk of major gastrointestinal and intracerebral hemorrhage.",
                "management": "Avoid routine combination unless indicated for high-risk mechanical heart valves or post-ACS stent placement under strict INR monitoring and gastroprotective PPI co-prescription.",
                "source": "Chest Antithrombotic Guidelines",
                "status": "approved",
                "reviewed_by": "Dr. R. Kapoor (MD, DM Cardiology)",
                "reviewed_at": datetime.now(timezone.utc)
            },
            {
                "drug_a": "enalapril",
                "drug_b": "spironolactone",
                "severity": "major",
                "mechanism": "Dual blockade of the renin-angiotensin-aldosterone system with aldosterone antagonism.",
                "effect": "Potentially life-threatening hyperkalemia, especially in patients with underlying chronic renal impairment.",
                "management": "Monitor serum potassium and renal function baseline, at 1 week, 4 weeks, and quarterly thereafter. Advise low-potassium diet.",
                "source": "KDIGO / CareBridge Cardiology Protocol",
                "status": "approved",
                "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)",
                "reviewed_at": datetime.now(timezone.utc)
            },
            {
                "drug_a": "metformin",
                "drug_b": "iodinated_contrast",
                "severity": "contraindicated",
                "mechanism": "Contrast-induced acute nephropathy can precipitate toxic accumulation of metformin.",
                "effect": "Severe, potentially fatal metabolic lactic acidosis.",
                "management": "Withhold metformin 48 hours prior to contrast administration in patients with eGFR < 60 mL/min; recheck renal panel before re-initiating.",
                "source": "American College of Radiology (ACR) Contrast Manual",
                "status": "approved",
                "reviewed_by": "Dr. V. Nair (MD)",
                "reviewed_at": datetime.now(timezone.utc)
            },
            {
                "drug_a": "ciprofloxacin",
                "drug_b": "theophylline",
                "severity": "contraindicated",
                "mechanism": "Potent CYP1A2 inhibition by ciprofloxacin leads to marked reduction in hepatic clearance of theophylline.",
                "effect": "Acute theophylline toxicity: severe arrhythmias, seizures, and neurotoxicity.",
                "management": "Contraindicated. Select alternative fluoroquinolone (e.g. Levofloxacin) or alternative class of antimicrobial.",
                "source": "British National Formulary (BNF)",
                "status": "approved",
                "reviewed_by": "Dr. K. Patel (PharmD)",
                "reviewed_at": datetime.now(timezone.utc)
            }
        ]
        db.kb_drug_interactions.insert_many(starter_interactions)


def search_kb_conditions(query_text: str, limit: int = 2):
    """Search approved clinical protocols with title, alias, and keyword matching"""
    db = get_database()
    q = normalize_text(query_text)
    if not q:
        return []

    conditions = list(db.kb_conditions.find({"status": "approved"}))
    hits = []

    for cond in conditions:
        score = 0
        slug = cond.get("slug", "").lower()
        title = cond.get("title", "").lower()
        aliases = [a.lower() for a in cond.get("aliases", [])]
        summary = cond.get("summary", "").lower()

        # Direct alias match
        for alias in aliases:
            norm_alias = normalize_text(alias)
            if norm_alias and (norm_alias in q or q in norm_alias):
                score += 15
                break

        # Title match
        norm_title = normalize_text(title)
        if norm_title and (norm_title in q or q in norm_title):
            score += 10

        # Word overlap
        q_words = set(q.split())
        title_words = set(norm_title.split())
        overlap = len(q_words.intersection(title_words))
        score += overlap * 3

        if score > 0:
            hits.append((score, cond))

    hits.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in hits[:limit]]


def format_protocol_card(cond: dict) -> str:
    """Format an approved clinical protocol as a verified CareBridge Markdown Card"""
    title = cond.get("title", "Clinical Protocol")
    icd10 = ", ".join(cond.get("icd10", []))
    summary = cond.get("summary", "")
    red_flags = cond.get("red_flags", [])
    differentials = cond.get("differentials", [])
    workup = cond.get("workup", [])
    management = cond.get("management", [])
    disposition = cond.get("disposition", "")
    reviewed_by = cond.get("reviewed_by", "CareBridge Clinical Board")

    red_flags_md = "\n".join([f"- 🚨 **{flag}**" for flag in red_flags])
    
    diff_md_list = []
    for d in differentials:
        if isinstance(d, dict):
            diff_md_list.append(f"- **{d.get('name')}** (`{d.get('icd10', '')}`): {d.get('note', '')}")
        else:
            diff_md_list.append(f"- {d}")
    diff_md = "\n".join(diff_md_list)

    workup_md = "\n".join([f"- 🔬 {w}" for w in workup])
    mgmt_md = "\n".join([f"- 💊 {m}" for m in management])

    return f"""### 🛡️ CareBridge Protocol: {title} {f'`{icd10}`' if icd10 else ''}
> ✅ **Verified Clinical Guideline** · Reviewed by *{reviewed_by}*

{summary}

#### ⚠️ Urgent Red Flags & Immediate Actions
{red_flags_md}

#### 🩺 Differential Diagnoses
{diff_md}

#### 🔬 Recommended Diagnostic Workup
{workup_md}

#### 📋 Clinical Management Plan
{mgmt_md}

#### 🏥 Disposition & Admission Criteria
**{disposition}**"""


def check_drug_interactions(query_text: str):
    """Detect drug mentions in user query and check knowledge base for interactions"""
    db = get_database()
    q = normalize_text(query_text)
    
    # Common drugs dictionary
    known_drugs = [
        "amlodipine", "metformin", "simvastatin", "atorvastatin", "rosuvastatin",
        "aspirin", "warfarin", "clopidogrel", "ticagrelor", "enalapril", "ramipril",
        "lisinopril", "losartan", "telmisartan", "spironolactone", "furosemide",
        "paracetamol", "acetaminophen", "ibuprofen", "diclofenac", "naproxen",
        "ciprofloxacin", "levofloxacin", "azithromycin", "theophylline",
        "pantoprazole", "omeprazole", "iodinated_contrast", "contrast"
    ]
    
    detected = []
    for drug in known_drugs:
        if re.search(r"\b" + re.escape(drug) + r"\b", q):
            detected.append(drug)
            
    if "contrast" in detected and "iodinated_contrast" not in detected:
        detected.append("iodinated_contrast")

    if len(detected) < 2:
        return None

    # Query DB
    interactions = list(db.kb_drug_interactions.find({
        "status": "approved",
        "drug_a": {"$in": detected},
        "drug_b": {"$in": detected}
    }))

    if not interactions:
        return None

    severity_badges = {
        "minor": ("🟢", "Minor Interaction (Low Risk)"),
        "moderate": ("🟡", "Moderate Interaction (Caution & Monitoring Required)"),
        "major": ("🔴", "Major Interaction (High Clinical Risk)"),
        "contraindicated": ("⛔", "Contraindicated (Avoid Co-Prescription)")
    }

    table_rows = []
    for inter in interactions:
        sev = inter.get("severity", "moderate").lower()
        badge_icon, badge_text = severity_badges.get(sev, ("🟡", "Moderate"))
        pair = f"{inter.get('drug_a', '').title()} + {inter.get('drug_b', '').title()}"
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

    result_md = "### 💊 Detected Pharmacological Drug-Drug Interactions\n" + "\n---\n".join(table_rows)
    return result_md


def log_unmatched_query(query: str, user_id: str = None):
    """Log queries that had no direct KB condition match for clinical expansion"""
    db = get_database()
    db.kb_unmatched_queries.insert_one({
        "query": query,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
