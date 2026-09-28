from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.security import hash_password


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def create_admin_and_login():
    from app.core.database import get_database

    db = get_database()

    email = f"admin_{uuid4().hex[:8]}@example.com"
    password = "Admin@12345"

    result = db.users.insert_one(
        {
            "name": "Test Admin",
            "email": email,
            "password_hash": hash_password(password),
            "role": "ADMIN",
            "phone": "9000000000",
        }
    )

    client = TestClient(app)

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    return client, {
        "Authorization": f"Bearer {token}"
    }


def test_hospital_create_get_update_delete():
    client = None

    try:
        connect_to_mongodb()

        client, headers = create_admin_and_login()

        hospital_name = f"CareBridge Test Hospital {uuid4().hex[:6]}"

        create_response = client.post(
            "/hospitals/",
            headers=headers,
            json={
                "name": hospital_name,
                "city": "Guntur",
                "state": "Andhra Pradesh",
                "address": "Main Road, Guntur",
                "phone": "9000000001",
                "emergency_available": True,
            },
        )

        print("\nCREATE HOSPITAL RESPONSE:")
        print(create_response.json())

        assert create_response.status_code == 200

        data = create_response.json()

        hospital_id = (
            data.get("hospital_id")
            or data.get("id")
        )

        assert hospital_id

        get_response = client.get(
            f"/hospitals/{hospital_id}",
            headers=headers,
        )

        print("\nGET HOSPITAL RESPONSE:")
        print(get_response.json())

        assert get_response.status_code == 200

        hospital = get_response.json()

        assert hospital["name"] == hospital_name
        assert hospital["city"] == "Guntur"

        update_response = client.put(
            f"/hospitals/{hospital_id}",
            headers=headers,
            json={
                "name": hospital_name + " Updated",
                "city": "Guntur",
                "state": "Andhra Pradesh",
                "address": "Updated Address",
                "phone": "9000000002",
                "emergency_available": True,
            },
        )

        print("\nUPDATE HOSPITAL RESPONSE:")
        print(update_response.json())

        assert update_response.status_code == 200

        delete_response = client.delete(
            f"/hospitals/{hospital_id}",
            headers=headers,
        )

        print("\nDELETE HOSPITAL RESPONSE:")
        print(delete_response.json())

        assert delete_response.status_code == 200

    finally:
        close_mongodb_connection()


def test_hospital_city_search():
    client = None

    try:
        connect_to_mongodb()

        client, headers = create_admin_and_login()

        response = client.get(
            "/hospitals/search/by-city",
            params={"city": "Guntur"},
            headers=headers,
        )

        print("\nCITY SEARCH RESPONSE:")
        print(response.json())

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    finally:
        close_mongodb_connection()