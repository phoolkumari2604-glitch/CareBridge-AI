from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.security import hash_password


def create_admin_and_login():
    connect_to_mongodb()

    from app.core.database import get_database

    db = get_database()

    email = f"admin_{uuid4().hex[:8]}@example.com"
    password = "Admin@12345"

    db.users.insert_one(
        {
            "name": "Test Admin",
            "email": email,
            "password_hash": hash_password(password),
            "role": "ADMIN",
            "phone": "9000000000",
        }
    )

    client = TestClient(app)

    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]

    return client, {"Authorization": f"Bearer {token}"}


def get_test_hospital(client, headers):
    response = client.post(
        "/hospitals/",
        headers=headers,
        json={
            "name": f"Doctor Test Hospital {uuid4().hex[:6]}",
            "city": "Guntur",
            "address": "Doctor Test Road",
            "phone": "9000000010",
            "emergency_available": True,
        },
    )

    assert response.status_code == 200

    return response.json()["hospital_id"]


def test_doctor_create_get_update_delete():
    client = None

    try:
        client, headers = create_admin_and_login()

        hospital_id = get_test_hospital(client, headers)

        doctor_name = f"Dr. Test Doctor {uuid4().hex[:6]}"

        create_response = client.post(
            "/doctors/",
            headers=headers,
            json={
                "hospital_id": hospital_id,
                "name": doctor_name,
                "specialization": "General Medicine",
                "qualification": "MBBS",
                "experience": 5,
                "consultation_fee": 500,
                "available_days": [
                    "Monday",
                    "Wednesday",
                    "Friday",
                ],
                "available_slots": [
                    "10:00 AM",
                    "11:00 AM",
                ],
                "status": "AVAILABLE",
            },
        )

        print("\nCREATE DOCTOR RESPONSE:")
        print(create_response.json())

        assert create_response.status_code == 200

        data = create_response.json()

        doctor_id = data.get("doctor_id") or data.get("id")

        assert doctor_id

        get_response = client.get(
            f"/doctors/{doctor_id}",
            headers=headers,
        )

        print("\nGET DOCTOR RESPONSE:")
        print(get_response.json())

        assert get_response.status_code == 200

        doctor = get_response.json()

        assert doctor["name"] == doctor_name
        assert doctor["specialization"] == "General Medicine"

        update_response = client.put(
            f"/doctors/{doctor_id}",
            headers=headers,
            json={
                "name": doctor_name + " Updated",
                "specialization": "Cardiology",
                "qualification": "MBBS, MD",
                "experience": 6,
                "consultation_fee": 700,
                "available_days": [
                    "Tuesday",
                    "Thursday",
                ],
                "available_slots": [
                    "2:00 PM",
                    "3:00 PM",
                ],
                "status": "AVAILABLE",
            },
        )

        print("\nUPDATE DOCTOR RESPONSE:")
        print(update_response.json())

        assert update_response.status_code == 200

        availability_response = client.get(
            f"/doctors/{doctor_id}/availability",
            headers=headers,
        )

        print("\nDOCTOR AVAILABILITY RESPONSE:")
        print(availability_response.json())

        assert availability_response.status_code == 200

        delete_response = client.delete(
            f"/doctors/{doctor_id}",
            headers=headers,
        )

        print("\nDELETE DOCTOR RESPONSE:")
        print(delete_response.json())

        assert delete_response.status_code == 200

    finally:
        close_mongodb_connection()