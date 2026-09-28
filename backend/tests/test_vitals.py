from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection, get_database


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def test_vital_signs_create_get_update_delete():
    client = get_client()
    db = get_database()

    admin_email = f"vitals_admin_{uuid4().hex[:8]}@example.com"
    patient_email = f"vitals_patient_{uuid4().hex[:8]}@example.com"

    # REGISTER ADMIN
    register_admin = client.post(
        "/auth/register",
        json={
            "name": "Vitals Admin",
            "email": admin_email,
            "password": "Admin@12345",
            "role": "PATIENT",
        },
    )

    assert register_admin.status_code == 200

    db.users.update_one(
        {"email": admin_email},
        {"$set": {"role": "ADMIN"}},
    )

    # LOGIN ADMIN
    login_admin = client.post(
        "/auth/login",
        json={
            "email": admin_email,
            "password": "Admin@12345",
        },
    )

    assert login_admin.status_code == 200

    admin_token = login_admin.json()["access_token"]

    admin_headers = {
        "Authorization": f"Bearer {admin_token}"
    }

    # REGISTER PATIENT
    register_patient = client.post(
        "/auth/register",
        json={
            "name": "Vitals Test Patient",
            "email": patient_email,
            "password": "Patient@12345",
            "role": "PATIENT",
            "phone": "9876543210",
        },
    )

    assert register_patient.status_code == 200

    # LOGIN PATIENT
    login_patient = client.post(
        "/auth/login",
        json={
            "email": patient_email,
            "password": "Patient@12345",
        },
    )

    assert login_patient.status_code == 200

    patient_token = login_patient.json()["access_token"]

    patient_headers = {
        "Authorization": f"Bearer {patient_token}"
    }

    # CREATE PATIENT PROFILE
    patient_response = client.post(
        "/patients/",
        headers=admin_headers,
        json={
            "name": "Vitals Test Patient",
            "age": 25,
            "gender": "Female",
            "phone": "9876543210",
            "email": patient_email,
        },
    )

    print("\nCREATE PATIENT RESPONSE:")
    print(patient_response.json())

    assert patient_response.status_code == 200

    patient_id = patient_response.json()["patient_id"]

    # CREATE VITAL SIGNS
    create_response = client.post(
        "/vitals/",
        headers=patient_headers,
        json={
            "patient_id": patient_id,
            "heart_rate": 72,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "blood_sugar": 95,
            "temperature": 98.6,
            "spo2": 98,
            "weight_kg": 60,
        },
    )

    print("\nCREATE VITAL SIGNS RESPONSE:")
    print(create_response.json())

    assert create_response.status_code == 200

    vital_id = create_response.json()["vital_id"]

    # GET VITAL SIGN
    get_response = client.get(
        f"/vitals/{patient_id}",
        headers=patient_headers,
    )

    print("\nGET VITAL SIGN RESPONSE:")
    print(get_response.json())

    assert get_response.status_code == 200

    vital_data = get_response.json()[0]

    assert vital_data["patient_id"] == patient_id
    assert vital_data["heart_rate"] == 72
    assert vital_data["systolic_bp"] == 120
    assert vital_data["diastolic_bp"] == 80
    assert vital_data["blood_sugar"] == 95
    assert vital_data["temperature"] == 98.6
    assert vital_data["spo2"] == 98
    assert vital_data["weight_kg"] == 60

    # UPDATE VITAL SIGNS
    update_response = client.put(
        f"/vitals/{vital_id}",
        headers=patient_headers,
        json={
            "heart_rate": 75,
            "systolic_bp": 125,
            "weight_kg": 62,
        },
    )

    print("\nUPDATE VITAL SIGNS RESPONSE:")
    print(update_response.json())

    assert update_response.status_code == 200

    # VERIFY UPDATE
    verify_response = client.get(
        f"/vitals/{patient_id}",
        headers=patient_headers,
    )

    print("\nVERIFY UPDATED VITAL SIGNS:")
    print(verify_response.json())

    assert verify_response.status_code == 200

    updated_data = verify_response.json()

    assert updated_data["heart_rate"] == 75
    assert updated_data["systolic_bp"] == 125
    assert updated_data["weight_kg"] == 62

    # GET PATIENT VITAL HISTORY
    history_response = client.get(
        f"/vitals/patient/{patient_id}",
        headers=patient_headers,
    )

    print("\nVITAL HISTORY RESPONSE:")
    print(history_response.json())

    assert history_response.status_code == 200
    assert len(history_response.json()) >= 1

    # DELETE VITAL SIGN
    delete_response = client.delete(
        f"/vitals/{vital_id}",
        headers=admin_headers,
    )

    print("\nDELETE VITAL SIGN RESPONSE:")
    print(delete_response.json())

    assert delete_response.status_code == 200

    # VERIFY DELETE
    final_response = client.get(
        f"/vitals/{patient_id}",
        headers=patient_headers,
    )

    assert final_response.status_code == 404

    close_mongodb_connection()






