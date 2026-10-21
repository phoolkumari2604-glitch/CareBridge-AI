import pytest
from datetime import datetime, timezone
from uuid import uuid4
from bson import ObjectId

from app import create_app
from app.core.database import get_database
from app.core.clinical_thresholds import evaluate_telemetry_severity
from app.services.organ_service import compute_organ_status, get_patient_organ_dossier
from app.utils.security import create_access_token


@pytest.fixture(scope="module")
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture(scope="module")
def client(app):
    with app.test_client() as client:
        yield client


@pytest.fixture(scope="module")
def db():
    return get_database()


def get_doctor_auth_headers(db):
    user_id = ObjectId()
    db.users.insert_one({
        "_id": user_id,
        "email": f"doc_{user_id}@carebridge.ai",
        "name": "Dr. Test Clinician",
        "role": "DOCTOR",
        "status": "active"
    })
    token = create_access_token({"sub": str(user_id), "role": "DOCTOR"})
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ============================================================================
# 1. TEST CLINICAL THRESHOLD EVALUATION
# ============================================================================
def test_clinical_thresholds_evaluation():
    # Pancreas blood glucose (safe: 70-140, watch: 65-180, criticalHigh: 250, criticalLow: 54)
    assert evaluate_telemetry_severity("blood_glucose", "pancreas", 95) == "normal"
    assert evaluate_telemetry_severity("blood_glucose", "pancreas", 165) == "watch"
    assert evaluate_telemetry_severity("blood_glucose", "pancreas", 310) == "critical"
    assert evaluate_telemetry_severity("blood_glucose", "pancreas", 45) == "critical"

    # Thyroid TSH (safe: 0.4-4.0, watch: 0.3-5.5, criticalHigh: 10.0, criticalLow: 0.1)
    assert evaluate_telemetry_severity("tsh", "thyroid", 2.2) == "normal"
    assert evaluate_telemetry_severity("tsh", "thyroid", 4.8) == "watch"
    assert evaluate_telemetry_severity("tsh", "thyroid", 14.5) == "critical"

    # Kidneys Creatinine (safe: 0.6-1.2, watch: 0.5-1.5, criticalHigh: 2.5)
    assert evaluate_telemetry_severity("creatinine", "kidneys", 0.9) == "normal"
    assert evaluate_telemetry_severity("creatinine", "kidneys", 1.8) == "watch"
    assert evaluate_telemetry_severity("creatinine", "kidneys", 3.2) == "critical"

    # Blood pressure string handling (185/115 is critical)
    assert evaluate_telemetry_severity("blood_pressure", "intestines", "185/115") == "critical"
    assert evaluate_telemetry_severity("blood_pressure", "intestines", "120/80") == "normal"


# ============================================================================
# 2. TEST COMPUTED ORGAN STATUS & DOCTOR OVERRIDE PRECEDENCE
# ============================================================================
def test_computed_status_logic(db):
    test_patient_id = f"test-p-{ObjectId()}"

    # A) Empty -> no_data
    status, override = compute_organ_status(test_patient_id, "kidneys", db)
    assert status == "no_data"
    assert override is None

    # B) Add watch finding -> status becomes 'watch'
    finding_id = db.patient_findings.insert_one({
        "patientId": test_patient_id,
        "organId": "kidneys",
        "title": "Mild Cortical Thinning",
        "description": "Bilateral thinning",
        "severity": "watch",
        "x": 42.0,
        "y": 38.0,
        "recordedBy": "Dr. Test",
        "recordedAt": datetime.now(timezone.utc),
        "resolvedAt": None,
    }).inserted_id

    status, override = compute_organ_status(test_patient_id, "kidneys", db)
    assert status == "watch"
    assert status != "no_data", "An organ with active findings must NEVER be no_data"

    # C) Add critical finding -> status becomes 'critical'
    db.patient_findings.insert_one({
        "patientId": test_patient_id,
        "organId": "kidneys",
        "title": "Severe Renal Calyx Dilatation",
        "description": "Urgent drainage review",
        "severity": "critical",
        "x": 50.0,
        "y": 50.0,
        "recordedBy": "Dr. Test",
        "recordedAt": datetime.now(timezone.utc),
        "resolvedAt": None,
    })

    status, override = compute_organ_status(test_patient_id, "kidneys", db)
    assert status == "critical"

    # D) Doctor statusOverride beats computed status
    db.patient_organs.update_one(
        {"patientId": test_patient_id, "organId": "kidneys"},
        {"$set": {"statusOverride": "normal", "updatedAt": datetime.now(timezone.utc)}},
        upsert=True
    )
    status, override = compute_organ_status(test_patient_id, "kidneys", db)
    assert status == "normal"
    assert override == "normal"

    # Cleanup test patient records
    db.patient_findings.delete_many({"patientId": test_patient_id})
    db.patient_organs.delete_many({"patientId": test_patient_id})


# ============================================================================
# 3. TEST PATIENT ISOLATION (PATIENT A DOES NOT LEAK INTO PATIENT B)
# ============================================================================
def test_patient_isolation(db):
    patient_a = f"iso-a-{ObjectId()}"
    patient_b = f"iso-b-{ObjectId()}"

    # Insert critical finding for Patient A
    db.patient_findings.insert_one({
        "patientId": patient_a,
        "organId": "brain",
        "title": "Patient A Brain Lesion",
        "severity": "critical",
        "recordedAt": datetime.now(timezone.utc),
        "resolvedAt": None
    })

    dossier_a = get_patient_organ_dossier(patient_a, db)
    dossier_b = get_patient_organ_dossier(patient_b, db)

    assert dossier_a["brain"]["status"] == "critical"
    assert len(dossier_a["brain"]["findings"]) == 1

    # Patient B must remain clean (no_data, 0 findings)
    assert dossier_b["brain"]["status"] == "no_data"
    assert len(dossier_b["brain"]["findings"]) == 0

    # Cleanup
    db.patient_findings.delete_many({"patientId": {"$in": [patient_a, patient_b]}})


# ============================================================================
# 4. TEST INGEST APIS (GET, POST TELEMETRY, POST FINDINGS, PATCH, PUT)
# ============================================================================
def test_organ_ingest_apis(client, db):
    headers = get_doctor_auth_headers(db)
    test_pid = f"api-test-{ObjectId()}"

    # 1. GET dossier
    res = client.get(f"/api/patients/{test_pid}/organs", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "organs" in data
    assert "pancreas" in data["organs"]
    assert data["organs"]["pancreas"]["status"] == "no_data"

    # 2. POST telemetry
    telemetry_payload = {
        "organId": "pancreas",
        "indicatorKey": "blood_glucose",
        "label": "Blood Glucose",
        "value": 310,
        "unit": "mg/dL",
        "safeMin": 70,
        "safeMax": 140,
        "note": "Dev automated test reading",
    }
    res_tel = client.post(f"/api/patients/{test_pid}/telemetry", json=telemetry_payload, headers=headers)
    assert res_tel.status_code in (200, 201)
    tel_data = res_tel.get_json()
    assert tel_data["organStatus"] == "critical"

    # 3. POST finding
    finding_payload = {
        "organId": "thyroid",
        "title": "Right Lobe Colloid Nodule",
        "description": "Under surveillance",
        "severity": "watch",
        "x": 48.0,
        "y": 52.0
    }
    res_finding = client.post(f"/api/patients/{test_pid}/findings", json=finding_payload, headers=headers)
    assert res_finding.status_code in (200, 201)
    find_data = res_finding.get_json()
    assert find_data["organStatus"] == "watch"
    finding_id = find_data.get("findingId") or find_data["finding"]["id"]

    # 4. PATCH finding (resolve it)
    res_patch = client.patch(f"/api/findings/{finding_id}", json={"resolved": True}, headers=headers)
    assert res_patch.status_code == 200

    # 5. PUT clinical-state
    res_state = client.put(
        f"/api/patients/{test_pid}/organs/pancreas/clinical-state",
        json={"text": "Glycemic excursion under active insulin adjustment."},
        headers=headers
    )
    assert res_state.status_code == 200

    # 6. POST report
    res_rep = client.post(
        f"/api/patients/{test_pid}/reports",
        json={
            "organId": "pancreas",
            "title": "Pancreatic Ultrasound & Doppler",
            "fileUrl": "https://carebridge.ai/reports/panc-101.pdf"
        },
        headers=headers
    )
    assert res_rep.status_code in (200, 201)

    # 7. PUT status override
    res_over = client.put(
        f"/api/patients/{test_pid}/organs/pancreas/status-override",
        json={"statusOverride": "normal"},
        headers=headers
    )
    assert res_over.status_code == 200
    assert res_over.get_json()["statusOverride"] == "normal"

    # Verify dossier reflects everything
    res_final = client.get(f"/api/patients/{test_pid}/organs", headers=headers)
    final_data = res_final.get_json()
    assert final_data["organs"]["pancreas"]["statusOverride"] == "normal"
    assert len(final_data["organs"]["pancreas"]["reports"]) == 1
    assert final_data["organs"]["pancreas"]["clinicalState"]["text"] == "Glycemic excursion under active insulin adjustment."

    # Cleanup
    db.patient_telemetry.delete_many({"patientId": test_pid})
    db.patient_findings.delete_many({"patientId": test_pid})
    db.patient_clinical_state.delete_many({"patientId": test_pid})
    db.patient_organ_reports.delete_many({"patientId": test_pid})
    db.patient_organs.delete_many({"patientId": test_pid})
