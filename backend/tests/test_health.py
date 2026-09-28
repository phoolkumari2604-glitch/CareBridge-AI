from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import connect_to_mongodb, close_mongodb_connection, get_database


def get_client():
    connect_to_mongodb()
    return TestClient(app)


def test_health_profile_create_get_update_delete():
    client = get_client()
    db = get_database()

    admin_email = f"health_admin_{uuid4().hex[:8]}@example.com"
    patient_email = f"health_patient_{uuid4().hex[:8]}@example.com"

    # REGISTER ADMIN
    register_admin = client.post(
        "/auth/register",
        json={
            "name": "Health Admin",
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
            "name": "Health Test Patient",
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
            "name": "Health Test Patient",
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

    # CREATE HEALTH PROFILE
    create_response = client.post(
        "/health-profiles/",
        headers=patient_headers,
        json={
            "patient_id": patient_id,
            "height_cm": 165,
            "weight_kg": 60,
            "blood_pressure": "120/80",
            "blood_sugar": 95,
            "allergies": ["Dust"],
            "medical_conditions": ["None"],
            "medications": ["None"],
        },
    )

    print("\nCREATE HEALTH PROFILE RESPONSE:")
    print(create_response.json())

    assert create_response.status_code == 200

    # GET HEALTH PROFILE
    get_response = client.get(
        f"/health-profiles/{patient_id}",
        headers=patient_headers,
    )

    print("\nGET HEALTH PROFILE RESPONSE:")
    print(get_response.json())

    assert get_response.status_code == 200
    assert get_response.json()["patient_id"] == patient_id
    assert get_response.json()["weight_kg"] == 60
    assert get_response.json()["height_cm"] == 165

    # UPDATE HEALTH PROFILE
    update_response = client.put(
        f"/health-profiles/{patient_id}",
        headers=patient_headers,
        json={
            "weight_kg": 62,
        },
    )

    print("\nUPDATE HEALTH PROFILE RESPONSE:")
    print(update_response.json())

    assert update_response.status_code == 200

    # VERIFY UPDATE
    verify_response = client.get(
        f"/health-profiles/{patient_id}",
        headers=patient_headers,
    )

    print("\nVERIFY UPDATED HEALTH PROFILE:")
    print(verify_response.json())

    assert verify_response.status_code == 200
    assert verify_response.json()["weight_kg"] == 62

    # DUPLICATE CREATE SHOULD FAIL
    duplicate_response = client.post(
        "/health-profiles/",
        headers=patient_headers,
        json={
            "patient_id": patient_id,
            "height_cm": 165,
            "weight_kg": 60,
            "blood_pressure": "120/80",
            "blood_sugar": 95,
            "allergies": [],
            "medical_conditions": [],
            "medications": [],
        },
    )

    assert duplicate_response.status_code == 409

    # DELETE HEALTH PROFILE
    delete_response = client.delete(
        f"/health-profiles/{patient_id}",
        headers=admin_headers,
    )

    print("\nDELETE HEALTH PROFILE RESPONSE:")
    print(delete_response.json())

    assert delete_response.status_code == 200

    # VERIFY DELETE
    final_response = client.get(
        f"/health-profiles/{patient_id}",
        headers=patient_headers,
    )

    assert final_response.status_code == 404

    close_mongodb_connection()
