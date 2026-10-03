from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.database import get_database
from app.core.security import hash_password


def create_user_and_login(name, role):
    connect_to_mongodb()

    client = TestClient(app)

    email = f"{role.lower()}_conversation_{uuid4().hex[:8]}@example.com"
    password = "TestPassword@123"

    if role == "PATIENT":
        response = client.post(
            "/auth/register",
            json={
                "name": name,
                "email": email,
                "password": password,
                "role": "PATIENT",
            },
        )
        assert response.status_code == 200

    else:
        db = get_database()

        result = db.users.insert_one(
            {
                "name": name,
                "email": email,
                "password_hash": hash_password(password),
                "role": role,
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

    return client, token, email


def create_patient(client, token, email):
    response = client.post(
        "/patients/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "name": "Conversation Test Patient",
            "age": 25,
            "gender": "Female",
            "phone": "9876543210",
            "email": email,
            "address": "Guntur, Andhra Pradesh",
        },
    )

    assert response.status_code == 200

    return response.json()["patient_id"]


def test_patient_can_save_and_view_own_conversation():
    client, token, email = create_user_and_login(
        "Conversation Patient",
        "PATIENT",
    )

    try:
        patient_id = create_patient(
            client,
            token,
            email,
        )

        headers = {
            "Authorization": f"Bearer {token}"
        }

        create_response = client.post(
            "/ai-assistant/history",
            headers=headers,
            json={
                "patient_id": patient_id,
                "message": "I have a headache",
                "sender": "USER",
            },
        )

        assert create_response.status_code == 200

        created = create_response.json()

        assert created["patient_id"] == patient_id
        assert created["message"] == "I have a headache"
        assert created["sender"] == "USER"
        assert created["id"]

        history_response = client.get(
            f"/ai-assistant/history/{patient_id}",
            headers=headers,
        )

        assert history_response.status_code == 200

        history = history_response.json()

        assert len(history) >= 1
        assert any(
            message["id"] == created["id"]
            for message in history
        )

    finally:
        close_mongodb_connection()


def test_patient_cannot_access_another_patient_conversation():
    patient_client, patient_token, patient_email = create_user_and_login(
        "Conversation Patient One",
        "PATIENT",
    )

    try:
        patient_id = create_patient(
            patient_client,
            patient_token,
            patient_email,
        )

        other_client, other_token, other_email = create_user_and_login(
            "Conversation Patient Two",
            "PATIENT",
        )

        try:
            other_patient_id = create_patient(
                other_client,
                other_token,
                other_email,
            )

            response = other_client.get(
                f"/ai-assistant/history/{patient_id}",
                headers={
                    "Authorization": f"Bearer {other_token}"
                },
            )

            assert response.status_code == 403
            assert response.json()["error"] == (
                "You can only access your own AI conversation history"
            )

            assert other_patient_id != patient_id

        finally:
            close_mongodb_connection()

    finally:
        close_mongodb_connection()


def test_invalid_sender_is_rejected():
    client, token, email = create_user_and_login(
        "Conversation Sender Test",
        "PATIENT",
    )

    try:
        patient_id = create_patient(
            client,
            token,
            email,
        )

        response = client.post(
            "/ai-assistant/history",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "patient_id": patient_id,
                "message": "Invalid sender test",
                "sender": "INVALID",
            },
        )

        assert response.status_code == 400
        assert response.json()["error"] == "sender must be USER or AI"

    finally:
        close_mongodb_connection()


def test_ai_sender_is_supported():
    client, token, email = create_user_and_login(
        "Conversation AI Sender",
        "PATIENT",
    )

    try:
        patient_id = create_patient(
            client,
            token,
            email,
        )

        response = client.post(
            "/ai-assistant/history",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "patient_id": patient_id,
                "message": "Here is your health information.",
                "sender": "AI",
            },
        )

        assert response.status_code == 200
        assert response.json()["sender"] == "AI"

    finally:
        close_mongodb_connection()


def test_conversation_invalid_patient_id():
    client, token, _ = create_user_and_login(
        "Conversation Invalid Patient",
        "STAFF",
    )

    try:
        response = client.get(
            "/ai-assistant/history/not-a-valid-id",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid patient ID"

    finally:
        close_mongodb_connection()


def test_conversation_patient_not_found():
    client, token, _ = create_user_and_login(
        "Conversation Missing Patient",
        "STAFF",
    )

    try:
        response = client.get(
            "/ai-assistant/history/000000000000000000000000",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 404
        assert response.json()["error"] == "Patient not found"

    finally:
        close_mongodb_connection()


def test_delete_conversation_message():
    client, token, email = create_user_and_login(
        "Conversation Delete Test",
        "PATIENT",
    )

    try:
        patient_id = create_patient(
            client,
            token,
            email,
        )

        headers = {
            "Authorization": f"Bearer {token}"
        }

        create_response = client.post(
            "/ai-assistant/history",
            headers=headers,
            json={
                "patient_id": patient_id,
                "message": "Message to delete",
                "sender": "USER",
            },
        )

        assert create_response.status_code == 200

        message_id = create_response.json()["id"]

        delete_response = client.delete(
            f"/ai-assistant/history/{message_id}",
            headers=headers,
        )

        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == (
            "Conversation message deleted successfully"
        )

        history_response = client.get(
            f"/ai-assistant/history/{patient_id}",
            headers=headers,
        )

        assert history_response.status_code == 200

        assert not any(
            message["id"] == message_id
            for message in history_response.json()
        )

    finally:
        close_mongodb_connection()


def test_delete_conversation_invalid_message_id():
    client, token, _ = create_user_and_login(
        "Conversation Invalid Message",
        "STAFF",
    )

    try:
        response = client.delete(
            "/ai-assistant/history/not-a-valid-id",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid message ID"

    finally:
        close_mongodb_connection()
