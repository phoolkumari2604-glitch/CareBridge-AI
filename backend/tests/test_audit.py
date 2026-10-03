from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.database import get_database
from app.core.security import hash_password


def create_user_and_login(name, role):
    connect_to_mongodb()

    client = TestClient(app)

    email = f"{role.lower()}_audit_{uuid4().hex[:8]}@example.com"
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

    return client, token


def test_patient_cannot_view_audit_logs():
    client, token = create_user_and_login(
        "Audit Patient",
        "PATIENT",
    )

    try:
        response = client.get(
            "/audit-logs/",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 403

    finally:
        close_mongodb_connection()


def test_staff_can_create_and_view_audit_log():
    client, token = create_user_and_login(
        "Audit Staff",
        "STAFF",
    )

    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }

        create_response = client.post(
            "/audit-logs/",
            headers=headers,
            params={
                "action": "TEST_ACTION",
                "resource": "test_resource",
                "resource_id": "test-resource-id",
                "details": "Audit test entry",
            },
        )

        assert create_response.status_code == 200

        created = create_response.json()

        assert created["action"] == "TEST_ACTION"
        assert created["resource"] == "test_resource"
        assert created["resource_id"] == "test-resource-id"
        assert created["details"] == "Audit test entry"
        assert created["user_role"] == "STAFF"
        assert created["id"]

        log_id = created["id"]

        get_response = client.get(
            f"/audit-logs/{log_id}",
            headers=headers,
        )

        assert get_response.status_code == 200
        assert get_response.json()["id"] == log_id

        list_response = client.get(
            "/audit-logs/",
            headers=headers,
        )

        assert list_response.status_code == 200
        assert any(
            log["id"] == log_id
            for log in list_response.json()
        )

    finally:
        close_mongodb_connection()


def test_staff_cannot_delete_audit_log():
    client, token = create_user_and_login(
        "Audit Staff Delete",
        "STAFF",
    )

    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }

        create_response = client.post(
            "/audit-logs/",
            headers=headers,
            params={
                "action": "DELETE_PERMISSION_TEST",
            },
        )

        assert create_response.status_code == 200

        log_id = create_response.json()["id"]

        delete_response = client.delete(
            f"/audit-logs/{log_id}",
            headers=headers,
        )

        assert delete_response.status_code == 403

    finally:
        close_mongodb_connection()


def test_admin_can_delete_audit_log():
    client, token = create_user_and_login(
        "Audit Admin",
        "ADMIN",
    )

    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }

        create_response = client.post(
            "/audit-logs/",
            headers=headers,
            params={
                "action": "ADMIN_DELETE_TEST",
            },
        )

        assert create_response.status_code == 200

        log_id = create_response.json()["id"]

        delete_response = client.delete(
            f"/audit-logs/{log_id}",
            headers=headers,
        )

        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Audit log deleted successfully"

        get_response = client.get(
            f"/audit-logs/{log_id}",
            headers=headers,
        )

        assert get_response.status_code == 404

    finally:
        close_mongodb_connection()


def test_audit_log_invalid_id():
    client, token = create_user_and_login(
        "Audit Invalid ID",
        "STAFF",
    )

    try:
        response = client.get(
            "/audit-logs/not-a-valid-object-id",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Invalid audit log ID"

    finally:
        close_mongodb_connection()
