from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection


def create_user_and_login(name, role):
    connect_to_mongodb()

    client = TestClient(app)

    email = f"{role.lower()}_{uuid4().hex[:8]}@example.com"
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
        from app.core.database import get_database
        from app.core.security import hash_password

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


def test_patient_cannot_create_hospital():
    client, token = create_user_and_login(
        "RBAC Patient",
        "PATIENT",
    )

    try:
        response = client.post(
            "/hospitals/",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "name": "Unauthorized Hospital",
                "city": "Guntur",
                "address": "Test Address",
                "phone": "9000000000",
            },
        )

        assert response.status_code == 403

    finally:
        close_mongodb_connection()


def test_patient_cannot_create_doctor():
    client, token = create_user_and_login(
        "RBAC Patient Doctor Test",
        "PATIENT",
    )

    try:
        response = client.post(
            "/doctors/",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "name": "Unauthorized Doctor",
                "specialization": "General Medicine",
                "hospital_id": "000000000000000000000000",
            },
        )

        assert response.status_code == 403

    finally:
        close_mongodb_connection()


def test_patient_can_view_hospitals():
    client, token = create_user_and_login(
        "RBAC Patient Hospital View",
        "PATIENT",
    )

    try:
        response = client.get(
            "/hospitals/",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 200

    finally:
        close_mongodb_connection()