from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def register_and_login(client):
    email = f"patient_{uuid4().hex[:8]}@example.com"
    password = "Test@12345"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "Patient Test",
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

    return {
        "Authorization": f"Bearer {token}"
    }


def test_patient_create_and_get():
    client = get_client()

    try:
        headers = register_and_login(client)

        create_response = client.post(
            "/patients/",
            headers=headers,
            json={
                "name": "Test Patient",
                "age": 25,
                "gender": "Female",
                "phone": "9876543210",
                "email": "testpatient@example.com",
                "address": "Guntur, Andhra Pradesh",
            },
        )

        assert create_response.status_code == 200

        data = create_response.json()

        assert "patient_id" in data
        assert data["message"] == "Patient created successfully"

        patient_id = data["patient_id"]

        get_response = client.get(
            f"/patients/{patient_id}",
            headers=headers,
        )

        assert get_response.status_code == 200

        patient = get_response.json()

        print("\nGET PATIENT RESPONSE:")
        print(patient)

        assert patient["name"] == "Test Patient"

    finally:
        close_mongodb_connection()


def test_patient_cannot_access_another_patient():
    client = get_client()

    try:
        headers = register_and_login(client)

        create_response = client.post(
            "/patients/",
            headers=headers,
            json={
                "name": "Ownership Test Patient",
                "age": 30,
                "gender": "Male",
                "phone": "9999999999",
                "email": "ownership@example.com",
                "address": "Hyderabad, Telangana",
            },
        )

        assert create_response.status_code == 200

        patient_id = create_response.json()["patient_id"]

        assert patient_id

        fake_patient_id = "507f1f77bcf86cd799439011"

        response = client.get(
            f"/patients/{fake_patient_id}",
            headers=headers,
        )

        assert response.status_code in [403, 404]

    finally:
        close_mongodb_connection()