import os
import sys
import uuid
import json

sys.path.insert(0, os.path.dirname(__file__))
from app import create_app

def test_upgrades():
    app = create_app()
    client = app.test_client()
    test_id = uuid.uuid4().hex[:8]

    print("\n--- 1. Testing Registration & Authentication ---")
    reg_email = f"opd_test_patient_{test_id}@carebridge.test"
    reg_payload = {
        "name": f"OPD Patient {test_id.upper()}",
        "email": reg_email,
        "password": "SecurePassword123!",
        "phone": "+91 9876543210",
        "age": 32,
        "gender": "Male",
        "blood_group": "O+",
        "heart_rate": 72,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 99.0,
        "temperature": 36.8,
        "weight": 70.0,
        "height": 175.0,
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.data}"
    patient_id = reg_res.get_json()["patient_id"]

    login_res = client.post("/api/auth/login", json={"email": reg_email, "password": "SecurePassword123!"})
    assert login_res.status_code == 200
    token = login_res.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Registered & Logged in patient {reg_email} (patient_id: {patient_id})")

    print("\n--- 2. Testing OPD Pass Creation & Verification ---")
    # Query doctor and hospital
    hosp_res = client.get("/api/hospitals/", headers=headers)
    hospitals = hosp_res.get_json()["hospitals"]
    hospital_id = hospitals[0]["id"]

    doc_res = client.get("/api/doctors/", headers=headers)
    doctors = doc_res.get_json()
    doctor_id = str(doctors[0]["_id"])

    # Book an appointment first
    apt_res = client.post("/api/appointments/", json={
        "patient_id": patient_id,
        "hospital_id": hospital_id,
        "doctor_id": doctor_id,
        "appointment_date": "2026-10-15",
        "appointment_time": "10:30 AM",
        "reason": "Cardiology Consultation"
    }, headers=headers)
    assert apt_res.status_code in [200, 201], f"Booking failed: {apt_res.data}"
    
    appts_res = client.get(f"/api/appointments/?patient_id={patient_id}", headers=headers)
    appts = appts_res.get_json()
    apt_id = str(appts[0]["_id"])
    print(f"[PASS] Booked appointment: {apt_id}")

    # Create OPD pass
    pass_res = client.post(f"/api/opd-pass/{apt_id}", headers=headers)
    assert pass_res.status_code in [200, 201], f"Create pass failed: {pass_res.data}"
    pass_data = pass_res.get_json()
    pass_number = pass_data["pass_number"]
    print(f"[PASS] Digital OPD Pass generated: {pass_number}")

    # Standard Verify
    verify_res = client.post("/api/opd-pass/validate", json={"pass_number": pass_number}, headers=headers)
    assert verify_res.status_code == 200
    v_data = verify_res.get_json()
    assert v_data["valid"] is True
    print(f"[PASS] OPD Pass validate returned valid status for {pass_number}")

    print("\n--- 3. Testing OPD Pass OTP Request & Verification ---")
    otp_req = client.post("/api/opd-pass/request-otp", json={"pass_number": pass_number}, headers=headers)
    assert otp_req.status_code == 200
    otp_data = otp_req.get_json()
    demo_otp = otp_data.get("demo_otp")
    assert demo_otp is not None, "Demo OTP should be returned for test environment"
    print(f"[PASS] OTP requested successfully, code: {demo_otp}, masked: {otp_data.get('masked_contact')}")

    # Test Invalid OTP Code
    bad_otp_res = client.post("/api/opd-pass/verify-otp", json={"pass_number": pass_number, "otp": "000000"}, headers=headers)
    assert bad_otp_res.status_code == 400
    print(f"[PASS] Invalid OTP correctly rejected with remaining attempts")

    # Test Valid OTP Code
    good_otp_res = client.post("/api/opd-pass/verify-otp", json={"pass_number": pass_number, "otp": demo_otp}, headers=headers)
    assert good_otp_res.status_code == 200
    verified_data = good_otp_res.get_json()
    assert verified_data.get("verified") is True
    assert verified_data.get("pass_number") == pass_number
    print(f"[PASS] OTP verification successful: {verified_data.get('message')}")

    print("\n--- 4. Testing Hospital Search, Filtering & Bad Data Exclusion ---")
    # Query all hospitals
    all_hospitals_res = client.get("/api/hospitals?limit=50")
    assert all_hospitals_res.status_code == 200
    all_hospitals = all_hospitals_res.get_json()["hospitals"]
    assert len(all_hospitals) > 0
    # Verify no invalid hospital names
    for h in all_hospitals:
        name = h.get("name", "")
        assert name.lower() not in ["string", "n/a", ""], f"Bad hospital name found: {name}"
    print(f"[PASS] Retrieved {len(all_hospitals)} sanitized hospitals with valid names")

    # Query with Search query matching specialty (e.g. Cardiology)
    search_spec_res = client.get("/api/hospitals?search=Cardiology")
    assert search_spec_res.status_code == 200
    spec_hospitals = search_spec_res.get_json()["hospitals"]
    print(f"[PASS] Search by specialty 'Cardiology' matched {len(spec_hospitals)} hospitals")

    # Query with Country filter
    india_res = client.get("/api/hospitals?country=India")
    assert india_res.status_code == 200
    india_hospitals = india_res.get_json()["hospitals"]
    print(f"[PASS] Filter by Country 'India' matched {len(india_hospitals)} hospitals")

    # Query with Emergency Filter
    em_res = client.get("/api/hospitals?emergency=true")
    assert em_res.status_code == 200
    em_hospitals = em_res.get_json()["hospitals"]
    for h in em_hospitals:
        assert h.get("emergency") is True
    print(f"[PASS] Filter by Emergency 'true' matched {len(em_hospitals)} 24/7 emergency facilities")

    print("\n==========================================================")
    print(">>> ALL UPGRADE AND STABILITY TESTS PASSED WITH 100% <<<")
    print("==========================================================\n")

if __name__ == "__main__":
    test_upgrades()
