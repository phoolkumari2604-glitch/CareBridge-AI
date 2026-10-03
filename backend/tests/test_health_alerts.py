from uuid import uuid4
from datetime import datetime, timezone
from bson import ObjectId

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection, get_database
from app.core.security import hash_password


def setup_user(client, role="PATIENT"):
    email = f"{role.lower()}_{uuid4().hex[:8]}@example.com"
    password = "TestPassword@123"

    if role == "PATIENT":
        response = client.post(
            "/auth/register",
            json={
                "name": "Health Alert Test User",
                "email": email,
                "password": password,
                "role": "PATIENT",
            },
        )
        assert response.status_code == 200
    else:
        db = get_database()
        db.users.insert_one({
            "name": "Health Alert Test User",
            "email": email,
            "password_hash": hash_password(password),
            "role": role,
            "phone": None,
        })

    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200

    return {
        "Authorization": f"Bearer {response.json()['access_token']}"
    }, email


def create_patient(client, headers, email):
    response = client.post(
        "/patients/",
        headers=headers,
        json={
            "name": "Health Alert Patient",
            "age": 30,
            "gender": "Female",
            "phone": "9876543210",
            "email": email,
            "address": "Guntur, Andhra Pradesh",
        },
    )

    assert response.status_code == 200
    return response.json()["patient_id"]


def insert_vitals(patient_id):
    db = get_database()

    db.vital_signs.delete_many({
        "patient_id": ObjectId(patient_id)
    })

    db.vital_signs.insert_one({
        "patient_id": ObjectId(patient_id),
        "heart_rate": 130,
        "systolic_bp": 150,
        "diastolic_bp": 95,
        "spo2": 90,
        "temperature": 39.0,
        "blood_sugar": 220,
        "recorded_at": datetime.now(timezone.utc),
    })


def get_test_client():
    connect_to_mongodb()
    return TestClient(app)


def test_health_alerts_detect_abnormal_vitals():
    client = get_test_client()

    try:
        headers, email = setup_user(client, "PATIENT")
        patient_id = create_patient(client, headers, email)

        insert_vitals(patient_id)

        response = client.get(
            f"/health-alerts/{patient_id}",
            headers=headers,
        )

        assert response.status_code == 200

        alerts = response.json()

        assert len(alerts) == 6

        alert_types = {alert["alert_type"] for alert in alerts}

        assert alert_types == {
            "HEART_RATE",
            "BLOOD_PRESSURE",
            "SPO2",
            "TEMPERATURE",
            "BLOOD_SUGAR",
        }

        assert all(alert["severity"] == "HIGH" for alert in alerts)

    finally:
        close_mongodb_connection()


def test_health_alert_summary():
    client = get_test_client()

    try:
        headers, email = setup_user(client, "PATIENT")
        patient_id = create_patient(client, headers, email)

        insert_vitals(patient_id)

        response = client.get(
            f"/health-alerts/{patient_id}/summary",
            headers=headers,
        )

        assert response.status_code == 200

        data = response.json()

        assert data["patient_id"] == patient_id
        assert data["total_alerts"] == 6
        assert data["high_alerts"] == 6
        assert data["status"] == "ALERT"

    finally:
        close_mongodb_connection()


def test_patient_cannot_access_another_patient_alerts():
    client = get_test_client()

    try:
        headers1, email1 = setup_user(client, "PATIENT")
        patient1 = create_patient(client, headers1, email1)

        headers2, email2 = setup_user(client, "PATIENT")
        patient2 = create_patient(client, headers2, email2)

        assert patient1 != patient2

        response = client.get(
            f"/health-alerts/{patient2}",
            headers=headers1,
        )

        assert response.status_code == 403

        response = client.get(
            f"/health-alerts/{patient2}/summary",
            headers=headers1,
        )

        assert response.status_code == 403

    finally:
        close_mongodb_connection()


def test_invalid_patient_id():
    client = get_test_client()

    try:
        headers, _ = setup_user(client, "PATIENT")

        response = client.get(
            "/health-alerts/not-a-valid-id",
            headers=headers,
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid patient ID"

        response = client.get(
            "/health-alerts/not-a-valid-id/summary",
            headers=headers,
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid patient ID"

    finally:
        close_mongodb_connection()


def test_missing_patient():
    client = get_test_client()

    try:
        headers, _ = setup_user(client, "PATIENT")

        missing_patient_id = str(ObjectId())

        response = client.get(
            f"/health-alerts/{missing_patient_id}",
            headers=headers,
        )

        assert response.status_code == 404
        assert response.json()["error"] == "Patient not found"

        response = client.get(
            f"/health-alerts/{missing_patient_id}/summary",
            headers=headers,
        )

        assert response.status_code == 404
        assert response.json()["error"] == "Patient not found"

    finally:
        close_mongodb_connection()


def test_staff_can_view_health_alerts():
    client = get_test_client()

    try:
        staff_headers, _ = setup_user(client, "STAFF")

        db = get_database()

        patient_id = db.patients.insert_one({
            "name": "Staff Alert Patient",
            "age": 40,
            "gender": "Male",
            "phone": "9876543210",
            "email": f"staff_patient_{uuid4().hex[:8]}@example.com",
        }).inserted_id

        insert_vitals(str(patient_id))

        response = client.get(
            f"/health-alerts/{patient_id}",
            headers=staff_headers,
        )

        assert response.status_code == 200
        assert len(response.json()) == 6

    finally:
        close_mongodb_connection()
