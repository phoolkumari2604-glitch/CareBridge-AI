"""
Master Builder for CareBridge MedAI Health Knowledge Base.
Generates all 23 clinical dataset JSON files and synchronizes them to:
  - data/health_knowledge/
  - backend/data/health_knowledge/
"""

import os
import sys
import json

# Ensure scripts folder is on PYTHONPATH
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import generate_all_kb_files
import kb_infectious
import kb_chronic
import kb_specialties
import kb_medicines
import kb_interactions
import kb_labs
import kb_vitals_app
import kb_vaccinations
import kb_nutrition
import kb_womens_health
import kb_child_elderly
import kb_mental_skin
import kb_sexual_lifestyle
import kb_proc_faq_glossary

def build_all_knowledge_base():
    out_dirs = [
        os.path.join(PROJECT_ROOT, "data", "health_knowledge"),
        os.path.join(PROJECT_ROOT, "backend", "data", "health_knowledge")
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    datasets = {
        "emergencies.json": generate_all_kb_files.get_emergencies(),
        "symptoms.json": generate_all_kb_files.get_symptoms(),
        "infectious_diseases.json": kb_infectious.get_infectious_diseases(),
        "chronic_conditions.json": kb_chronic.get_chronic_conditions(),
        "specialties.json": kb_specialties.get_specialties(),
        "medicines.json": kb_medicines.get_medicines(),
        "drug_interactions.json": kb_interactions.get_drug_interactions(),
        "lab_tests.json": kb_labs.get_lab_tests(),
        "vitals_ranges.json": kb_vitals_app.get_vitals_ranges(),
        "app_intents.json": kb_vitals_app.get_app_intents(),
        "vaccinations.json": kb_vaccinations.get_vaccinations(),
        "nutrition.json": kb_nutrition.get_nutrition(),
        "womens_health.json": kb_womens_health.get_womens_health(),
        "child_health.json": kb_child_elderly.get_child_health(),
        "elderly_care.json": kb_child_elderly.get_elderly_care(),
        "mental_health.json": kb_mental_skin.get_mental_health(),
        "skin_eye_ent_dental.json": kb_mental_skin.get_skin_eye_ent_dental(),
        "sexual_reproductive_health.json": kb_sexual_lifestyle.get_sexual_health(),
        "lifestyle.json": kb_sexual_lifestyle.get_lifestyle(),
        "procedures_and_prep.json": kb_proc_faq_glossary.get_procedures_and_prep(),
        "hospital_faq.json": kb_proc_faq_glossary.get_hospital_faq(),
        "medical_glossary.json": kb_proc_faq_glossary.get_medical_glossary(),
        "symptom_synonyms.json": kb_proc_faq_glossary.get_symptom_synonyms()
    }

    print("=" * 75)
    print(" CareBridge MedAI Health Knowledge Base Master Builder")
    print("=" * 75)
    total_entries = 0

    for filename, data in datasets.items():
        count = len(data) if isinstance(data, (list, dict)) else 1
        total_entries += count
        for d in out_dirs:
            target_path = os.path.join(d, filename)
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  [OK] {filename:<32} -> {count:>4} items saved")

    print("-" * 75)
    print(f"Total Files Generated: {len(datasets)}")
    print(f"Total Knowledge Items: {total_entries}")
    print(f"Target Locations: {[os.path.relpath(d, PROJECT_ROOT) for d in out_dirs]}")
    print("=" * 75)

if __name__ == "__main__":
    build_all_knowledge_base()
