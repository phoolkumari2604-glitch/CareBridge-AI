import os
import json
import io
import pytest
from app import create_app
from app.core.database import get_database

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_flask_e2e(client):
    db = get_database()
    print("\n--- 1. Testing Root & Health Endpoints ---")
    res = client.get("/")
    assert res.status_code == 200
    data = res.get_json()
    assert "CareBridge AI" in data.get("message", "")

    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json().get("status") == "healthy"

    print("\n--- 2. Testing Registration & Login ---")
    test_email = f"flask_test_patient_{os.urandom(4).hex()}@carebridge.test"
    reg_payload = {
        "name": "Flask Test Patient",
        "email": test_email,
        "password": "Password123!",
        "phone": "+91-9876543210"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code in [201, 409], f"Registration failed: {res.data}"

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.data}"
    login_data = login_res.get_json()
    token = login_data["access_token"]
    user_info = login_data["user"]
    patient_id = user_info.get("patient_id")
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in patient: {user_info['email']}, patient_id: {patient_id}")

    # Me endpoint
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["email"] == test_email

    print("\n--- 3. Testing Hospital & Leafmap Endpoints ---")
    hosp_res = client.get("/api/hospitals/", headers=headers)
    assert hosp_res.status_code == 200
    hospitals = hosp_res.get_json()
    print(f"Fetched {len(hospitals)} registered hospitals")

    # If no hospital in db, insert one for testing
    if len(hospitals) == 0:
        h_ins = db.hospitals.insert_one({
            "name": "CareBridge Memorial Hospital",
            "city": "New Delhi",
            "address": "Connaught Place",
            "phone": "+91-11-2345-6789",
            "emergency": True,
            "lat": 28.6139,
            "lng": 77.2090
        })
        hospital_id = str(h_ins.inserted_id)
    else:
        hospital_id = str(hospitals[0]["_id"])

    # Test Leafmap HTML map endpoint
    map_res = client.get("/api/hospitals/map/html?lat=28.6139&lng=77.2090")
    assert map_res.status_code == 200
    assert "html" in map_res.content_type
    assert b"leaflet" in map_res.data.lower() or b"folium" in map_res.data.lower() or b"map" in map_res.data.lower()
    print("Leafmap interactive HTML generated successfully")

    # Test Real-time nearby endpoint
    nearby_res = client.get("/api/hospitals/nearby/realtime?lat=28.6139&lng=77.2090&radius_km=15", headers=headers)
    assert nearby_res.status_code == 200
    nearby_data = nearby_res.get_json()
    assert "hospitals" in nearby_data
    print(f"Fetched nearby realtime facilities: {len(nearby_data['hospitals'])} hospitals, {len(nearby_data.get('police_stations', []))} police stations")

    print("\n--- 4. Testing Doctor Endpoints ---")
    doc_res = client.get("/api/doctors/", headers=headers)
    assert doc_res.status_code == 200
    doctors = doc_res.get_json()
    if len(doctors) == 0:
        d_ins = db.doctors.insert_one({
            "name": "Dr. Sarah Jenkins",
            "specialty": "Cardiology",
            "hospital_id": hospital_id,
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

    print("\n--- 5. Testing Appointments & Workflow ---")
    appt_payload = {
        "patient_id": patient_id,
        "hospital_id": hospital_id,
        "doctor_id": doctor_id,
        "appointment_date": "2026-10-15",
        "appointment_time": "10:00 AM",
        "reason": "Cardiology Checkup and ECG"
    }
    appt_res = client.post("/api/appointments/", json=appt_payload, headers=headers)
    assert appt_res.status_code in [201, 409], f"Appointment booking failed: {appt_res.data}"
    
    appts_list_res = client.get(f"/api/appointments/?patient_id={patient_id}", headers=headers)
    assert appts_list_res.status_code == 200
    appts = appts_list_res.get_json()
    assert len(appts) > 0, "Expected at least one appointment for patient"
    appointment_id = str(appts[0]["_id"])
    print(f"Appointment booked and retrieved: {appointment_id}")

    print("\n--- 6. Testing Approvals, Digital OPD Pass, Live Queue & SmartFlow ---")
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

    print("\n--- 7. Testing Vitals & Health Alerts ---")
    vitals_payload = {
        "patient_id": patient_id,
        "heart_rate": 76,
        "systolic_bp": 122,
        "diastolic_bp": 82,
        "spo2": 99,
        "temperature": 36.6,
        "blood_sugar": 96
    }
    v_res = client.post("/api/vitals/", json=vitals_payload, headers=headers)
    assert v_res.status_code == 201
    
    latest_v_res = client.get(f"/api/vitals/{patient_id}/latest", headers=headers)
    assert latest_v_res.status_code == 200
    assert latest_v_res.get_json()["heart_rate"] == 76
    print("Vitals recorded and verified")

    # Health Alerts
    alerts_res = client.get(f"/api/health-alerts/{patient_id}", headers=headers)
    assert alerts_res.status_code == 200
    alerts_summary = client.get(f"/api/health-alerts/{patient_id}/summary", headers=headers)
    assert alerts_summary.status_code == 200
    print(f"Health alerts summary: {alerts_summary.get_json()['status']}")

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

    print("\n--- 9. Testing AI Assistant & History ---")
    ai_res = client.post("/api/ai-assistant/chat", json={
        "patient_id": patient_id,
        "message": "Can you explain my recent blood pressure readings?"
    }, headers=headers)
    assert ai_res.status_code == 200
    ai_data = ai_res.get_json()
    assert "response" in ai_data
    assert "disclaimer" in ai_data
    print("AI Assistant response verified:", ai_data["response"][:80], "...")

    ai_hist_res = client.get(f"/api/ai-assistant/history/{patient_id}", headers=headers)
    assert ai_hist_res.status_code == 200
    assert len(ai_hist_res.get_json()) >= 2
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
