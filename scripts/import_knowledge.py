"""
CareBridge Clinical Knowledge Base Import CLI Tool
Supports batch importing guidelines, medicines, and laboratory standards from:
1. MedlinePlus Health Topics
2. WHO Model List of Essential Medicines (EML)
3. LOINC (Logical Observation Identifiers Names and Codes) Clinical Lab Panels

Imports are validated against the CareBridge schema and saved as review_status="draft"
to ensure senior clinician peer review prior to clinical deployment.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
KB_DIR = os.path.join(PROJECT_ROOT, "backend", "data", "health_knowledge")

SCHEMA_REQUIRED_FIELDS = [
    "id", "topic", "category", "keywords", "intent",
    "patient_answer", "doctor_answer", "source"
]

def validate_entry(entry: dict) -> tuple[bool, str]:
    if not isinstance(entry, dict):
        return False, "Entry is not a dictionary"
    for field in SCHEMA_REQUIRED_FIELDS:
        if field not in entry:
            return False, f"Missing required field: '{field}'"
    if not isinstance(entry.get("keywords"), list):
        return False, "'keywords' must be a list of strings"
    if not isinstance(entry.get("patient_answer"), (list, str)):
        return False, "'patient_answer' must be a list of strings or string"
    if not isinstance(entry.get("doctor_answer"), dict):
        return False, "'doctor_answer' must be an object with assessment, investigations, management"
    return True, "Valid"

def import_json_file(file_path: str, target_category: str = None) -> int:
    if not os.path.exists(file_path):
        print(f"[Error] Source file not found: {file_path}")
        return 0

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = data if isinstance(data, list) else [data]
    valid_entries = []

    for idx, e in enumerate(entries):
        # Force default review_status = 'draft' for safety
        e["review_status"] = "draft"
        e["reviewed_by"] = None
        e["imported_at"] = datetime.now(timezone.utc).isoformat()
        if target_category:
            e["category"] = target_category

        ok, msg = validate_entry(e)
        if not ok:
            print(f"  [Warning] Skipping entry #{idx+1} ({e.get('id', 'unknown')}): {msg}")
            continue
        valid_entries.append(e)

    if not valid_entries:
        print("[Notice] No valid entries found to import.")
        return 0

    # Determine destination category file
    cat = target_category or valid_entries[0].get("category", "symptoms")
    target_filename = f"{cat}.json"
    target_path = os.path.join(KB_DIR, target_filename)

    existing = []
    if os.path.exists(target_path):
        with open(target_path, "r", encoding="utf-8") as f:
            existing = json.load(f)

    # Upsert by ID
    existing_map = {item.get("id"): item for item in existing}
    inserted = 0
    updated = 0
    for ve in valid_entries:
        eid = ve["id"]
        if eid in existing_map:
            existing_map[eid].update(ve)
            updated += 1
        else:
            existing_map[eid] = ve
            inserted += 1

    final_list = list(existing_map.values())

    # Write back to backend and data root
    out_dirs = [
        KB_DIR,
        os.path.join(PROJECT_ROOT, "data", "health_knowledge")
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, target_filename), "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"[Success] Imported {len(valid_entries)} entries into {target_filename} ({inserted} new, {updated} updated). All marked as 'draft'.")
    return len(valid_entries)

def generate_sample_templates():
    samples = {
        "medlineplus_sample.json": [
            {
                "id": "medlineplus_gout_sample_001",
                "topic": "Gout (Acute Gouty Arthritis)",
                "category": "chronic_conditions",
                "keywords": ["gout", "high uric acid", "big toe pain", "urate crystals", "gathiya"],
                "intent": "chronic_care_management",
                "patient_answer": [
                    "Rest and elevate the affected painful joint (most commonly the big toe).",
                    "Apply an ice pack wrapped in a towel for 20 minutes at a time to reduce swelling.",
                    "Drink at least 2 to 3 liters of water daily to help your kidneys flush out excess uric acid.",
                    "Avoid purine-rich foods during flare-ups: red meat, organ meats (liver/kidneys), seafood, beer, and high-fructose corn syrup.",
                    "Consult your doctor for prescribed anti-inflammatory medication (like Colchicine or NSAIDs)."
                ],
                "doctor_answer": {
                    "assessment": "Acute Gout Flare secondary to hyperuricemia and intra-articular monosodium urate (MSU) crystal deposition.",
                    "investigations": "Synovial fluid analysis (polarizing microscopy for negatively birefringent needle-shaped crystals). Serum Uric Acid (note: may be transiently normal during acute flare), Renal panel.",
                    "management": "First-line acute flare therapy: oral NSAIDs (e.g. Naproxen), Colchicine (1.2 mg STAT then 0.6 mg 1h later), or oral Prednisolone 30-35 mg/day. Initiate or titrate Urate-Lowering Therapy (Allopurinol / Febuxostat) with anti-inflammatory flare prophylaxis target uric acid <6.0 mg/dL.",
                    "references": ["2020 American College of Rheumatology (ACR) Guideline for Management of Gout", "MedlinePlus: Gout (https://medlineplus.gov/gout.html)"]
                },
                "staff_answer": "Assess pain score and swelling in distal extremity. Apply cold pack and confirm absence of open skin infection over the joint. Provide water.",
                "red_flags": ["High fever with red, hot, swollen joint (must rule out septic arthritis immediately)", "Severe renal impairment with inability to excrete uric acid"],
                "follow_up_questions": ["Is this your first sudden attack?", "Which specific joints are red and swollen?", "Do you take any medications like water pills (diuretics)?"],
                "avoid": ["Do NOT consume alcohol or beer during acute attack", "Do NOT start high-dose Allopurinol without flare prophylaxis"],
                "source": "NIH MedlinePlus (https://medlineplus.gov/gout.html) & ACR Guidelines",
                "review_status": "draft",
                "reviewed_by": None
            }
        ],
        "who_eml_sample.json": [
            {
                "id": "who_eml_amoxicillin_sample_002",
                "topic": "Amoxicillin (Access Antibiotic Group)",
                "category": "medicines",
                "keywords": ["amoxicillin", "amox", "mox", "broad spectrum penicillin", "amoxicillin capsule"],
                "intent": "medicine_information",
                "patient_answer": [
                    "Amoxicillin is an antibacterial prescription medicine used to treat common bacterial infections (such as throat, ear, or chest infections).",
                    "Take with or after food with a full glass of water at evenly spaced intervals as prescribed.",
                    "Finish the ENTIRE course prescribed by your physician, even if you feel better after a few days, to prevent antibiotic resistance.",
                    "Inform your doctor immediately if you develop skin rash, itching, lip swelling, or difficulty breathing (signs of penicillin allergy)."
                ],
                "doctor_answer": {
                    "assessment": "Moderate-spectrum bactericidal aminopenicillin (WHO AWaRe 'Access' Group). Inhibits bacterial cell wall synthesis.",
                    "investigations": "Verify absence of penicillin or beta-lactam hypersensitivity. Culture & sensitivity testing when indicated.",
                    "management": "Adult dosage: 500 mg PO TID or 875-1000 mg PO BID depending on severity. Pediatric: 25-50 mg/kg/day in divided doses. Dose reduce in severe renal insufficiency (eGFR <30 mL/min).",
                    "references": ["WHO Model List of Essential Medicines (23rd List, 2023)", "WHO AWaRe Antibiotic Categorization"]
                },
                "staff_answer": "Confirm patient allergy history for penicillins before administration. Observe for 30 minutes following first dose for hypersensitivity.",
                "red_flags": ["Severe anaphylactic shock (angioedema, stridor, hypotension)", "Severe watery diarrhea containing blood or mucus (Clostridioides difficile colitis)"],
                "follow_up_questions": ["Have you ever had an allergic reaction to penicillin or augmentin?", "Are you currently pregnant or nursing?"],
                "avoid": ["Do NOT use for viral colds, flu, or simple viral coughs", "Do NOT discontinue early when symptoms ease"],
                "source": "WHO Model List of Essential Medicines (WHO EML) & AWaRe Classification",
                "review_status": "draft",
                "reviewed_by": None
            }
        ],
        "loinc_sample.json": [
            {
                "id": "loinc_fasting_glucose_sample_003",
                "topic": "Fasting Plasma Glucose (LOINC: 1558-6)",
                "category": "lab_tests",
                "keywords": ["fasting blood glucose", "loinc 1558 6", "fbs test", "fasting sugar test", "blood sugar khali pet"],
                "intent": "lab_test_interpretation",
                "patient_answer": [
                    "Measures blood sugar concentration after an overnight fast of 8 to 12 hours.",
                    "Normal fasting range: 70 to 99 mg/dL (3.9 to 5.5 mmol/L).",
                    "Prediabetes (Impaired Fasting Glucose): 100 to 125 mg/dL.",
                    "Diabetes threshold: 126 mg/dL (7.0 mmol/L) or higher on two separate test occasions.",
                    "Plain drinking water is permitted during fasting; do not drink tea, coffee, milk, or juices."
                ],
                "doctor_answer": {
                    "assessment": "Diagnostic threshold for impaired fasting glucose and diabetes mellitus (LOINC: 1558-6: Fasting glucose in plasma).",
                    "investigations": "Fasting Plasma Glucose (FBS), HbA1c (LOINC: 4548-4), 75g 2-hour Oral Glucose Tolerance Test (OGTT), Lipid Profile.",
                    "management": "If FBS >= 126 mg/dL confirmed: initiate lifestyle modification (diet, exercise) and evaluate eligibility for Metformin per ADA Standards of Care.",
                    "references": ["American Diabetes Association (ADA) Standards of Care in Diabetes", "LOINC Standard: 1558-6 Fasting Glucose"]
                },
                "staff_answer": "Verify patient fasting status (>=8 hours). Collect venous sample in sodium fluoride / potassium oxalate (grey-top tube) to prevent in vitro glycolysis.",
                "red_flags": ["FBS > 300 mg/dL with ketones or altered sensorium (suspect DKA / HHS)", "FBS < 60 mg/dL with neuroglycopenia (shakiness, diaphoresis - give 15g fast carbs)"],
                "follow_up_questions": ["How many hours did you fast before having your blood drawn?", "Do you have family history of diabetes?"],
                "avoid": ["Do NOT exercise vigorously immediately before the blood draw", "Do NOT chew gum or smoke during the fasting window"],
                "source": "LOINC Standards (Regenstrief Institute) & ADA Standards of Care",
                "review_status": "draft",
                "reviewed_by": None
            }
        ]
    }

    sample_dir = os.path.join(CURRENT_DIR, "import_samples")
    os.makedirs(sample_dir, exist_ok=True)
    for fname, content in samples.items():
        p = os.path.join(sample_dir, fname)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        print(f"  [Created] {p}")

def main():
    parser = argparse.ArgumentParser(description="CareBridge Clinical Knowledge Base Import Tool")
    parser.add_argument("--file", type=str, help="Path to JSON file containing clinical entries")
    parser.add_argument("--category", type=str, help="Target category (e.g., chronic_conditions, medicines, lab_tests)")
    parser.add_argument("--sample", action="store_true", help="Generate sample import template JSON files")

    args = parser.parse_args()

    if args.sample:
        print("[Generating] Sample import templates for MedlinePlus, WHO EML, and LOINC...")
        generate_sample_templates()
        return

    if args.file:
        import_json_file(args.file, args.category)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
