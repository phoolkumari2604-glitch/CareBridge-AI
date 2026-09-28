from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.core.security import hash_password


def create_admin_and_login():
    connect_to_mongodb()

    from app.core.database import get_database

    db = get_database()

    email = f"smartflow_admin_{uuid4().hex[:8]}@example.com"
    password = "Admin@12345"

    db.users.insert_one(
        {
            "name": "SmartFlow Test Admin",
            "email": email,
            "password_hash": hash_password(password),
            "role": "ADMIN",
            "phone": "9000000100",
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

    return client, {
        "Authorization": f"Bearer {token}"
    }


def create_patient_and_login():
    client = TestClient(app)

    email = f"smartflow_patient_{uuid4().hex[:8]}@example.com"
    password = "Patient@12345"

    response = client.post(
        "/auth/register",
        json={
            "name": "SmartFlow Test Patient",
            "email": email,
            "password": password,
            "role": "PATIENT",
            "phone": "9000000110",
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

    return client, {
        "Authorization": f"Bearer {token}"
    }, email


def create_test_hospital(client, admin_headers):
    response = client.post(
        "/hospitals/",
        headers=admin_headers,
        json={
            "name": f"SmartFlow Test Hospital {uuid4().hex[:6]}",
            "city": "Guntur",
            "address": "SmartFlow Test Road",
            "phone": "9000000120",
            "emergency_available": True,
        },
    )

    assert response.status_code == 200

    return response.json()["hospital_id"]


def create_test_doctor(client, admin_headers, hospital_id):
    response = client.post(
        "/doctors/",
        headers=admin_headers,
        json={
            "hospital_id": hospital_id,
            "name": f"Dr. SmartFlow {uuid4().hex[:6]}",
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


def test_smartflow_complete_workflow():

    try:
        # -------------------------------------------------
        # ADMIN
        # -------------------------------------------------

        admin_client, admin_headers = create_admin_and_login()

        # -------------------------------------------------
        # HOSPITAL
        # -------------------------------------------------

        hospital_id = create_test_hospital(
            admin_client,
            admin_headers,
        )

        print("\nHOSPITAL ID:")
        print(hospital_id)

        # -------------------------------------------------
        # DOCTOR
        # -------------------------------------------------

        doctor_id = create_test_doctor(
            admin_client,
            admin_headers,
            hospital_id,
        )

        print("\nDOCTOR ID:")
        print(doctor_id)

        # -------------------------------------------------
        # PATIENT
        # -------------------------------------------------

        patient_client, patient_headers, patient_email = (
            create_patient_and_login()
        )

        patient_response = patient_client.post(
            "/patients/",
            headers=patient_headers,
            json={
                "name": "SmartFlow Test Patient",
                "age": 25,
                "gender": "Female",
                "phone": "9000000110",
                "email": patient_email,
                "address": "Guntur, Andhra Pradesh",
            },
        )

        print("\nCREATE PATIENT RESPONSE:")
        print(patient_response.json())

        assert patient_response.status_code == 200

        patient_id = patient_response.json()["patient_id"]

        # -------------------------------------------------
        # APPOINTMENT
        # -------------------------------------------------

        appointment_response = patient_client.post(
            "/appointments/",
            headers=patient_headers,
            json={
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "hospital_id": hospital_id,
                "appointment_date": "2026-10-05",
                "appointment_time": "10:00 AM",
                "reason": "SmartFlow test consultation",
            },
        )

        print("\nCREATE APPOINTMENT RESPONSE:")
        print(appointment_response.json())

        assert appointment_response.status_code == 200

        appointment_id = appointment_response.json()["appointment_id"]

        # -------------------------------------------------
        # SMARTFLOW
        # -------------------------------------------------

        smartflow_response = admin_client.post(
            f"/smartflow/{appointment_id}",
            headers=admin_headers,
        )

        print("\nSMARTFLOW RESPONSE:")
        print(smartflow_response.json())

        assert smartflow_response.status_code == 200

        data = smartflow_response.json()

        # -------------------------------------------------
        # VERIFY MAIN RESPONSE
        # -------------------------------------------------

        assert data["message"] == "SmartFlow completed successfully"

        assert data["appointment"]["appointment_id"] == appointment_id
        assert data["appointment"]["status"] == "APPROVED"
        assert data["appointment"]["approval_status"] == "APPROVED"

        assert data["approval"]["status"] == "APPROVED"
        assert data["approval"]["approval_id"]

        assert data["opd_pass"]["opd_pass_id"]
        assert data["opd_pass"]["pass_number"]
        assert data["opd_pass"]["status"] == "ACTIVE"

        assert data["queue"]["queue_id"]
        assert data["queue"]["opd_pass_id"]
        assert data["queue"]["token_number"] >= 1
        assert data["queue"]["status"] == "WAITING"
        assert data["queue"]["patients_ahead"] >= 0
        assert data["queue"]["queue_position"] >= 1

        # -------------------------------------------------
        # RUN SMARTFLOW AGAIN
        # -------------------------------------------------

        second_response = admin_client.post(
            f"/smartflow/{appointment_id}",
            headers=admin_headers,
        )

        print("\nSECOND SMARTFLOW RESPONSE:")
        print(second_response.json())

        assert second_response.status_code == 200

        second_data = second_response.json()

        # Existing approval/pass/queue should be reused.
        assert (
            second_data["approval"]["approval_id"]
            == data["approval"]["approval_id"]
        )

        assert (
            second_data["opd_pass"]["opd_pass_id"]
            == data["opd_pass"]["opd_pass_id"]
        )

        assert (
            second_data["queue"]["queue_id"]
            == data["queue"]["queue_id"]
        )

        assert (
            second_data["queue"]["token_number"]
            == data["queue"]["token_number"]
        )

    finally:
        close_mongodb_connection()