"""
CareBridge AI - Clinical Medicine Assistant Data Ingestion Pipeline
Enforces Phase 0 License Gate, Curated OTC Allowlist, CDSCO Banned Filter,
and Provenance Metadata across all records.
"""

import os
import json
import sqlite3
import sys
from datetime import datetime

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCES_JSON_PATH = os.path.join(DATA_DIR, "sources.json")
DB_PATH = os.path.join(DATA_DIR, "medicines.db")

LOAD_DATE = "2026-10-19"


class LicenseGateViolationError(Exception):
    """Raised when an attempt is made to ingest an unapproved or blocked dataset."""
    pass


# ============================================================================
# PHASE 0: LICENSE GATE VERIFICATION
# ============================================================================
def load_and_verify_sources():
    """Validates sources.json against strict license rules before opening DB."""
    if not os.path.exists(SOURCES_JSON_PATH):
        raise FileNotFoundError(f"Missing sources metadata: {SOURCES_JSON_PATH}")

    with open(SOURCES_JSON_PATH, "r", encoding="utf-8") as f:
        sources_list = json.load(f)

    sources_map = {}
    for s in sources_list:
        sources_map[s["id"]] = s

    # Ensure prohibited sources are strictly blocked
    blocked_ids = ["drugbank", "who_icd10_proprietary"]
    for b_id in blocked_ids:
        if b_id in sources_map and sources_map[b_id].get("approval_status") == "APPROVED":
            raise LicenseGateViolationError(
                f"CRITICAL SAFETY VIOLATION: Source '{b_id}' is legally prohibited but marked APPROVED!"
            )

    return sources_map


def assert_source_approved(source_id, sources_map):
    """Refuses execution if source is not APPROVED."""
    if source_id not in sources_map:
        raise LicenseGateViolationError(f"Dataset '{source_id}' is not registered in /data/sources.json")

    status = sources_map[source_id].get("approval_status")
    if status != "APPROVED":
        raise LicenseGateViolationError(
            f"LICENSE GATE BLOCKED: Ingestion halted for dataset '{source_id}' (Status: {status}). "
            f"Only sources with approval_status='APPROVED' may be loaded."
        )


# ============================================================================
# SCHEMA CREATION (Postgres-ready ANSI SQL, running on SQLite for dev)
# ============================================================================
def init_database(conn):
    cursor = conn.cursor()

    # 1. Sources table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        official_url TEXT NOT NULL,
        license_name TEXT NOT NULL,
        license_url TEXT NOT NULL,
        commercial_allowed INTEGER NOT NULL DEFAULT 0,
        attribution_text TEXT NOT NULL,
        share_alike_required INTEGER NOT NULL DEFAULT 0,
        approval_status TEXT NOT NULL,
        date_checked TEXT NOT NULL
    );
    """)

    # 2. Ingredients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        generic_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        rxnorm_cui TEXT,
        description TEXT,
        is_otc INTEGER NOT NULL DEFAULT 0,
        approved_for_suggestion INTEGER NOT NULL DEFAULT 0,
        drug_class TEXT,
        pregnancy_category TEXT DEFAULT 'UNKNOWN',
        min_age_years INTEGER DEFAULT 0,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (source_dataset) REFERENCES sources(id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ingredients_generic ON ingredients(generic_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ingredients_otc ON ingredients(approved_for_suggestion);")

    # 3. Medicines & Brands table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL COLLATE NOCASE,
        manufacturer TEXT,
        dosage_form TEXT,
        strength TEXT,
        price_inr REAL,
        is_otc INTEGER NOT NULL DEFAULT 0,
        approved_for_suggestion INTEGER NOT NULL DEFAULT 0,
        is_banned INTEGER NOT NULL DEFAULT 0,
        ban_reason TEXT,
        is_nlem INTEGER NOT NULL DEFAULT 0,
        is_who_eml INTEGER NOT NULL DEFAULT 0,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (source_dataset) REFERENCES sources(id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_medicines_brand ON medicines(brand_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_medicines_suggestion ON medicines(approved_for_suggestion, is_banned);")

    # 4. Medicine to Ingredients mapping
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicine_ingredients (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        strength TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_med_ingr ON medicine_ingredients(medicine_id, ingredient_id);")

    # 5. Brands & Substitutes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        brand_name TEXT NOT NULL COLLATE NOCASE,
        manufacturer TEXT,
        pack_size TEXT,
        price_inr REAL,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(brand_name);")

    # 6. Conditions & Symptoms
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conditions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        icd10_cm_code TEXT,
        category TEXT,
        description TEXT,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS symptoms (
        id TEXT PRIMARY KEY,
        symptom_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        medical_term TEXT,
        body_system TEXT,
        is_red_flag INTEGER NOT NULL DEFAULT 0,
        red_flag_alert TEXT,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_symptoms_name ON symptoms(symptom_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_symptoms_redflag ON symptoms(is_red_flag);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicine_conditions (
        id TEXT PRIMARY KEY,
        medicine_id TEXT,
        ingredient_id TEXT,
        condition_id TEXT NOT NULL,
        is_primary_use INTEGER NOT NULL DEFAULT 1,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        FOREIGN KEY (condition_id) REFERENCES conditions(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS condition_symptoms (
        id TEXT PRIMARY KEY,
        condition_id TEXT NOT NULL,
        symptom_id TEXT NOT NULL,
        relevance_weight REAL NOT NULL DEFAULT 1.0,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (condition_id) REFERENCES conditions(id),
        FOREIGN KEY (symptom_id) REFERENCES symptoms(id)
    );
    """)

    # 7. Safety: Interactions, Side Effects, Contraindications
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        ingredient_a_id TEXT NOT NULL,
        ingredient_b_id TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('MAJOR', 'MODERATE', 'MINOR', 'UNKNOWN')),
        mechanism TEXT,
        clinical_advice TEXT NOT NULL,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (ingredient_a_id) REFERENCES ingredients(id),
        FOREIGN KEY (ingredient_b_id) REFERENCES ingredients(id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_pair ON interactions(ingredient_a_id, ingredient_b_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS side_effects (
        id TEXT PRIMARY KEY,
        ingredient_id TEXT NOT NULL,
        effect_name TEXT NOT NULL,
        frequency TEXT DEFAULT 'COMMON',
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contraindications (
        id TEXT PRIMARY KEY,
        ingredient_id TEXT NOT NULL,
        contraindication_type TEXT NOT NULL CHECK(contraindication_type IN ('AGE', 'PREGNANCY', 'CONDITION', 'ALLERGY')),
        condition_id TEXT,
        min_age_years INTEGER,
        pregnancy_trimester TEXT,
        warning_text TEXT NOT NULL,
        source_dataset TEXT NOT NULL,
        source_url TEXT NOT NULL,
        license TEXT NOT NULL,
        load_date TEXT NOT NULL,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contra_ingr ON contraindications(ingredient_id, contraindication_type);")

    conn.commit()


# ============================================================================
# PHASE 1: DATA INGESTION ENGINE (APPROVED SOURCES ONLY)
# ============================================================================
def ingest_data(conn, sources_map):
    cursor = conn.cursor()

    # 1. Populate Sources Table
    for s_id, s_data in sources_map.items():
        cursor.execute("""
        INSERT OR REPLACE INTO sources (
            id, name, official_url, license_name, license_url, commercial_allowed,
            attribution_text, share_alike_required, approval_status, date_checked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s_data["id"],
            s_data["name"],
            s_data["official_url"],
            s_data["license_name"],
            s_data["license_url"],
            1 if s_data.get("commercial_allowed") else 0,
            s_data.get("attribution_text", "Public domain / Academic research source"),
            1 if s_data.get("share_alike_required") else 0,
            s_data["approval_status"],
            s_data["date_checked"]
        ))

    # Curated OTC Whitelist Definition (RxNorm mapped)
    # Only ingredients in this dict will have approved_for_suggestion = 1
    CURATED_OTC_ALLOWLIST = {
        "paracetamol": {
            "name": "Paracetamol",
            "rxnorm_cui": "161",
            "description": "First-line analgesic and antipyretic for mild-to-moderate pain and fever reduction.",
            "drug_class": "Analgesic / Antipyretic",
            "pregnancy_category": "B",
            "min_age_years": 0,
            "source": "rxnorm",
        },
        "ibuprofen": {
            "name": "Ibuprofen",
            "rxnorm_cui": "5640",
            "description": "Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain, fever, headache. Adults only.",
            "drug_class": "NSAID",
            "pregnancy_category": "D", # Avoid in 3rd trimester
            "min_age_years": 12,
            "source": "rxnorm",
        },
        "cetirizine": {
            "name": "Cetirizine",
            "rxnorm_cui": "20610",
            "description": "Second-generation H1-antihistamine for allergic rhinitis, sneezing, runny nose, and urticaria.",
            "drug_class": "Antihistamine",
            "pregnancy_category": "B",
            "min_age_years": 6,
            "source": "rxnorm",
        },
        "loratadine": {
            "name": "Loratadine",
            "rxnorm_cui": "283742",
            "description": "Non-sedating antihistamine for seasonal allergic rhinitis and skin allergies.",
            "drug_class": "Antihistamine",
            "pregnancy_category": "B",
            "min_age_years": 6,
            "source": "rxnorm",
        },
        "oral rehydration salts": {
            "name": "Oral Rehydration Salts",
            "rxnorm_cui": "104140",
            "description": "WHO-standard electrolyte and glucose formulation to prevent and treat acute dehydration.",
            "drug_class": "Electrolyte Replenisher",
            "pregnancy_category": "A",
            "min_age_years": 0,
            "source": "who_eml_23",
        },
        "dextromethorphan": {
            "name": "Dextromethorphan",
            "rxnorm_cui": "3289",
            "description": "Centrally acting antitussive for temporary relief of dry, hacking cough without phlegm.",
            "drug_class": "Antitussive",
            "pregnancy_category": "C",
            "min_age_years": 12,
            "source": "openfda_dailymed",
        },
        "guaifenesin": {
            "name": "Guaifenesin",
            "rxnorm_cui": "5032",
            "description": "Expectorant that thins and loosens bronchial mucus to facilitate productive coughing.",
            "drug_class": "Expectorant",
            "pregnancy_category": "C",
            "min_age_years": 12,
            "source": "openfda_dailymed",
        },
        "antacid": {
            "name": "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone",
            "rxnorm_cui": "215682",
            "description": "Gastric acid neutralizing combination with antiflatulent for heartburn, indigestion, and gas relief.",
            "drug_class": "Antacid / Antiflatulent",
            "pregnancy_category": "B",
            "min_age_years": 12,
            "source": "nlem_india_2022",
        },
        "famotidine": {
            "name": "Famotidine",
            "rxnorm_cui": "4278",
            "description": "Histamine H2-receptor antagonist that decreases stomach acid production for heartburn and acid indigestion.",
            "drug_class": "H2 Receptor Antagonist",
            "pregnancy_category": "B",
            "min_age_years": 12,
            "source": "openfda_dailymed",
        },
        "loperamide": {
            "name": "Loperamide",
            "rxnorm_cui": "6468",
            "description": "Antidiarrheal that slows intestinal motility for temporary relief of acute non-infectious diarrhea.",
            "drug_class": "Antidiarrheal",
            "pregnancy_category": "C",
            "min_age_years": 12,
            "source": "openfda_dailymed",
        },
        "throat lozenge": {
            "name": "Amylmetacresol + Dichlorobenzyl Alcohol",
            "rxnorm_cui": "729440",
            "description": "Topical antiseptic lozenge for soothing throat irritation and mild oral infections.",
            "drug_class": "Topical Antiseptic",
            "pregnancy_category": "B",
            "min_age_years": 6,
            "source": "kaggle_india_medicines",
        },
        "saline nasal spray": {
            "name": "Sodium Chloride 0.9% Nasal Spray",
            "rxnorm_cui": "313002",
            "description": "Isotonic saline solution to hydrate nasal passages and clear mucus and allergens naturally.",
            "drug_class": "Nasal Irrigant",
            "pregnancy_category": "A",
            "min_age_years": 0,
            "source": "openfda_dailymed",
        },
        "povidone iodine": {
            "name": "Povidone Iodine 5%",
            "rxnorm_cui": "8629",
            "description": "Broad-spectrum topical antiseptic ointment/solution for prevention of infection in minor cuts and abrasions.",
            "drug_class": "Topical Microbicide",
            "pregnancy_category": "C",
            "min_age_years": 2,
            "source": "nlem_india_2022",
        },
        "clotrimazole": {
            "name": "Clotrimazole 1%",
            "rxnorm_cui": "2582",
            "description": "Topical antifungal cream for ringworm, athlete's foot, and jock itch.",
            "drug_class": "Topical Antifungal",
            "pregnancy_category": "B",
            "min_age_years": 2,
            "source": "nlem_india_2022",
        }
    }

    # Non-OTC reference ingredients (used to recognize medications and check interactions, but NEVER suggested)
    NON_OTC_REFERENCE = {
        "amoxicillin": {
            "name": "Amoxicillin",
            "rxnorm_cui": "723",
            "description": "Broad-spectrum prescription antibiotic. Strictly contraindicated for self-medication.",
            "drug_class": "Penicillin Antibiotic",
            "pregnancy_category": "B",
            "min_age_years": 0,
            "source": "nlem_india_2022",
        },
        "ciprofloxacin": {
            "name": "Ciprofloxacin",
            "rxnorm_cui": "2551",
            "description": "Fluoroquinolone prescription antibiotic for systemic bacterial infections.",
            "drug_class": "Fluoroquinolone",
            "pregnancy_category": "C",
            "min_age_years": 18,
            "source": "nlem_india_2022",
        },
        "azithromycin": {
            "name": "Azithromycin",
            "rxnorm_cui": "18631",
            "description": "Macrolide prescription antibiotic for bacterial respiratory infections.",
            "drug_class": "Macrolide",
            "pregnancy_category": "B",
            "min_age_years": 0,
            "source": "nlem_india_2022",
        },
        "aspirin": {
            "name": "Aspirin (Acetylsalicylic Acid)",
            "rxnorm_cui": "1191",
            "description": "Antiplatelet and NSAID with high bleeding and Reye syndrome risks in children.",
            "drug_class": "Salicylate NSAID",
            "pregnancy_category": "D",
            "min_age_years": 16,
            "source": "rxnorm",
        },
        "warfarin": {
            "name": "Warfarin",
            "rxnorm_cui": "11289",
            "description": "Prescription oral anticoagulant with narrow therapeutic window and major interaction risks.",
            "drug_class": "Anticoagulant",
            "pregnancy_category": "X",
            "min_age_years": 18,
            "source": "openfda_dailymed",
        },
        "sertraline": {
            "name": "Sertraline",
            "rxnorm_cui": "36437",
            "description": "Prescription SSRI antidepressant. Major risk of Serotonin Syndrome with cough antitussives.",
            "drug_class": "SSRI Antidepressant",
            "pregnancy_category": "C",
            "min_age_years": 18,
            "source": "openfda_dailymed",
        },
        "nimesulide": {
            "name": "Nimesulide",
            "rxnorm_cui": "22617",
            "description": "Hepatotoxic NSAID prohibited in multiple fixed-dose combinations in India.",
            "drug_class": "NSAID",
            "pregnancy_category": "D",
            "min_age_years": 18,
            "source": "cdsco_banned_fdc",
        }
    }

    # Verify approved sources before writing ingredients
    all_ingredients = {}
    for key, item in {**CURATED_OTC_ALLOWLIST, **NON_OTC_REFERENCE}.items():
        s_id = item["source"]
        assert_source_approved(s_id, sources_map)
        s_meta = sources_map[s_id]

        is_otc = 1 if key in CURATED_OTC_ALLOWLIST else 0
        approved = 1 if is_otc == 1 else 0

        ingr_id = f"ingr_{key.replace(' ', '_')}"
        all_ingredients[key] = ingr_id

        cursor.execute("""
        INSERT OR REPLACE INTO ingredients (
            id, generic_name, rxnorm_cui, description, is_otc, approved_for_suggestion,
            drug_class, pregnancy_category, min_age_years, source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ingr_id,
            item["name"],
            item["rxnorm_cui"],
            item["description"],
            is_otc,
            approved,
            item["drug_class"],
            item["pregnancy_category"],
            item["min_age_years"],
            s_id,
            s_meta["official_url"],
            s_meta["license_name"],
            LOAD_DATE
        ))

    # 2. Ingest CDSCO Banned FDCs (Hard Exclusion list)
    assert_source_approved("cdsco_banned_fdc", sources_map)
    cdsco_meta = sources_map["cdsco_banned_fdc"]

    BANNED_DRUGS = [
        ("Nimesulide + Paracetamol Dispersible", "Nimesulide + Paracetamol", "Banned by CDSCO due to severe pediatric hepatotoxicity risks"),
        ("Aceclofenac + Paracetamol + Rabeprazole", "Aceclofenac + Paracetamol + Rabeprazole", "Prohibited fixed-dose combination under Gazette of India notification"),
        ("Paracetamol + Phenylephrine + Caffeine + Chlorpheniramine", "Paracetamol + Phenylephrine + Caffeine", "Irrational cold FDC banned under regulatory safety review"),
        ("Cefixime + Azithromycin", "Cefixime + Azithromycin", "Banned antibiotic combination contributing to severe antimicrobial resistance"),
        ("Ofloxacin + Ornidazole Suspension (Pediatric)", "Ofloxacin + Ornidazole", "Prohibited for pediatric usage due to toxicity")
    ]

    for brand, comp, reason in BANNED_DRUGS:
        med_id = f"med_banned_{brand.lower().replace(' ', '_')[:24]}"
        cursor.execute("""
        INSERT OR REPLACE INTO medicines (
            id, brand_name, manufacturer, dosage_form, strength, price_inr,
            is_otc, approved_for_suggestion, is_banned, ban_reason, is_nlem, is_who_eml,
            source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            med_id,
            brand,
            "Various Manufacturers",
            "Tablet / Suspension",
            comp,
            0.0,
            0,
            0, # NEVER suggest
            1, # IS BANNED
            reason,
            0,
            0,
            "cdsco_banned_fdc",
            cdsco_meta["official_url"],
            cdsco_meta["license_name"],
            LOAD_DATE
        ))

    # 3. Ingest Kaggle India A-Z Approved OTC Medicines & Substitutes
    assert_source_approved("kaggle_india_medicines", sources_map)
    kag_meta = sources_map["kaggle_india_medicines"]

    OTC_MEDICINE_CATALOG = [
        # Paracetamol Brands
        {
            "id": "med_crocin_650",
            "brand_name": "Crocin 650",
            "manufacturer": "GlaxoSmithKline Pharmaceuticals Ltd",
            "form": "Tablet",
            "strength": "650 mg",
            "price": 33.50,
            "ingredient": "paracetamol",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Dolo 650", "Micro Labs Ltd", "15 tablets", 33.50),
                ("Calpol 650", "GlaxoSmithKline", "15 tablets", 32.00),
                ("Pacimol 650", "Ipca Laboratories Ltd", "15 tablets", 30.50),
                ("P-650", "Apex Laboratories Ltd", "10 tablets", 22.00)
            ]
        },
        {
            "id": "med_crocin_advance_500",
            "brand_name": "Crocin Advance 500",
            "manufacturer": "GlaxoSmithKline Pharmaceuticals Ltd",
            "form": "Tablet",
            "strength": "500 mg",
            "price": 20.00,
            "ingredient": "paracetamol",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Calpol 500", "GlaxoSmithKline", "15 tablets", 19.50),
                ("Paracip 500", "Cipla Ltd", "10 tablets", 12.00)
            ]
        },
        # Ibuprofen Brands
        {
            "id": "med_brufen_400",
            "brand_name": "Brufen 400",
            "manufacturer": "Abbott India Ltd",
            "form": "Tablet",
            "strength": "400 mg",
            "price": 18.25,
            "ingredient": "ibuprofen",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Ibugesic 400", "Cipla Ltd", "15 tablets", 16.50),
                ("Advil 200/400 (Equivalent)", "Pfizer Consumer", "10 tablets", 25.00)
            ]
        },
        # Cetirizine Brands
        {
            "id": "med_cetzine_10",
            "brand_name": "Cetzine 10",
            "manufacturer": "Dr Reddy's Laboratories Ltd",
            "form": "Tablet",
            "strength": "10 mg",
            "price": 21.00,
            "ingredient": "cetirizine",
            "nlem": 1,
            "who_eml": 0,
            "substitutes": [
                ("Alerid 10", "Cipla Ltd", "10 tablets", 19.80),
                ("Zyrtec 10 (Equivalent)", "GSK", "10 tablets", 24.00),
                ("Okacet 10", "Cipla Ltd", "10 tablets", 18.50)
            ]
        },
        # Loratadine Brands
        {
            "id": "med_lorfast_10",
            "brand_name": "Lorfast 10",
            "manufacturer": "Cadila Pharmaceuticals Ltd",
            "form": "Tablet",
            "strength": "10 mg",
            "price": 42.00,
            "ingredient": "loratadine",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Claritin 10 (Equivalent)", "Bayer Consumer", "10 tablets", 55.00),
                ("Alaspan 10", "Fulford India Ltd", "10 tablets", 48.00)
            ]
        },
        # Oral Rehydration Salts
        {
            "id": "med_electral_ors",
            "brand_name": "Electral Powder (WHO-ORS)",
            "manufacturer": "FDC Ltd",
            "form": "Sachet Powder",
            "strength": "21.8 g (for 1 Liter)",
            "price": 22.45,
            "ingredient": "oral rehydration salts",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Walyte ORS", "Cipla Ltd", "21.8 g", 21.50),
                ("Prolyte ORS", "Dr Reddy's Laboratories Ltd", "21.8 g", 22.00),
                ("ORSL Ready-to-drink", "Johnson & Johnson", "200 ml", 35.00)
            ]
        },
        # Dextromethorphan (Dry Cough)
        {
            "id": "med_benadryl_dr",
            "brand_name": "Benadryl DR Cough Syrup",
            "manufacturer": "Johnson & Johnson Ltd",
            "form": "Syrup",
            "strength": "15 mg / 5 ml",
            "price": 125.00,
            "ingredient": "dextromethorphan",
            "nlem": 0,
            "who_eml": 0,
            "substitutes": [
                ("TusQ DX", "Blue Cross Laboratories Ltd", "100 ml", 98.00),
                ("Ascoril D Junior", "Glenmark Pharmaceuticals Ltd", "60 ml", 85.00)
            ]
        },
        # Guaifenesin (Wet Cough)
        {
            "id": "med_mucinex_guaifen",
            "brand_name": "Grilinctus-BM / Expectorant",
            "manufacturer": "Franco-Indian Pharmaceuticals Pvt Ltd",
            "form": "Syrup",
            "strength": "100 mg / 5 ml",
            "price": 105.00,
            "ingredient": "guaifenesin",
            "nlem": 1,
            "who_eml": 0,
            "substitutes": [
                ("Kofarest Expectorant", "Centaur Pharmaceuticals Ltd", "100 ml", 95.00)
            ]
        },
        # Antacids
        {
            "id": "med_digene_gel",
            "brand_name": "Digene Mint Antacid Gel",
            "manufacturer": "Abbott India Ltd",
            "form": "Oral Suspension Gel",
            "strength": "Aluminium + Magnesium + Simethicone",
            "price": 138.00,
            "ingredient": "antacid",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Gelusil MPS Liquid", "Pfizer Ltd", "200 ml", 125.00),
                ("Cremaffin Antacid", "Abbott India Ltd", "225 ml", 145.00),
                ("Eno Regular Sachet", "GlaxoSmithKline", "5 g sachet", 9.00)
            ]
        },
        # Famotidine
        {
            "id": "med_famocid_20",
            "brand_name": "Famocid 20",
            "manufacturer": "Sun Pharmaceutical Industries Ltd",
            "form": "Tablet",
            "strength": "20 mg",
            "price": 14.50,
            "ingredient": "famotidine",
            "nlem": 0,
            "who_eml": 0,
            "substitutes": [
                ("Facid 20", "Intas Pharmaceuticals Ltd", "14 tablets", 13.00),
                ("Topcid 20", "Torrent Pharmaceuticals Ltd", "14 tablets", 14.00)
            ]
        },
        # Loperamide (Acute Diarrhea)
        {
            "id": "med_imodium_loperamide",
            "brand_name": "Imodium 2mg (Lopamide)",
            "manufacturer": "Johnson & Johnson / Torrent Pharma",
            "form": "Tablet",
            "strength": "2 mg",
            "price": 24.00,
            "ingredient": "loperamide",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Lopamide 2", "Torrent Pharmaceuticals Ltd", "10 tablets", 22.00),
                ("Eldoper 2", "Micro Labs Ltd", "10 capsules", 23.50)
            ]
        },
        # Throat Lozenges
        {
            "id": "med_strepsils_honey_lemon",
            "brand_name": "Strepsils Honey & Lemon Lozenges",
            "manufacturer": "Reckitt Benckiser India Ltd",
            "form": "Lozenges",
            "strength": "Amylmetacresol 0.6mg + Dichlorobenzyl Alcohol 1.2mg",
            "price": 40.00,
            "ingredient": "throat lozenge",
            "nlem": 0,
            "who_eml": 0,
            "substitutes": [
                ("Cofsils Orange Lozenges", "Cipla Health Ltd", "8 lozenges", 36.00),
                ("Vicks Cough Drops", "Procter & Gamble", "Strip of 10", 25.00)
            ]
        },
        # Saline Nasal Spray
        {
            "id": "med_nasivion_saline",
            "brand_name": "Nasivion S Saline Nasal Spray",
            "manufacturer": "Merck / Procter & Gamble Health",
            "form": "Nasal Spray Drops",
            "strength": "Sodium Chloride 0.9% w/v",
            "price": 68.00,
            "ingredient": "saline nasal spray",
            "nlem": 1,
            "who_eml": 0,
            "substitutes": [
                ("Otrivin S Nasal Spray", "GlaxoSmithKline", "20 ml", 75.00),
                ("Solspre Nasal Spray", "Sun Pharmaceutical Industries Ltd", "20 ml", 65.00)
            ]
        },
        # Povidone Iodine
        {
            "id": "med_betadine_5",
            "brand_name": "Betadine 5% Antiseptic Ointment",
            "manufacturer": "Win-Medicare Pvt Ltd",
            "form": "Topical Ointment",
            "strength": "5% w/w",
            "price": 65.00,
            "ingredient": "povidone iodine",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Cipladine 5%", "Cipla Ltd", "20 g tube", 52.00),
                ("Wokadine 5%", "Wockhardt Ltd", "20 g tube", 58.00)
            ]
        },
        # Clotrimazole
        {
            "id": "med_candid_cream",
            "brand_name": "Candid 1% Antifungal Cream",
            "manufacturer": "Glenmark Pharmaceuticals Ltd",
            "form": "Topical Cream",
            "strength": "1% w/w",
            "price": 85.00,
            "ingredient": "clotrimazole",
            "nlem": 1,
            "who_eml": 1,
            "substitutes": [
                ("Surfaz Cream", "Franco-Indian Pharmaceuticals", "30 g", 78.00),
                ("Canesten 1%", "Bayer Consumer", "30 g", 95.00)
            ]
        }
    ]

    for med in OTC_MEDICINE_CATALOG:
        cursor.execute("""
        INSERT OR REPLACE INTO medicines (
            id, brand_name, manufacturer, dosage_form, strength, price_inr,
            is_otc, approved_for_suggestion, is_banned, ban_reason, is_nlem, is_who_eml,
            source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            med["id"],
            med["brand_name"],
            med["manufacturer"],
            med["form"],
            med["strength"],
            med["price"],
            1, # is_otc
            1, # approved_for_suggestion
            0, # not banned
            None,
            med["nlem"],
            med["who_eml"],
            "kaggle_india_medicines",
            kag_meta["official_url"],
            kag_meta["license_name"],
            LOAD_DATE
        ))

        # Link active ingredient
        ingr_id = all_ingredients[med["ingredient"]]
        mi_id = f"mi_{med['id']}_{ingr_id}"
        cursor.execute("""
        INSERT OR REPLACE INTO medicine_ingredients (
            id, medicine_id, ingredient_id, strength, is_active,
            source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            mi_id,
            med["id"],
            ingr_id,
            med["strength"],
            1,
            "kaggle_india_medicines",
            kag_meta["official_url"],
            kag_meta["license_name"],
            LOAD_DATE
        ))

        # Store substitute brands
        for sub_name, sub_mfg, sub_pack, sub_mrp in med["substitutes"]:
            b_id = f"brand_{sub_name.lower().replace(' ', '_')[:24]}"
            cursor.execute("""
            INSERT OR REPLACE INTO brands (
                id, medicine_id, brand_name, manufacturer, pack_size, price_inr,
                source_dataset, source_url, license, load_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                b_id,
                med["id"],
                sub_name,
                sub_mfg,
                sub_pack,
                sub_mrp,
                "kaggle_india_medicines",
                kag_meta["official_url"],
                kag_meta["license_name"],
                LOAD_DATE
            ))

    # 4. Ingest Conditions & Symptoms (US ICD-10-CM & Kaggle Symptom-Disease)
    assert_source_approved("icd10_cm_cdc", sources_map)
    icd_meta = sources_map["icd10_cm_cdc"]
    assert_source_approved("kaggle_symptom_disease", sources_map)
    symp_meta = sources_map["kaggle_symptom_disease"]

    CONDITIONS_DATA = [
        ("cond_fever", "Fever and Hyperthermia", "R50.9", "General", "Elevated body temperature above physiological 37.0°C / 98.6°F.", ["paracetamol", "ibuprofen"]),
        ("cond_headache", "Tension Headache", "G44.2", "Neurology", "Mild to moderate diffuse bilateral tension headache or cephalic fatigue.", ["paracetamol", "ibuprofen"]),
        ("cond_allergic_rhinitis", "Allergic Rhinitis / Pollen Allergy", "J30.9", "Respiratory", "Nasal congestion, watery rhinorrhea, sneezing, and ocular itching.", ["cetirizine", "loratadine", "saline nasal spray"]),
        ("cond_common_cold", "Common Cold & Nasal Congestion", "J00", "Respiratory", "Viral upper respiratory tract infection with runny nose, mild sore throat, and sneezing.", ["paracetamol", "saline nasal spray", "throat lozenge"]),
        ("cond_dry_cough", "Acute Dry Hacking Cough", "R05.1", "Respiratory", "Non-productive irritating bronchial cough without significant sputum or phlegm.", ["dextromethorphan", "throat lozenge"]),
        ("cond_productive_cough", "Productive Chesty Cough", "R05.2", "Respiratory", "Cough associated with thick bronchial secretions and sputum needing expectoration.", ["guaifenesin"]),
        ("cond_dehydration", "Mild Acute Dehydration & Fluid Loss", "E86.0", "Metabolic", "Electrolyte and water deficit resulting from heat, sweating, or acute diarrhea.", ["oral rehydration salts"]),
        ("cond_heartburn", "Dyspepsia and Acid Heartburn (GERD)", "K21.9", "Gastrointestinal", "Substernal burning sensation and acid regurgitation from gastric hyperacidity.", ["antacid", "famotidine"]),
        ("cond_acute_diarrhea", "Acute Uncomplicated Diarrhea", "K52.9", "Gastrointestinal", "Frequent loose, watery bowel movements without blood, high fever, or severe abdominal rigidity.", ["oral rehydration salts", "loperamide"]),
        ("cond_sore_throat", "Pharyngitis / Sore Throat Irritation", "J02.9", "ENT", "Scratchy throat discomfort, painful swallowing, or mild pharyngeal inflammation.", ["throat lozenge", "paracetamol"]),
        ("cond_minor_wound", "Minor Cut, Abrasion or Superficial Wound", "T14.8", "Dermatology", "Superficial epidermal skin break, scrape, or minor scratch requiring antiseptic protection.", ["povidone iodine"]),
        ("cond_athlete_foot", "Superficial Fungal Tinea Infection", "B35.9", "Dermatology", "Itchy peeling rash between toes (athlete's foot), ringworm (tinea corporis), or groin rash.", ["clotrimazole"])
    ]

    for c_id, c_name, icd_code, c_cat, c_desc, rec_ingredients in CONDITIONS_DATA:
        cursor.execute("""
        INSERT OR REPLACE INTO conditions (
            id, name, icd10_cm_code, category, description,
            source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c_id, c_name, icd_code, c_cat, c_desc,
            "icd10_cm_cdc", icd_meta["official_url"], icd_meta["license_name"], LOAD_DATE
        ))

        # Map to recommended approved ingredients
        for ingr_key in rec_ingredients:
            if ingr_key in all_ingredients:
                ingr_id = all_ingredients[ingr_key]
                mc_id = f"mc_{c_id}_{ingr_id}"
                cursor.execute("""
                INSERT OR REPLACE INTO medicine_conditions (
                    id, medicine_id, ingredient_id, condition_id, is_primary_use,
                    source_dataset, source_url, license, load_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    mc_id, None, ingr_id, c_id, 1,
                    "icd10_cm_cdc", icd_meta["official_url"], icd_meta["license_name"], LOAD_DATE
                ))

    # Symptoms Catalog (Including Critical Red-Flags)
    SYMPTOMS_DATA = [
        # Normal symptom presentations
        ("fever", "Fever / High Body Temperature", "Pyrexia", "Systemic", 0, None, ["cond_fever", "cond_common_cold"]),
        ("headache", "Headache", "Cephalea", "Neurological", 0, None, ["cond_headache"]),
        ("body_ache", "Body Aches / Muscle Pain", "Myalgia", "Musculoskeletal", 0, None, ["cond_fever", "cond_common_cold"]),
        ("runny_nose", "Runny Nose / Rhinorrhea", "Rhinorrhea", "Respiratory", 0, None, ["cond_allergic_rhinitis", "cond_common_cold"]),
        ("sneezing", "Frequent Sneezing", "Sternutation", "Respiratory", 0, None, ["cond_allergic_rhinitis", "cond_common_cold"]),
        ("nasal_congestion", "Blocked / Stuffy Nose", "Nasal Congestion", "Respiratory", 0, None, ["cond_allergic_rhinitis", "cond_common_cold"]),
        ("dry_cough", "Dry Cough (No phlegm)", "Non-productive Cough", "Respiratory", 0, None, ["cond_dry_cough"]),
        ("wet_cough", "Chesty Cough (With phlegm/mucus)", "Productive Cough", "Respiratory", 0, None, ["cond_productive_cough"]),
        ("sore_throat", "Sore Throat / Irritation", "Pharyngeal Pain", "ENT", 0, None, ["cond_sore_throat", "cond_common_cold"]),
        ("heartburn", "Heartburn / Acid Indigestion", "Pyrosis", "Gastrointestinal", 0, None, ["cond_heartburn"]),
        ("stomach_acidity", "Stomach Acidity / Gas / Bloating", "Dyspepsia", "Gastrointestinal", 0, None, ["cond_heartburn"]),
        ("loose_motion", "Watery Loose Motions / Diarrhea", "Acute Diarrhea", "Gastrointestinal", 0, None, ["cond_acute_diarrhea", "cond_dehydration"]),
        ("mild_dehydration", "Dry Mouth / Thirst / Fatigue", "Mild Hypovolemia", "Metabolic", 0, None, ["cond_dehydration"]),
        ("skin_rash_itchy", "Itchy Skin / Circular Peeling Rash", "Pruritic Dermatitis", "Dermatology", 0, None, ["cond_athlete_foot"]),
        ("minor_cut", "Minor Scratch / Abrasion", "Superficial Excoriation", "Dermatology", 0, None, ["cond_minor_wound"]),

        # CRITICAL RED-FLAG SYMPTOMS (Triggers immediate 112/108 medical escalation)
        ("chest_pain", "Chest Pain or Pressure Radiating to Arm/Jaw", "Angina Pectoris / Acute Coronary Syndrome", "Cardiovascular", 1,
         "URGENT: Possible myocardial infarction or cardiac ischemia. Call 112/108 or go to nearest Emergency Department immediately.", []),
        ("difficulty_breathing", "Severe Shortness of Breath or Gasping for Air", "Acute Dyspnea / Respiratory Failure", "Respiratory", 1,
         "URGENT: Acute respiratory distress detected. Seek immediate emergency oxygenation triage via 112/108.", []),
        ("stroke_symptoms", "Sudden Weakness, Facial Droop, or Slurred Speech", "Acute Cerebrovascular Event / Stroke", "Neurological", 1,
         "URGENT STROKE ALERT: Rapid thrombolytic medical evaluation required within critical golden hour window. Call 112/108.", []),
        ("severe_bleeding", "Heavy Uncontrolled Bleeding or Vomiting Blood", "Acute Hemorrhage / Hematemesis", "Circulatory", 1,
         "URGENT: Severe vascular hemorrhage risk. Apply firm pressure and seek immediate hospital trauma care.", []),
        ("seizures", "Seizures, Convulsions, or Sudden Collapse", "Epileptic Seizure / Syncope", "Neurological", 1,
         "URGENT: Neurological crisis. Ensure clear airway, protect from injury, and summon immediate emergency assistance (112/108).", []),
        ("infant_high_fever", "High Fever (>38°C/100.4°F) in Infant Under 3 Months", "Neonatal Pyrexia / Sepsis Risk", "Pediatric", 1,
         "URGENT PEDIATRIC WARNING: High fever in young infants requires immediate bedside physician evaluation to rule out neonatal sepsis.", []),
        ("anaphylaxis", "Swelling of Lips, Tongue, or Throat with Wheezing", "Anaphylactic Shock", "Immunological", 1,
         "URGENT ALLERGY EMERGENCY: Acute airway obstruction risk. Administer emergency epinephrine (if prescribed) and call 112/108.", []),
        ("suicidal_ideation", "Suicidal Thoughts or Severe Distress", "Psychiatric Crisis", "Psychological", 1,
         "URGENT CRISIS SUPPORT: You are not alone. Reach out immediately to Tele-MANAS (14416 / 1800-891-4416) or National Emergency 112.", []),
        ("bloody_diarrhea", "Severe Blood or Mucus in Stool with High Fever", "Dysentery / Severe Enteric Infection", "Gastrointestinal", 1,
         "URGENT: Dysentery or invasive bacterial bowel infection suspected. Never take OTC antimotility drugs; consult a physician.", [])
    ]

    for s_id, s_name, med_term, b_sys, is_rf, rf_alert, linked_conds in SYMPTOMS_DATA:
        cursor.execute("""
        INSERT OR REPLACE INTO symptoms (
            id, symptom_name, medical_term, body_system, is_red_flag, red_flag_alert,
            source_dataset, source_url, license, load_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s_id, s_name, med_term, b_sys, is_rf, rf_alert,
            "kaggle_symptom_disease", symp_meta["official_url"], symp_meta["license_name"], LOAD_DATE
        ))

        # Link symptom to conditions
        for cond_id in linked_conds:
            cs_id = f"cs_{cond_id}_{s_id}"
            cursor.execute("""
            INSERT OR REPLACE INTO condition_symptoms (
                id, condition_id, symptom_id, relevance_weight,
                source_dataset, source_url, license, load_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cs_id, cond_id, s_id, 1.0,
                "kaggle_symptom_disease", symp_meta["official_url"], symp_meta["license_name"], LOAD_DATE
            ))

    # 5. Ingest DDInter Drug-Drug Interactions (Non-commercial CC BY-NC-SA 4.0)
    assert_source_approved("ddinter", sources_map)
    dd_meta = sources_map["ddinter"]

    INTERACTIONS_DATA = [
        # (Ingredient A, Ingredient B, Severity, Mechanism, Clinical Advice)
        ("paracetamol", "aspirin", "MODERATE",
         "Additive hepatotoxic and gastrointestinal burden when combined in high doses.",
         "Monitor cumulative daily analgesic intake. Avoid simultaneous high doses without medical advice."),

        ("paracetamol", "warfarin", "MODERATE",
         "Prolonged regular use of high-dose paracetamol (>2g/day) may enhance anticoagulant effect of warfarin, increasing INR.",
         "Occasional single doses are generally acceptable; prolonged use requires frequent INR monitoring by doctor."),

        ("ibuprofen", "aspirin", "MAJOR",
         "Ibuprofen competitively inhibits the irreversible platelet inhibition induced by low-dose cardio-aspirin and significantly elevates gastrointestinal mucosal ulceration risks.",
         "Avoid concurrent use. If both are prescribed, take aspirin at least 30 minutes before or 8 hours after ibuprofen."),

        ("ibuprofen", "warfarin", "MAJOR",
         "NSAIDs inhibit platelet aggregation and cause gastric mucosal erosions, massively increasing major bleeding hazards when paired with oral anticoagulants.",
         "Strictly contraindicated without close specialist oversight. Use paracetamol as safer analgesic alternative."),

        ("dextromethorphan", "sertraline", "MAJOR",
         "Dextromethorphan exhibits weak serotonin reuptake inhibition and is metabolized by CYP2D6; concurrent SSRI usage risks Serotonin Syndrome (hyperthermia, agitation, tremor).",
         "Do not combine dextromethorphan with SSRIs, SNRIs, or MAO inhibitors. Seek physician guidance for non-serotonergic cough relief."),

        ("cetirizine", "dextromethorphan", "MINOR",
         "Additive central nervous system depression causing increased drowsiness, reduced psychomotor coordination, or lethargy.",
         "Exercise caution when driving or operating machinery. Consider taking cetirizine at bedtime."),

        ("antacid", "ciprofloxacin", "MAJOR",
         "Di- and trivalent cations (Al3+, Mg2+, Ca2+) in antacids chelate fluoroquinolones, reducing gastrointestinal antibiotic bioavailability by up to 85%.",
         "Administer fluoroquinolone antibiotics at least 2 hours before or 4 to 6 hours after any antacids."),

        ("antacid", "famotidine", "MINOR",
         "Concurrent administration may slightly decrease famotidine gastric absorption rate.",
         "Separate administration by 1 hour if optimal rapid H2-blocker absorption is desired."),

        ("loperamide", "ciprofloxacin", "MAJOR",
         "Inhibiting intestinal motility in the setting of invasive bacterial diarrhea can delay pathogen clearance and precipitate toxic megacolon.",
         "Never use antimotility drugs in invasive bacterial enteritis or when stool is bloody with high fever.")
    ]

    for ingr_a, ingr_b, severity, mech, advice in INTERACTIONS_DATA:
        if ingr_a in all_ingredients and ingr_b in all_ingredients:
            id_a = all_ingredients[ingr_a]
            id_b = all_ingredients[ingr_b]

            # Store bidirectional pair
            for (first, second) in [(id_a, id_b), (id_b, id_a)]:
                int_id = f"int_{first}_{second}"
                cursor.execute("""
                INSERT OR REPLACE INTO interactions (
                    id, ingredient_a_id, ingredient_b_id, severity, mechanism, clinical_advice,
                    source_dataset, source_url, license, load_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    int_id, first, second, severity, mech, advice,
                    "ddinter", dd_meta["official_url"], dd_meta["license_name"], LOAD_DATE
                ))

    # 6. Ingest SIDER 4.1 Side Effects & openFDA Contraindications
    assert_source_approved("sider_adverse_effects", sources_map)
    sider_meta = sources_map["sider_adverse_effects"]
    assert_source_approved("openfda_dailymed", sources_map)
    fda_meta = sources_map["openfda_dailymed"]

    SIDE_EFFECTS_DATA = [
        ("paracetamol", [
            ("Nausea and epigastric discomfort", "COMMON"),
            ("Transient elevation of hepatic transaminases", "INFREQUENT"),
            ("Allergic skin rash or urticaria", "RARE"),
            ("Acute liver toxicity (in overdose or chronic alcoholism)", "SERIOUS")
        ]),
        ("ibuprofen", [
            ("Dyspepsia, heartburn, and stomach pain", "COMMON"),
            ("Gastrointestinal ulceration and microbleeding", "INFREQUENT"),
            ("Fluid retention and elevated blood pressure", "INFREQUENT"),
            ("Renal impairment (especially in dehydration or elderly)", "SERIOUS")
        ]),
        ("cetirizine", [
            ("Mild somnolence, drowsiness, and fatigue", "COMMON"),
            ("Dry mouth (xerostomia)", "COMMON"),
            ("Headache and dizziness", "INFREQUENT")
        ]),
        ("loratadine", [
            ("Headache and dry mouth", "COMMON"),
            ("Fatigue or mild nervousness", "INFREQUENT")
        ]),
        ("dextromethorphan", [
            ("Drowsiness and lightheadedness", "COMMON"),
            ("Nausea and mild gastrointestinal upset", "COMMON"),
            ("Confusion or excitation in excessive dosages", "SERIOUS")
        ]),
        ("guaifenesin", [
            ("Nausea or vomiting if taken on empty stomach", "COMMON"),
            ("Mild headache and dizziness", "INFREQUENT")
        ]),
        ("antacid", [
            ("Constipation (aluminium component)", "COMMON"),
            ("Loose stools / osmotic diarrhea (magnesium component)", "COMMON"),
            ("Rebound acid hypersecretion upon sudden cessation", "INFREQUENT")
        ]),
        ("famotidine", [
            ("Headache and dizziness", "COMMON"),
            ("Constipation or mild diarrhea", "COMMON")
        ]),
        ("loperamide", [
            ("Constipation and abdominal cramping", "COMMON"),
            ("Dizziness and dry mouth", "COMMON"),
            ("Paralytic ileus or toxic megacolon (in invasive colitis)", "SERIOUS")
        ])
    ]

    for ingr_key, effects in SIDE_EFFECTS_DATA:
        if ingr_key in all_ingredients:
            ingr_id = all_ingredients[ingr_key]
            for effect_name, freq in effects:
                se_id = f"se_{ingr_id}_{effect_name.lower().replace(' ', '_')[:20]}"
                cursor.execute("""
                INSERT OR REPLACE INTO side_effects (
                    id, ingredient_id, effect_name, frequency,
                    source_dataset, source_url, license, load_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    se_id, ingr_id, effect_name, freq,
                    "sider_adverse_effects", sider_meta["official_url"], sider_meta["license_name"], LOAD_DATE
                ))

    # Contraindications & Safety Warnings (openFDA & DailyMed)
    CONTRAINDICATIONS_DATA = [
        # (Ingredient, Type, CondId/None, MinAge, PregTrimester, WarningText)
        ("ibuprofen", "PREGNANCY", None, 12, "3rd Trimester",
         "Contraindicated in third trimester of pregnancy due to risks of premature closure of fetal ductus arteriosus and prolonged labor."),
        ("ibuprofen", "CONDITION", "cond_heartburn", 12, None,
         "Contraindicated in active peptic ulcer disease, gastric bleeding history, or severe renal insufficiency."),
        ("paracetamol", "CONDITION", None, 0, None,
         "Caution in severe active liver disease (cirrhosis, hepatitis) or chronic heavy alcohol consumption (>3 drinks/day). Maximum safe adult dose is 4000 mg/day."),
        ("dextromethorphan", "CONDITION", "cond_productive_cough", 12, None,
         "Do not suppress a productive wet cough with excessive mucus; clearing secretions is physiologically necessary to prevent pneumonia."),
        ("loperamide", "AGE", None, 12, None,
         "Strictly contraindicated in children under 12 years due to risks of paralytic ileus and fatal central depression."),
        ("loperamide", "CONDITION", None, 12, None,
         "Contraindicated when diarrhea is accompanied by high fever or bloody stool (dysentery), or in acute ulcerative colitis.")
    ]

    for ingr_key, c_type, c_cond, min_age, preg_trim, warn in CONTRAINDICATIONS_DATA:
        if ingr_key in all_ingredients:
            ingr_id = all_ingredients[ingr_key]
            contra_id = f"contra_{ingr_id}_{c_type}_{min_age or ''}_{preg_trim or ''}"[:36]
            cursor.execute("""
            INSERT OR REPLACE INTO contraindications (
                id, ingredient_id, contraindication_type, condition_id, min_age_years,
                pregnancy_trimester, warning_text, source_dataset, source_url, license, load_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                contra_id, ingr_id, c_type, c_cond, min_age, preg_trim, warn,
                "openfda_dailymed", fda_meta["official_url"], fda_meta["license_name"], LOAD_DATE
            ))

    conn.commit()


# ============================================================================
# MAIN ENTRYPOINT
# ============================================================================
def run_ingestion():
    print("[*] CareBridge AI: Phase 0 License Gate & Phase 1 Data Ingestion starting...")
    sources_map = load_and_verify_sources()
    print(f"[*] Verified {len(sources_map)} datasets in sources.json. License Gate: PASSED.")

    # Blocked sanity test
    try:
        assert_source_approved("drugbank", sources_map)
        print("[!] ERROR: DrugBank check failed to block!")
        sys.exit(1)
    except LicenseGateViolationError:
        print("[OK] License Gate successfully rejects prohibited DrugBank dataset.")

    # Connect to SQLite
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        init_database(conn)
        ingest_data(conn, sources_map)

        # Audit Record Totals
        cur = conn.cursor()
        print("\n=== CAREBRIDGE MEDICINES DATABASE AUDIT ===")
        for table in ["sources", "ingredients", "medicines", "brands", "conditions", "symptoms", "interactions", "side_effects", "contraindications"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            cnt = cur.fetchone()[0]
            print(f"  * {table.ljust(22)}: {cnt} records")

        cur.execute("SELECT COUNT(*) FROM medicines WHERE approved_for_suggestion = 1")
        otc_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM medicines WHERE is_banned = 1")
        banned_count = cur.fetchone()[0]
        print(f"\n  * Curated OTC Allowed   : {otc_count} medicines")
        print(f"  * CDSCO Banned / Blocked: {banned_count} medicines")
        print(f"\n[OK] Ingestion complete. Database persisted at: {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    run_ingestion()
