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
            "name": "Queue Test Admin",
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
            "name": "Queue Test Patient",
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
            "name": f"Queue Test Hospital {uuid4().hex[:6]}",
            "city": "Guntur",
            "address": "Queue Test Road",
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
            "name": f"Dr. Queue Test {uuid4().hex[:6]}",
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


def test_queue_create_get_update_delete():
    try:
        # -----------------------------
        # 1. ADMIN LOGIN
        # -----------------------------
        admin_client, admin_headers = create_admin_and_login()

        # -----------------------------
        # 2. CREATE HOSPITAL
        # -----------------------------
        hospital_id = create_test_hospital(
            admin_client,
            admin_headers,
        )

        print("\nHOSPITAL ID:")
        print(hospital_id)

        # -----------------------------
        # 3. CREATE DOCTOR
        # -----------------------------
        doctor_id = create_test_doctor(
            admin_client,
            admin_headers,
            hospital_id,
        )

        print("\nDOCTOR ID:")
        print(doctor_id)

        # -----------------------------
        # 4. PATIENT LOGIN
        # -----------------------------
        patient_client, patient_headers, patient_email = (
            create_patient_and_login()
        )

        # -----------------------------
        # 5. CREATE PATIENT PROFILE
        # -----------------------------
        patient_response = patient_client.post(
            "/patients/",
            headers=patient_headers,
            json={
                "name": "Queue Test Patient",
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
        # 6. CREATE APPOINTMENT
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
        # 7. CREATE APPROVAL
        # -----------------------------
        approval_response = admin_client.post(
            f"/approvals/{appointment_id}",
            headers=admin_headers,
        )

        print("\nCREATE APPROVAL RESPONSE:")
        print(approval_response.json())

        assert approval_response.status_code == 200

        approval_id = approval_response.json()["approval_id"]

        # -----------------------------
        # 8. APPROVE APPOINTMENT
        # -----------------------------
        approve_response = admin_client.put(
            f"/approvals/{approval_id}",
            headers=admin_headers,
            params={
                "status": "APPROVED"
            },
        )

        print("\nAPPROVE APPOINTMENT RESPONSE:")
        print(approve_response.json())

        assert approve_response.status_code == 200
        assert approve_response.json()["status"] == "APPROVED"

        # -----------------------------
        # 9. CREATE OPD PASS
        # -----------------------------
        opd_response = admin_client.post(
            f"/opd-pass/{appointment_id}",
            headers=admin_headers,
        )

        print("\nCREATE OPD PASS RESPONSE:")
        print(opd_response.json())

        assert opd_response.status_code == 200

        opd_pass_id = opd_response.json()["opd_pass_id"]

        # -----------------------------
        # 10. CREATE QUEUE ENTRY
        # -----------------------------
        queue_response = patient_client.post(
            "/queue/",
            headers=patient_headers,
            json={
                "appointment_id": appointment_id,
            },
        )

        print("\nCREATE QUEUE RESPONSE:")
        print(queue_response.json())

        assert queue_response.status_code == 200

        queue_data = queue_response.json()

        queue_id = queue_data["queue_id"]

        assert queue_data["message"] == (
            "Patient added to live queue successfully"
        )

        assert queue_data["appointment_id"] == appointment_id
        assert queue_data["token_number"] == 1
        assert queue_data["status"] == "WAITING"

        # -----------------------------
        # 11. GET QUEUE ENTRY
        # -----------------------------
        get_response = patient_client.get(
            f"/queue/{queue_id}",
            headers=patient_headers,
        )

        print("\nGET QUEUE RESPONSE:")
        print(get_response.json())

        assert get_response.status_code == 200

        queue_entry = get_response.json()

        assert queue_entry["_id"] == queue_id
        assert queue_entry["appointment_id"] == appointment_id
        assert queue_entry["opd_pass_id"] == opd_pass_id
        assert queue_entry["patient_id"] == patient_id
        assert queue_entry["hospital_id"] == hospital_id
        assert queue_entry["doctor_id"] == doctor_id
        assert queue_entry["token_number"] == 1
        assert queue_entry["status"] == "WAITING"
        assert queue_entry["patients_ahead"] == 0
        assert queue_entry["queue_position"] == 1

        # -----------------------------
        # 12. GET ALL QUEUE ENTRIES
        # -----------------------------
        all_response = patient_client.get(
            "/queue/",
            headers=patient_headers,
        )

        print("\nGET ALL QUEUE RESPONSE:")
        print(all_response.json())

        assert all_response.status_code == 200

        all_entries = all_response.json()

        assert isinstance(all_entries, list)

        assert any(
            item["_id"] == queue_id
            for item in all_entries
        )

        # -----------------------------
        # 13. UPDATE QUEUE STATUS
        # -----------------------------
        update_response = patient_client.put(
            f"/queue/{queue_id}",
            headers=patient_headers,
            json={
                "status": "CALLED"
            },
        )

        print("\nUPDATE QUEUE RESPONSE:")
        print(update_response.json())

        assert update_response.status_code == 200

        assert update_response.json()["message"] == (
            "Queue status updated successfully"
        )

        # -----------------------------
        # 14. VERIFY UPDATE
        # -----------------------------
        verify_response = patient_client.get(
            f"/queue/{queue_id}",
            headers=patient_headers,
        )

        print("\nVERIFY QUEUE RESPONSE:")
        print(verify_response.json())

        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "CALLED"

        # -----------------------------
        # 15. DELETE QUEUE ENTRY
        # -----------------------------
        delete_response = patient_client.delete(
            f"/queue/{queue_id}",
            headers=patient_headers,
        )

        print("\nDELETE QUEUE RESPONSE:")
        print(delete_response.json())

        assert delete_response.status_code == 200

        assert delete_response.json()["message"] == (
            "Queue entry deleted successfully"
        )

    finally:
        close_mongodb_connection()