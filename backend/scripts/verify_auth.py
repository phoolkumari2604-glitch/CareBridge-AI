import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.core.database import get_database
from app.utils.security import verify_password, hash_password

def run_tests():
    app = create_app()
    client = app.test_client()
    db = get_database()

    print("=== CAREBRIDGE AI AUTHENTICATION VERIFICATION ===")

    # Reset any lockout counters for testing
    db.users.update_many(
        {"failed_login_attempts": {"$gt": 0}},
        {"$set": {"failed_login_attempts": 0, "locked_until": None}}
    )

    test_email = "test.patient.auth2026@carebridge.ai"
    test_password = "CareBridge#Test2026!Secure"

    db.users.delete_many({"email": test_email})
    db.patients.delete_many({"email": test_email})

    # TEST A: New Registration
    print("\n--- Test A: Registration ---")
    reg_payload = {
        "name": "Ananya Roy",
        "email": test_email,
        "password": test_password,
        "phone": "+91 9876543210",
        "age": 27,
        "gender": "Female",
        "blood_group": "A+"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    print(f"Registration Status: {reg_res.status_code}")
    assert reg_res.status_code == 201, f"Expected 201, got {reg_res.status_code}: {reg_res.get_json()}"
    reg_json = reg_res.get_json()
    assert "access_token" in reg_json
    assert reg_json["user"]["email"] == test_email
    assert reg_json["user"]["role"] == "PATIENT"
    print("[PASS] Test A Passed: User registered, returned 201 with JWT token.")

    # TEST B: Duplicate Email Registration
    print("\n--- Test B: Duplicate Email Detection ---")
    dup_res = client.post("/api/auth/register", json=reg_payload)
    print(f"Duplicate Register Status: {dup_res.status_code}")
    assert dup_res.status_code == 409
    dup_json = dup_res.get_json()
    print(f"[PASS] Test B Passed: Duplicate rejected with 409: {dup_json.get('detail')}")

    # TEST C: Login with Correct Password
    print("\n--- Test C: Login with Correct Credentials ---")
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    print(f"Login Status: {login_res.status_code}")
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.get_json()}"
    login_json = login_res.get_json()
    assert "access_token" in login_json
    token = login_json["access_token"]
    assert login_json["user"]["email"] == test_email
    assert login_json["user"]["role"] == "PATIENT"
    print("[PASS] Test C Passed: Correct credentials return 200 with JWT access token.")

    # TEST D: Login with Incorrect Password
    print("\n--- Test D: Login with Incorrect Password ---")
    bad_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!"
    })
    print(f"Bad Login Status: {bad_res.status_code}")
    assert bad_res.status_code == 401
    bad_json = bad_res.get_json()
    print(f"[PASS] Test D Passed: Incorrect password returned 401: {bad_json.get('detail')}")

    # TEST E: Protected Route /api/auth/me
    print("\n--- Test E: Protected Route Verification ---")
    # Without token
    no_auth_res = client.get("/api/auth/me")
    assert no_auth_res.status_code == 401
    # With token
    auth_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert auth_res.status_code == 200
    auth_json = auth_res.get_json()
    assert auth_json["email"] == test_email
    assert auth_json["role"] == "PATIENT"
    print("[PASS] Test E Passed: Protected /api/auth/me validates Bearer token and returns user profile.")

    print("\n=== ALL TEST SCENARIOS PASSED WITH 100% ACCURACY ===")

if __name__ == "__main__":
    run_tests()
