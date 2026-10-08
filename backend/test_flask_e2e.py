import os
import io
import time
import uuid
import random
from app import create_app
from bson import ObjectId
from app.core.database import get_database

def test_flask_e2e(client):
    db = get_database()
    test_id = uuid.uuid4().hex[:8]

    print("\n--- 1. Testing Root & Health Endpoints ---")
    res = client.get("/")
    assert res.status_code == 200
    assert "CareBridge AI" in res.get_json()["service"]
    
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.get_json()["database"] == "connected"
    print("Health and root endpoints OK")

    print("\n--- 2. Testing Registration with Baseline Vitals & Login ---")
    reg_email = f"flask_test_patient_{test_id}@carebridge.test"
    reg_payload = {
        "name": f"Test Patient {test_id.upper()}",
        "email": reg_email,
        "password": "SecurePassword123!",
        "phone": "+91 9876543210",
        "age": 29,
        "gender": "Female",
        "blood_group": "B+",
        "heart_rate": 74,
        "systolic_bp": 118,
        "diastolic_bp": 78,
        "spo2": 99.0,
        "temperature": 36.6,
        "weight": 62.5,
        "height": 168.0,
        "allergies": "Penicillin",
        "medical_history": "Mild Rhinitis"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.data}"
    reg_data = reg_res.get_json()
    patient_id = reg_data.get("patient_id")
    assert patient_id is not None

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in patient with baseline vitals: {reg_email}, patient_id: {patient_id}")

    # Verify initial vitals persisted
    v_init_res = client.get(f"/api/vitals/{patient_id}/latest", headers=headers)
    assert v_init_res.status_code == 200
    v_init_data = v_init_res.get_json()
    assert v_init_data["heart_rate"] == 74
    print("Registration baseline vitals verified successfully in vital_signs")

    print("\n--- 3. Testing Password Change Endpoint ---")
    pw_res = client.post("/api/auth/change-password", json={
        "current_password": "SecurePassword123!",
        "new_password": "NewSecurePassword456!"
    }, headers=headers)
    assert pw_res.status_code == 200
    print("Password changed successfully via /api/auth/change-password")

    # Login with new password
    new_login_res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "NewSecurePassword456!"
    })
    assert new_login_res.status_code == 200
    token = new_login_res.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 4. Testing Hospital & Leafmap Endpoints ---")
    hosp_res = client.get("/api/hospitals/", headers=headers)
    assert hosp_res.status_code == 200
    hospitals = hosp_res.get_json()
    assert len(hospitals) > 0
    hospital_id = str(hospitals[0]["_id"])
    print(f"Fetched {len(hospitals)} registered hospitals")

    # Leafmap map generation
    map_res = client.get("/api/hospitals/map/html?lat=12.9716&lon=77.5946&zoom=12", headers=headers)
    assert map_res.status_code == 200
    assert "text/html" in map_res.content_type
    print("Leafmap interactive HTML generated successfully")

    print("\n--- 5. Testing Doctor Endpoints & Doctor Profile Update ---")
    doc_res = client.get("/api/doctors/", headers=headers)
    assert doc_res.status_code == 200
    doctors = doc_res.get_json()
    if len(doctors) == 0:
        d_ins = db.doctors.insert_one({
            "name": "Dr. Sarah Jenkins",
            "specialty": "Cardiology",
            "hospital_id": ObjectId(hospital_id),
            "available_days": ["Monday", "Wednesday", "Friday"],
            "available_slots": ["10:00 AM", "11:30 AM", "02:00 PM"],
            "status": "AVAILABLE"
        })
        doctor_id = str(d_ins.inserted_id)
    else:
        doctor_id = str(doctors[0]["_id"])

    avail_res = client.get(f"/api/doctors/{doctor_id}/availability", headers=headers)
    assert avail_res.status_code == 200
    print(f"Doctor availability verified for doctor_id: {doctor_id}")

    print("\n--- 6. Testing Appointments & Workflow ---")
    unique_date = f"2026-11-{random.randint(10, 28)}"
    unique_time = f"0{random.randint(1,9)}:30 AM"
    appt_payload = {
        "patient_id": patient_id,
        "hospital_id": hospital_id,
        "doctor_id": doctor_id,
        "appointment_date": unique_date,
        "appointment_time": unique_time,
        "reason": "Cardiology Consultation and ECG"
    }
    appt_res = client.post("/api/appointments/", json=appt_payload, headers=headers)
    assert appt_res.status_code in [201, 409], f"Appointment booking failed: {appt_res.data}"
    
    appts_list_res = client.get(f"/api/appointments/?patient_id={patient_id}", headers=headers)
    assert appts_list_res.status_code == 200
    appts = appts_list_res.get_json()
    assert len(appts) > 0, "Expected at least one appointment for patient"
    appointment_id = str(appts[0]["_id"])
    print(f"Appointment booked and retrieved: {appointment_id}")

    print("\n--- 7. Testing Approvals, Digital OPD Pass, Live Queue & SmartFlow ---")
    # SmartFlow
    sf_res = client.post(f"/api/smartflow/{appointment_id}", headers=headers)
    assert sf_res.status_code == 200, f"SmartFlow failed: {sf_res.data}"
    sf_data = sf_res.get_json()
    assert sf_data["approval"]["status"] == "APPROVED"
    assert sf_data["opd_pass"]["status"] == "ACTIVE"
    print(f"SmartFlow executed: OPD Pass {sf_data['opd_pass']['pass_number']}, Queue Token #{sf_data['queue']['token_number']}")

    # Get OPD Passes for patient
    opd_res = client.get(f"/api/opd-pass/?patient_id={patient_id}", headers=headers)
    assert opd_res.status_code == 200
    assert len(opd_res.get_json()) > 0
    print("Patient OPD Passes retrieved successfully")

    # Get Queue
    q_res = client.get("/api/queue/", headers=headers)
    assert q_res.status_code == 200
    print("Live queue retrieved successfully")

    print("\n--- 8. Testing Health Records & File Upload ---")
    rec_payload = {
        "patient_id": patient_id,
        "record_type": "Diagnostic Lab Report",
        "title": "Comprehensive Blood Profile",
        "diagnosis": "Normal lipid profile",
        "doctor_name": "Dr. Sarah Jenkins",
        "hospital_name": "CareBridge Memorial Hospital"
    }
    rec_res = client.post("/api/health-records/", json=rec_payload, headers=headers)
    assert rec_res.status_code == 201

    # File upload
    dummy_file = (io.BytesIO(b"CareBridge Health Lab Report Content PDF/TXT"), "blood_test.pdf")
    upload_res = client.post(
        "/api/health-records/upload",
        data={"file": dummy_file},
        content_type="multipart/form-data",
        headers=headers
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.get_json()
    assert "file_url" in upload_data
    print(f"Health record file uploaded successfully: {upload_data['file_url']}")

    print("\n--- 9. Testing AI Assistant (General Health + Emergency + Clinical Triage) ---")
    # General Question
    ai_res = client.post("/api/ai-assistant/chat", json={
        "patient_id": patient_id,
        "message": "What is healthy blood pressure and how can I maintain it?"
    }, headers=headers)
    assert ai_res.status_code == 200
    ai_data = ai_res.get_json()
    assert "response" in ai_data
    assert "disclaimer" in ai_data
    print("AI General Health response verified:", ai_data["response"][:80], "...")

    # Emergency Detection
    ai_em_res = client.post("/api/ai-assistant/chat", json={
        "patient_id": patient_id,
        "message": "I have sudden severe chest pain and cannot breathe"
    }, headers=headers)
    assert ai_em_res.status_code == 200
    ai_em_data = ai_em_res.get_json()
    assert ai_em_data.get("is_emergency") is True
    print("AI Emergency safety detection verified")

    # AI History
    ai_hist_res = client.get(f"/api/ai-assistant/history/{patient_id}", headers=headers)
    assert ai_hist_res.status_code == 200
    assert len(ai_hist_res.get_json()) >= 4
    print("AI conversation history stored and retrieved")

    print("\n--- 10. Testing Notifications ---")
    notif_res = client.post("/api/notifications/", json={
        "patient_id": patient_id,
        "title": "Appointment Confirmed",
        "message": "Your consultation with Dr. Sarah Jenkins is scheduled.",
        "notification_type": "APPOINTMENT"
    }, headers=headers)
    assert notif_res.status_code == 201

    get_notifs_res = client.get(f"/api/notifications/{patient_id}", headers=headers)
    assert get_notifs_res.status_code == 200
    notifs = get_notifs_res.get_json()
    assert len(notifs) > 0
    print(f"Notifications retrieved: {len(notifs)} messages")

    print("\n========================================================")
    print(">>> ALL 10 TEST SUITES PASSED WITH 100% SUCCESS <<<")
    print("========================================================")

if __name__ == "__main__":
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        test_flask_e2e(c)
