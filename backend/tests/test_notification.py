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
    email = f"notification_patient_{uuid4().hex[:8]}@example.com"
    password = "Test@12345"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "Notification Patient",
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
            "name": "Notification Patient",
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
    email = f"notification_staff_{uuid4().hex[:8]}@example.com"
    password = "TestPassword@123"

    db = get_database()

    result = db.users.insert_one(
        {
            "name": "Notification Staff",
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


def test_staff_can_create_and_patient_can_view_notification():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)
        staff_headers = create_staff(client)

        create_response = client.post(
            "/notifications/",
            headers=staff_headers,
            json={
                "patient_id": patient_id,
                "title": "Appointment Reminder",
                "message": "Your appointment is scheduled for tomorrow.",
                "notification_type": "APPOINTMENT",
            },
        )

        assert create_response.status_code == 200

        notification = create_response.json()

        assert notification["patient_id"] == patient_id
        assert notification["title"] == "Appointment Reminder"
        assert notification["message"] == (
            "Your appointment is scheduled for tomorrow."
        )
        assert notification["notification_type"] == "APPOINTMENT"
        assert notification["is_read"] is False
        assert "id" in notification

        get_response = client.get(
            f"/notifications/{patient_id}",
            headers=patient_headers,
        )

        assert get_response.status_code == 200

        notifications = get_response.json()

        assert len(notifications) >= 1
        assert any(
            item["id"] == notification["id"]
            for item in notifications
        )

    finally:
        close_mongodb_connection()


def test_unread_count_and_mark_notification_as_read():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)
        staff_headers = create_staff(client)

        create_response = client.post(
            "/notifications/",
            headers=staff_headers,
            json={
                "patient_id": patient_id,
                "title": "Test Notification",
                "message": "Please review your health information.",
                "notification_type": "GENERAL",
            },
        )

        assert create_response.status_code == 200

        notification_id = create_response.json()["id"]

        count_response = client.get(
            f"/notifications/{patient_id}/unread-count",
            headers=patient_headers,
        )

        assert count_response.status_code == 200
        assert count_response.json()["patient_id"] == patient_id
        assert count_response.json()["unread_count"] >= 1

        update_response = client.put(
            f"/notifications/{notification_id}",
            headers=patient_headers,
            json={
                "is_read": True,
            },
        )

        assert update_response.status_code == 200
        assert update_response.json()["id"] == notification_id
        assert update_response.json()["is_read"] is True

        count_after_update = client.get(
            f"/notifications/{patient_id}/unread-count",
            headers=patient_headers,
        )

        assert count_after_update.status_code == 200
        assert count_after_update.json()["unread_count"] == 0

    finally:
        close_mongodb_connection()


def test_patient_cannot_access_another_patient_notifications():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)
        other_headers, _ = create_patient(client)
        staff_headers = create_staff(client)

        create_response = client.post(
            "/notifications/",
            headers=staff_headers,
            json={
                "patient_id": patient_id,
                "title": "Private Notification",
                "message": "Private patient notification.",
                "notification_type": "GENERAL",
            },
        )

        assert create_response.status_code == 200

        response = client.get(
            f"/notifications/{patient_id}",
            headers=other_headers,
        )

        assert response.status_code == 403
        assert response.json()["error"] == (
            "You can only access your own notifications"
        )

    finally:
        close_mongodb_connection()


def test_invalid_and_missing_notification_ids():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)

        invalid_patient_response = client.get(
            "/notifications/invalid-patient-id",
            headers=patient_headers,
        )

        assert invalid_patient_response.status_code == 400
        assert invalid_patient_response.json()["error"] == (
            "Invalid patient ID"
        )

        missing_patient_response = client.get(
            "/notifications/507f1f77bcf86cd799439011",
            headers=patient_headers,
        )

        assert missing_patient_response.status_code == 404
        assert missing_patient_response.json()["error"] == (
            "Patient not found"
        )

        invalid_notification_response = client.put(
            "/notifications/invalid-notification-id",
            headers=patient_headers,
            json={
                "is_read": True,
            },
        )

        assert invalid_notification_response.status_code == 400
        assert invalid_notification_response.json()["error"] == (
            "Invalid notification ID"
        )

    finally:
        close_mongodb_connection()


def test_staff_can_delete_notification():
    client = get_client()

    try:
        _, patient_id = create_patient(client)
        staff_headers = create_staff(client)

        create_response = client.post(
            "/notifications/",
            headers=staff_headers,
            json={
                "patient_id": patient_id,
                "title": "Delete Test",
                "message": "This notification will be deleted.",
                "notification_type": "GENERAL",
            },
        )

        assert create_response.status_code == 200

        notification_id = create_response.json()["id"]

        delete_response = client.delete(
            f"/notifications/{notification_id}",
            headers=staff_headers,
        )

        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == (
            "Notification deleted successfully"
        )

        invalid_get_response = client.put(
            f"/notifications/{notification_id}",
            headers=staff_headers,
            json={
                "is_read": True,
            },
        )

        assert invalid_get_response.status_code == 404
        assert invalid_get_response.json()["error"] == (
            "Notification not found"
        )

    finally:
        close_mongodb_connection()


def test_patient_cannot_create_or_delete_notification():
    client = get_client()

    try:
        patient_headers, patient_id = create_patient(client)

        create_response = client.post(
            "/notifications/",
            headers=patient_headers,
            json={
                "patient_id": patient_id,
                "title": "Unauthorized",
                "message": "Patient should not create this.",
                "notification_type": "GENERAL",
            },
        )

        assert create_response.status_code == 403

        delete_response = client.delete(
            "/notifications/507f1f77bcf86cd799439011",
            headers=patient_headers,
        )

        assert delete_response.status_code == 403

    finally:
        close_mongodb_connection()
