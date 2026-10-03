from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def register_and_login(client):
    email = f"ai_patient_{uuid4().hex[:8]}@example.com"
    password = "Test@12345"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "AI Assistant Test Patient",
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


def test_ai_assistant_requires_authentication():
    client = TestClient(app)

    response = client.post(
        "/ai-assistant/chat",
        json={
            "patient_id": "507f1f77bcf86cd799439011",
            "message": "How am I doing?",
        },
    )

    assert response.status_code == 401


def test_ai_assistant_invalid_patient_id():
    client = get_client()

    try:
        headers = register_and_login(client)

        response = client.post(
            "/ai-assistant/chat",
            headers=headers,
            json={
                "patient_id": "invalid-id",
                "message": "How am I doing?",
            },
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid patient ID"

    finally:
        close_mongodb_connection()


def test_ai_assistant_patient_not_found():
    client = get_client()

    try:
        headers = register_and_login(client)

        response = client.post(
            "/ai-assistant/chat",
            headers=headers,
            json={
                "patient_id": "507f1f77bcf86cd799439011",
                "message": "How am I doing?",
            },
        )

        assert response.status_code == 404
        assert response.json()["error"] == "Patient not found"

    finally:
        close_mongodb_connection()


def test_ai_assistant_patient_chat():
    client = get_client()

    try:
        headers = register_and_login(client)

        create_response = client.post(
            "/patients/",
            headers=headers,
            json={
                "name": "AI Assistant Patient",
                "age": 25,
                "gender": "Female",
                "phone": "9876543210",
                "email": f"ai_profile_{uuid4().hex[:8]}@example.com",
                "address": "Guntur, Andhra Pradesh",
            },
        )

        assert create_response.status_code == 200

        patient_id = create_response.json()["patient_id"]

        response = client.post(
            "/ai-assistant/chat",
            headers=headers,
            json={
                "patient_id": patient_id,
                "message": "How am I doing?",
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["patient_id"] == patient_id
        assert data["message"] == "How am I doing?"
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0
        assert data["disclaimer"] is not None

    finally:
        close_mongodb_connection()
