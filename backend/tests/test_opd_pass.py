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
            "name": "OPD Test Admin",
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

    return client, {
        "Authorization": f"Bearer {token}"
    }


def create_patient_and_login():
    client = TestClient(app)

    email = f"patient_{uuid4().hex[:8]}@example.com"
    password = "Patient@12345"

    response = client.post(
        "/auth/register",
        json={
            "name": "OPD Test Patient",
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

    return client, {
        "Authorization": f"Bearer {token}"
    }, email


def create_test_hospital(client, headers):
    response = client.post(
        "/hospitals/",
        headers=headers,
        json={
            "name": f"OPD Test Hospital {uuid4().hex[:6]}",
            "city": "Guntur",
            "address": "OPD Test Road",
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
            "name": f"Dr. OPD Test {uuid4().hex[:6]}",
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


def test_opd_pass_create_get_update_delete():
    try:
        # -----------------------------
        # ADMIN
        # -----------------------------
        admin_client, admin_headers = create_admin_and_login()

        # -----------------------------
        # HOSPITAL
        # -----------------------------
        hospital_id = create_test_hospital(
            admin_client,
            admin_headers,
        )

        print("\nHOSPITAL ID:")
        print(hospital_id)

        # -----------------------------
        # DOCTOR
        # -----------------------------
        doctor_id = create_test_doctor(
            admin_client,
            admin_headers,
            hospital_id,
        )

        print("\nDOCTOR ID:")
        print(doctor_id)

        # -----------------------------
        # PATIENT
        # -----------------------------
        patient_client, patient_headers, patient_email = (
            create_patient_and_login()
        )

        patient_response = patient_client.post(
            "/patients/",
            headers=patient_headers,
            json={
                "name": "OPD Test Patient",
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

        # -----------------------------
        # APPOINTMENT
        # -----------------------------
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

        appointment_id = appointment_response.json()["appointment_id"]

        # -----------------------------
        # CREATE OPD PASS
        # -----------------------------
        opd_response = admin_client.post(
            f"/opd-pass/{appointment_id}",
            headers=admin_headers,
        )

        print("\nCREATE OPD PASS RESPONSE:")
        print(opd_response.json())

        assert opd_response.status_code == 200

        opd_data = opd_response.json()

        opd_pass_id = opd_data["opd_pass_id"]

        assert opd_data["message"] == (
            "Digital OPD pass created successfully"
        )

        assert opd_data["status"] == "ACTIVE"
        assert opd_data["pass_number"].startswith("OPD-")

        # -----------------------------
        # GET OPD PASS AS PATIENT
        # -----------------------------
        get_response = patient_client.get(
            f"/opd-pass/{opd_pass_id}",
            headers=patient_headers,
        )

        print("\nGET OPD PASS RESPONSE:")
        print(get_response.json())

        assert get_response.status_code == 200

        opd_pass = get_response.json()

        assert opd_pass["_id"] == opd_pass_id
        assert opd_pass["appointment_id"] == appointment_id
        assert opd_pass["patient_id"] == patient_id
        assert opd_pass["hospital_id"] == hospital_id
        assert opd_pass["doctor_id"] == doctor_id
        assert opd_pass["status"] == "ACTIVE"

        # -----------------------------
        # GET ALL OPD PASSES AS ADMIN
        # -----------------------------
        all_response = admin_client.get(
            "/opd-pass/",
            headers=admin_headers,
        )

        print("\nGET ALL OPD PASSES RESPONSE:")
        print(all_response.json())

        assert all_response.status_code == 200

        all_passes = all_response.json()

        assert isinstance(all_passes, list)
        assert any(
            item["_id"] == opd_pass_id
            for item in all_passes
        )

        # -----------------------------
        # UPDATE OPD PASS
        # -----------------------------
        update_response = admin_client.put(
            f"/opd-pass/{opd_pass_id}",
            headers=admin_headers,
            params={
                "status": "USED"
            },
        )

        print("\nUPDATE OPD PASS RESPONSE:")
        print(update_response.json())

        assert update_response.status_code == 200

        update_data = update_response.json()

        assert update_data["message"] == (
            "OPD pass updated successfully"
        )

        assert update_data["status"] == "USED"

        # -----------------------------
        # VERIFY UPDATE
        # -----------------------------
        verify_response = patient_client.get(
            f"/opd-pass/{opd_pass_id}",
            headers=patient_headers,
        )

        print("\nVERIFY OPD PASS RESPONSE:")
        print(verify_response.json())

        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "USED"

        # -----------------------------
        # DELETE OPD PASS
        # -----------------------------
        delete_response = admin_client.delete(
            f"/opd-pass/{opd_pass_id}",
            headers=admin_headers,
        )

        print("\nDELETE OPD PASS RESPONSE:")
        print(delete_response.json())

        assert delete_response.status_code == 200

        assert delete_response.json()["message"] == (
            "OPD pass deleted successfully"
        )

    finally:
        close_mongodb_connection()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     