import pytest
import json
from app import create_app


@pytest.fixture(scope="module")
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ============================================================================
# 1. TEST POST /assistant/suggest & /api/assistant/suggest
# ============================================================================
def test_suggest_basic_symptoms(client):
    """Test standard suggestion flow for fever and headache."""
    res = client.post("/assistant/suggest", json={
        "symptoms": ["fever", "headache"],
        "age": 28,
        "gender": "male"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["red_flag_triggered"] is False
    assert len(data["suggestions"]) > 0
    
    # Check suggestion details
    first_med = data["suggestions"][0]
    assert "generic_name" in first_med
    assert "common_brands" in first_med
    assert "commonly_used_for" in first_med
    assert "warnings" in first_med
    assert "side_effects" in first_med
    assert "interactions" in first_med
    assert "source_and_attribution" in first_med
    assert "disclaimer" in data


def test_suggest_red_flag_triggers_emergency(client):
    """Red flag symptoms must immediately trigger emergency referral and zero drug recommendations."""
    res = client.post("/assistant/suggest", json={
        "symptoms": ["chest pain", "sweating"],
        "age": 45
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["red_flag_triggered"] is True
    assert "EMERGENCY NOTICE" in data["emergency_alert"]
    assert "112" in data["emergency_alert"]
    assert "108" in data["emergency_alert"]
    assert data["suggestions"] == []


def test_suggest_allergy_filtering(client):
    """Allergy to paracetamol should remove paracetamol and explain why."""
    res = client.post("/api/assistant/suggest", json={
        "symptoms": ["headache", "fever"],
        "age": 30,
        "allergies": ["Paracetamol", "Acetaminophen"]
    })
    assert res.status_code == 200
    data = res.get_json()
    suggested_generics = [s["generic_name"].lower() for s in data["suggestions"]]
    assert "paracetamol" not in suggested_generics
    
    # Verify excluded medicines log
    excluded = data.get("excluded_medicines", [])
    paracetamol_excluded = any("paracetamol" in str(x).lower() and "allergy" in str(x).lower() for x in excluded)
    assert paracetamol_excluded is True


def test_suggest_pregnancy_filter(client):
    """Pregnancy should block NSAIDs (e.g. Ibuprofen) and flag warnings."""
    res = client.post("/assistant/suggest", json={
        "symptoms": ["body pain", "headache"],
        "age": 26,
        "gender": "female",
        "pregnant": True
    })
    assert res.status_code == 200
    data = res.get_json()
    suggested_generics = [s["generic_name"].lower() for s in data["suggestions"]]
    assert "ibuprofen" not in suggested_generics
    
    # Ibuprofen should be in excluded with pregnancy contraindication
    excluded = data.get("excluded_medicines", [])
    ibu_excluded = any("ibuprofen" in str(x).lower() and "pregnan" in str(x).lower() for x in excluded)
    assert ibu_excluded is True


def test_suggest_child_under_12_no_dosage_warning(client):
    """Children under 12 must trigger a clear advisory with no self-directed dosing."""
    res = client.post("/assistant/suggest", json={
        "symptoms": ["fever"],
        "age": 6
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["age_warning"] is not None
    assert "12" in data["age_warning"]
    assert "pediatrician" in data["age_warning"].lower()


def test_suggest_drug_interaction_blocking(client):
    """Taking Warfarin should block/exclude Ibuprofen due to severe bleeding risk."""
    res = client.post("/assistant/suggest", json={
        "symptoms": ["joint pain", "headache"],
        "age": 55,
        "current_medicines": ["Warfarin"]
    })
    assert res.status_code == 200
    data = res.get_json()
    suggested_generics = [s["generic_name"].lower() for s in data["suggestions"]]
    assert "ibuprofen" not in suggested_generics
    
    # Check exclusion log
    excluded = data.get("excluded_medicines", [])
    interaction_blocked = any("ibuprofen" in str(x).lower() and "warfarin" in str(x).lower() for x in excluded)
    assert interaction_blocked is True


# ============================================================================
# 2. TEST GET /medicine/search?q=
# ============================================================================
def test_medicine_search_brand_and_generic(client):
    """Search by Indian brand 'Crocin' and generic 'Paracetamol'."""
    res_brand = client.get("/medicine/search?q=Crocin")
    assert res_brand.status_code == 200
    data_brand = res_brand.get_json()
    assert data_brand["count"] > 0
    assert any("paracetamol" in m["generic_name"].lower() for m in data_brand["results"])

    res_generic = client.get("/api/medicine/search?q=Cetirizine")
    assert res_generic.status_code == 200
    data_generic = res_generic.get_json()
    assert data_generic["count"] > 0
    assert any("cetirizine" in m["generic_name"].lower() for m in data_generic["results"])


def test_medicine_search_empty_query(client):
    """Empty search returns empty list."""
    res = client.get("/medicine/search?q=")
    assert res.status_code == 200
    data = res.get_json()
    assert data["results"] == []


# ============================================================================
# 3. TEST GET /medicine/{id}/interactions?with=
# ============================================================================
def test_medicine_interactions_known_and_missing(client):
    """Check known interaction and ensure missing data is never implied safe."""
    # Known: Paracetamol + Warfarin
    res = client.get("/medicine/Paracetamol/interactions?with=Warfarin")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["interactions"]) > 0
    assert any("warfarin" in i["partner_medicine"].lower() for i in data["interactions"])

    # Unknown drug interaction
    res_unknown = client.get("/medicine/Paracetamol/interactions?with=RandomHerbalSupp99")
    assert res_unknown.status_code == 200
    data_unknown = res_unknown.get_json()
    assert "RandomHerbalSupp99" in data_unknown["missing_interaction_data_for"]
    assert "Never assume unlisted combinations are safe" in data_unknown["missing_data_notice"]


# ============================================================================
# 4. TEST GET /data-sources & /api/sources-attribution
# ============================================================================
def test_data_sources_endpoint(client):
    """Ensure data sources and licensing information endpoint serves valid registry."""
    res = client.get("/api/sources-attribution")
    assert res.status_code == 200
    data = res.get_json()
    assert "sources" in data
    assert len(data["sources"]) > 0
    assert data["project"].startswith("CareBridge AI")
    # Verify non-commercial note and blocked items
    sources = data["sources"]
    assert any(s["id"] == "ddinter" and s["status"] == "APPROVED" for s in sources)
    assert any(s["id"] == "drugbank" and s["status"] == "BLOCKED" for s in sources)
