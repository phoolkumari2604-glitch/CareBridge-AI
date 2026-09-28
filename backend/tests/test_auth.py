from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def test_register_patient():
    client = get_client()

    try:
        email = f"test_{uuid4().hex[:8]}@example.com"

        response = client.post(
            "/auth/register",
            json={
                "name": "Test Patient",
                "email": email,
                "password": "TestPassword@123",
                "role": "PATIENT",
                "phone": "9876543210",
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["name"] == "Test Patient"
        assert data["email"] == email
        assert data["role"] == "PATIENT"
        assert "id" in data

    finally:
        close_mongodb_connection()


def test_login_patient():
    client = get_client()

    try:
        email = f"login_{uuid4().hex[:8]}@example.com"

        register_response = client.post(
            "/auth/register",
            json={
                "name": "Login Test Patient",
                "email": email,
                "password": "TestPassword@123",
            },
        )

        assert register_response.status_code == 200

        response = client.post(
            "/auth/login",
            json={
                "email": email,
                "password": "TestPassword@123",
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "PATIENT"

    finally:
        close_mongodb_connection()


def test_get_current_user():
    client = get_client()

    try:
        email = f"me_{uuid4().hex[:8]}@example.com"

        register_response = client.post(
            "/auth/register",
            json={
                "name": "Me Test Patient",
                "email": email,
                "password": "TestPassword@123",
            },
        )

        assert register_response.status_code == 200

        login_response = client.post(
            "/auth/login",
            json={
                "email": email,
                "password": "TestPassword@123",
            },
        )

        assert login_response.status_code == 200

        token = login_response.json()["access_token"]

        response = client.get(
            "/auth/me",
            headers={
                "Authorization": f"Bearer {token}"
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["email"] == email
        assert data["name"] == "Me Test Patient"
        assert data["role"] == "PATIENT"

    finally:
        close_mongodb_connection()


def test_invalid_login():
    client = get_client()

    try:
        email = f"invalid_{uuid4().hex[:8]}@example.com"

        register_response = client.post(
            "/auth/register",
            json={
                "name": "Invalid Login Patient",
                "email": email,
                "password": "CorrectPassword@123",
            },
        )

        assert register_response.status_code == 200

        response = client.post(
            "/auth/login",
            json={
                "email": email,
                "password": "WrongPassword@123",
            },
        )

        assert response.status_code == 401

    finally:
        close_mongodb_connection()


def test_auth_me_without_token():
    client = TestClient(app)

    response = client.get("/auth/me")

    assert response.status_code == 401