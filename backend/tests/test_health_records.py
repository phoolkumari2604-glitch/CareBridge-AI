from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import (
    connect_to_mongodb,
    close_mongodb_connection,
    get_database,
)
from app.core.security import hash_password


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def create_patient(client):
    email = f"healthrecord_{uuid4().hex[:8]}@example.com"
    password = "Test@12345"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "Health Record Patient",
            "email": email,
            "password": password,
            "role": "PATIENT",
            "phone": "9876543210",
        },
    )

    assert register_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    patient_response = client.post(
        "/patients/",
        headers=headers,
        json={
            "name": "Health Record Patient",
            "age": 25,
            "gender": "Female",
            "phone": "9876543210",
            "email": email,
        },
    )

    assert patient_response.status_code == 200

    patient_id = patient_response.json()["patient_id"]

    return headers, patient_id


def create_staff(client):
    email = f"staff_{uuid4().hex[:8]}@example.com"
    password = "TestPassword@123"

    db = get_database()

    result = db.users.insert_one(
        {
            "name": "Health Record Staff",
            "email": email,
            "password_hash": hash_password(password),
            "role": "STAFF",
            "phone": None,
        }
    )

    assert result.inserted_id

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_health_record():
    client = get_client()

    try:
        headers, patient_id = create_patient(client)

        create_response = client.post(
            "/health-records/",
            headers=headers,
            json={
                "patient_id": patient_id,
                "record_type": "LAB_REPORT",
                "title": "Hypertension Report",
                "description": "Routine health record",
                "diagnosis": "Hypertension",
                "medications": ["Medication A"],
                "doctor_name": "Dr. Test",
                "hospital_name": "Test Hospital",
                "record_date": "2026-09-29",
            },
        )

        assert create_response.status_code == 200
        assert "record_id" in create_response.json()

        response = client.get(
            f"/health-records/{patient_id}",
            headers=headers,
        )

        assert response.status_code == 200

        records = response.json()

        assert len(records) >= 1
        assert records[-1]["patient_id"] == patient_id
        assert records[-1]["diagnosis"] == "Hypertension"
        assert records[-1]["record_type"] == "LAB_REPORT"
        assert records[-1]["title"] == "Hypertension Report"

    finally:
        close_mongodb_connection()


def test_patient_cannot_access_another_patient_records():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)
        other_headers, _ = create_patient(client)

        create_response = client.post(
            "/health-records/",
            headers=patient_headers,
            json={
                "patient_id": patient_id,
                "record_type": "CLINICAL_NOTE",
                "title": "Diabetes Record",
                "description": "Monitoring record",
                "diagnosis": "Diabetes",
                "medications": ["Medication B"],
                "record_date": "2026-09-29",
            },
        )

        assert create_response.status_code == 200

        response = client.get(
            f"/health-records/{patient_id}",
            headers=other_headers,
        )

        assert response.status_code == 403
        assert response.json()["error"] == (
            "You can only access your own health records"
        )

    finally:
        close_mongodb_connection()


def test_latest_health_record():
    client = get_client()

    try:
        headers, patient_id = create_patient(client)

        create_response = client.post(
            "/health-records/",
            headers=headers,
            json={
                "patient_id": patient_id,
                "record_type": "PRESCRIPTION",
                "title": "Asthma Record",
                "description": "Latest health record",
                "diagnosis": "Asthma",
                "medications": ["Inhaler"],
                "record_date": "2026-09-29",
            },
        )

        assert create_response.status_code == 200

        response = client.get(
            f"/health-records/{patient_id}/latest",
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["diagnosis"] == "Asthma"
        assert response.json()["patient_id"] == patient_id
        assert response.json()["title"] == "Asthma Record"

    finally:
        close_mongodb_connection()


def test_update_health_record():
    client = get_client()

    try:
        headers, patient_id = create_patient(client)

        create_response = client.post(
            "/health-records/",
            headers=headers,
            json={
                "patient_id": patient_id,
                "record_type": "CLINICAL_NOTE",
                "title": "Initial Record",
                "description": "Initial notes",
                "diagnosis": "Initial diagnosis",
                "medications": ["Initial medication"],
                "record_date": "2026-09-29",
            },
        )

        assert create_response.status_code == 200

        record_id = create_response.json()["record_id"]

        update_response = client.put(
            f"/health-records/{record_id}",
            headers=headers,
            json={
                "diagnosis": "Updated diagnosis",
                "description": "Updated notes",
            },
        )

        assert update_response.status_code == 200
        assert update_response.json()["message"] == (
            "Health record updated successfully"
        )

        latest_response = client.get(
            f"/health-records/{patient_id}/latest",
            headers=headers,
        )

        assert latest_response.status_code == 200
        assert latest_response.json()["diagnosis"] == "Updated diagnosis"
        assert latest_response.json()["description"] == "Updated notes"

    finally:
        close_mongodb_connection()


def test_invalid_and_missing_health_record_ids():
    client = get_client()

    try:
        headers, _ = create_patient(client)

        invalid_response = client.get(
            "/health-records/invalid-patient-id",
            headers=headers,
        )

        assert invalid_response.status_code == 400
        assert invalid_response.json()["error"] == "Invalid patient ID"

        missing_response = client.get(
            "/health-records/507f1f77bcf86cd799439011",
            headers=headers,
        )

        assert missing_response.status_code == 404
        assert missing_response.json()["error"] == "Patient not found"

        invalid_record_response = client.put(
            "/health-records/invalid-record-id",
            headers=headers,
            json={
                "diagnosis": "Test",
            },
        )

        assert invalid_record_response.status_code == 400
        assert invalid_record_response.json()["error"] == (
            "Invalid health record ID"
        )

    finally:
        close_mongodb_connection()


def test_staff_can_delete_health_record():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)

        create_response = client.post(
            "/health-records/",
            headers=patient_headers,
            json={
                "patient_id": patient_id,
                "record_type": "LAB_REPORT",
                "title": "Record To Delete",
                "description": "Delete test",
                "diagnosis": "Record to delete",
                "medications": [],
                "record_date": "2026-09-29",
            },
        )

        assert create_response.status_code == 200

        record_id = create_response.json()["record_id"]

        staff_headers = create_staff(client)

        delete_response = client.delete(
            f"/health-records/{record_id}",
            headers=staff_headers,
        )

        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == (
            "Health record deleted successfully"
        )

        get_response = client.get(
            f"/health-records/{patient_id}",
            headers=patient_headers,
        )

        assert get_response.status_code == 200

        record_ids = [
            record["_id"]
            for record in get_response.json()
        ]

        assert record_id not in record_ids

    finally:
        close_mongodb_connection()
