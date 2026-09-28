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


def create_patient_and_login():
    client = TestClient(app)

    email = f"patient_{uuid4().hex[:8]}@example.com"
    password = "Patient@12345"

    response = client.post(
        "/auth/register",
        json={
            "name": "Appointment Test Patient",
            "email": email,
            "password": password,
            "role": "PATIENT",
            "phone": "9000000020",
        },
    )

    assert response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    return client, {"Authorization": f"Bearer {token}"}, email


def create_test_hospital(client, headers):
    response = client.post(
        "/hospitals/",
        headers=headers,
        json={
            "name": f"Appointment Test Hospital {uuid4().hex[:6]}",
            "city": "Guntur",
            "address": "Appointment Test Road",
            "phone": "9000000030",
            "emergency_available": True,
        },
    )

    assert response.status_code == 200

    return response.json()["hospital_id"]


def create_test_doctor(client, headers, hospital_id):
    response = client.post(
        "/doctors/",
        headers=headers,
        json={
            "hospital_id": hospital_id,
            "name": f"Dr. Appointment Test {uuid4().hex[:6]}",
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

    assert response.status_code == 200

    return response.json()["doctor_id"]


def test_appointment_create_get_update_delete():
    try:
        # ---------------------------------------------------------
        # 1. Create ADMIN and login
        # ---------------------------------------------------------
        admin_client, admin_headers = create_admin_and_login()

        # ---------------------------------------------------------
        # 2. Create test hospital
        # ---------------------------------------------------------
        hospital_id = create_test_hospital(
            admin_client,
            admin_headers,
        )

        print("\nHOSPITAL ID:")
        print(hospital_id)

        # ---------------------------------------------------------
        # 3. Create test doctor
        # ---------------------------------------------------------
        doctor_id = create_test_doctor(
            admin_client,
            admin_headers,
            hospital_id,
        )

        print("\nDOCTOR ID:")
        print(doctor_id)

        # ---------------------------------------------------------
        # 4. Create PATIENT and login
        # ---------------------------------------------------------
        patient_client, patient_headers, patient_email = (
            create_patient_and_login()
        )

        # ---------------------------------------------------------
        # 5. Create patient profile
        # ---------------------------------------------------------
        patient_response = patient_client.post(
            "/patients/",
            headers=patient_headers,
            json={
                "name": "Appointment Test Patient",
                "age": 25,
                "gender": "Female",
                "phone": "9000000020",
                "email": patient_email,
                "address": "Guntur, Andhra Pradesh",
            },
        )

        print("\nCREATE PATIENT RESPONSE:")
        print(patient_response.json())

        assert patient_response.status_code == 200

        patient_id = patient_response.json()["patient_id"]

        assert patient_id

        # ---------------------------------------------------------
        # 6. Create appointment
        # ---------------------------------------------------------
        appointment_response = patient_client.post(
            "/appointments/",
            headers=patient_headers,
            json={
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "hospital_id": hospital_id,
                "appointment_date": "2026-10-01",
                "appointment_time": "10:00 AM",
                "reason": "General consultation",
            },
        )

        print("\nCREATE APPOINTMENT RESPONSE:")
        print(appointment_response.json())

        assert appointment_response.status_code == 200

        appointment_data = appointment_response.json()

        appointment_id = (
            appointment_data.get("appointment_id")
            or appointment_data.get("id")
        )

        assert appointment_id

        # ---------------------------------------------------------
        # 7. Get appointment
        # ---------------------------------------------------------
        get_response = patient_client.get(
            f"/appointments/{appointment_id}",
            headers=patient_headers,
        )

        print("\nGET APPOINTMENT RESPONSE:")
        print(get_response.json())

        assert get_response.status_code == 200

        appointment = get_response.json()

        assert appointment["doctor_id"] == doctor_id
        assert appointment["patient_id"] == patient_id
        assert appointment["hospital_id"] == hospital_id

        # ---------------------------------------------------------
        # 8. Update appointment
        # ---------------------------------------------------------
        update_response = patient_client.put(
            f"/appointments/{appointment_id}",
            headers=patient_headers,
            json={
                "appointment_date": "2026-10-02",
                "appointment_time": "11:00 AM",
                "reason": "Updated general consultation",
                "status": "CONFIRMED",
            },
        )

        print("\nUPDATE APPOINTMENT RESPONSE:")
        print(update_response.json())

        assert update_response.status_code == 200

        # ---------------------------------------------------------
        # 9. Delete appointment
        # ---------------------------------------------------------
        delete_response = patient_client.delete(
            f"/appointments/{appointment_id}",
            headers=patient_headers,
        )

        print("\nDELETE APPOINTMENT RESPONSE:")
        print(delete_response.json())

        assert delete_response.status_code == 200

    finally:
        close_mongodb_connection()