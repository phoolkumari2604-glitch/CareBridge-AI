"""
Unit tests for Phase 0 (License Gate) and Phase 1 (Data Layer & Curated OTC Whitelist).
"""

import os
import json
import sqlite3
import pytest

from data.ingest_medicines import (
    load_and_verify_sources,
    assert_source_approved,
    LicenseGateViolationError,
    DB_PATH,
    SOURCES_JSON_PATH
)


def test_phase0_sources_json_structure():
    assert os.path.exists(SOURCES_JSON_PATH), "sources.json must exist"
    with open(SOURCES_JSON_PATH, "r", encoding="utf-8") as f:
        sources = json.load(f)

    assert len(sources) >= 10, "Should have all primary datasets registered"
    for s in sources:
        assert "id" in s
        assert "name" in s
        assert "official_url" in s
        assert "license_name" in s
        assert "commercial_allowed" in s
        assert "approval_status" in s
        assert s["approval_status"] in ["APPROVED", "BLOCKED", "NEEDS-REVIEW"]


def test_phase0_license_gate_blocks_prohibited_sources():
    sources_map = load_and_verify_sources()
    
    # 1. DrugBank must be strictly blocked
    assert sources_map["drugbank"]["approval_status"] == "BLOCKED"
    with pytest.raises(LicenseGateViolationError):
        assert_source_approved("drugbank", sources_map)

    # 2. WHO ICD-10 proprietary must be blocked
    assert sources_map["who_icd10_proprietary"]["approval_status"] == "BLOCKED"
    with pytest.raises(LicenseGateViolationError):
        assert_source_approved("who_icd10_proprietary", sources_map)

    # 3. Non-existent source must fail
    with pytest.raises(LicenseGateViolationError):
        assert_source_approved("unknown_unlicensed_source", sources_map)


def test_phase0_approved_sources_pass_gate():
    sources_map = load_and_verify_sources()
    approved_list = [
        "kaggle_india_medicines",
        "nlem_india_2022",
        "ddinter",
        "rxnorm",
        "openfda_dailymed",
        "medlineplus_connect",
        "who_eml_23",
        "sider_adverse_effects",
        "cdsco_banned_fdc",
        "icd10_cm_cdc",
        "kaggle_symptom_disease"
    ]
    for s_id in approved_list:
        assert_source_approved(s_id, sources_map)


def test_phase1_sqlite_database_tables():
    assert os.path.exists(DB_PATH), f"medicines.db must exist at {DB_PATH}"
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    required_tables = [
        "sources", "ingredients", "medicines", "brands",
        "conditions", "symptoms", "condition_symptoms",
        "medicine_conditions", "interactions", "side_effects",
        "contraindications"
    ]

    for table in required_tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        assert count > 0, f"Table {table} must be populated, got {count}"

    conn.close()


def test_phase1_otc_allowlist_enforcement():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Verify that only allowed OTC medicines are approved for suggestion
    cur.execute("""
    SELECT brand_name, approved_for_suggestion, is_otc, is_banned
    FROM medicines
    WHERE brand_name LIKE '%Crocin%' OR brand_name LIKE '%Brufen%' OR brand_name LIKE '%Electral%'
    """)
    rows = cur.fetchall()
    assert len(rows) > 0
    for brand, approved, is_otc, is_banned in rows:
        assert is_otc == 1
        assert approved == 1
        assert is_banned == 0

    # Verify CDSCO banned drugs are marked banned and NEVER approved for suggestion
    cur.execute("""
    SELECT brand_name, approved_for_suggestion, is_banned, ban_reason
    FROM medicines
    WHERE is_banned = 1
    """)
    banned_rows = cur.fetchall()
    assert len(banned_rows) >= 5, "CDSCO banned drugs must be present"
    for brand, approved, is_banned, reason in banned_rows:
        assert approved == 0, f"Banned drug {brand} must never be approved for suggestion"
        assert is_banned == 1
        assert reason is not None and len(reason) > 5

    # Verify prescription antibiotics are NOT approved for suggestion
    cur.execute("""
    SELECT generic_name, approved_for_suggestion, is_otc
    FROM ingredients
    WHERE generic_name IN ('Amoxicillin', 'Ciprofloxacin', 'Azithromycin', 'Warfarin')
    """)
    rx_rows = cur.fetchall()
    for name, approved, is_otc in rx_rows:
        assert approved == 0, f"Prescription drug {name} must have approved_for_suggestion=0"
        assert is_otc == 0

    conn.close()


def test_phase1_provenance_metadata():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Check that provenance columns exist and are non-empty across key tables
    for table in ["ingredients", "medicines", "conditions", "interactions", "side_effects"]:
        cur.execute(f"SELECT source_dataset, source_url, license, load_date FROM {table} LIMIT 5")
        rows = cur.fetchall()
        for s_data, s_url, lic, l_date in rows:
            assert s_data is not None and len(s_data) > 0
            assert s_url.startswith("http")
            assert lic is not None and len(lic) > 0
            assert l_date == "2026-10-19"

    conn.close()
