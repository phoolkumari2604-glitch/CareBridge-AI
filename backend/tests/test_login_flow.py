import os
import sys
import re
import pytest

# Put backend root on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.core.database import get_database
from scripts.seed_staff import seed_staff_user
from scripts.update_phoolkumari import update_user


def test_login_flow_security_and_roles():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    db = get_database()
    # Ensure fresh staff and original admin user state
    seed_staff_user(db)
    update_user()

    # Verify staff user initial state
    staff_user = db.users.find_one({"email": "staff@carebridge.ai"})
    assert staff_user is not None
    assert staff_user["failed_login_attempts"] == 0
    assert staff_user["locked_until"] is None

    # 1. Missing captcha answer -> 400, no failed attempt penalty
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "staff@carebridge.ai",
            "password": "CareBridge#Staff2026!Admin",
            "role": "STAFF",
            "captcha_answer": "",
        },
    )
    assert resp.status_code == 400
    assert "4-digit" in resp.get_json()["detail"] or "security" in resp.get_json()["detail"].lower()

    # Verify attempt counter was NOT incremented
    staff_user = db.users.find_one({"email": "staff@carebridge.ai"})
    assert staff_user["failed_login_attempts"] == 0

    # 2. Fetch captcha via GET /api/auth/captcha
    captcha_resp = client.get("/api/auth/captcha")
    assert captcha_resp.status_code == 200
    c_data = captcha_resp.get_json()
    assert "captcha" in c_data or "code" in c_data or "question" in c_data
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    assert len(code) == 4
    assert code.isdigit()
    token = c_data.get("captcha_token") or c_data.get("token") or ""

    # 3. Incorrect captcha answer -> 400, no failed attempt penalty
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "staff@carebridge.ai",
            "password": "CareBridge#Staff2026!Admin",
            "role": "STAFF",
            "captcha_answer": "0000" if code != "0000" else "1111",
            "captcha_token": token,
        },
    )
    assert resp.status_code == 400
    assert "Incorrect security check answer" in resp.get_json()["detail"]

    # Verify attempt counter was NOT incremented
    staff_user = db.users.find_one({"email": "staff@carebridge.ai"})
    assert staff_user["failed_login_attempts"] == 0

    # 4. Password length < 8 characters -> 400 validation error
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "staff@carebridge.ai",
            "password": "short",
            "role": "STAFF",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 400
    assert "8 characters" in resp.get_json()["detail"]

    # 5. Role mismatch (e.g. regular staff user trying to log in as DOCTOR)
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "staff@carebridge.ai",
            "password": "CareBridge#Staff2026!Admin",
            "role": "DOCTOR",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.get_json()["detail"]
    staff_user = db.users.find_one({"email": "staff@carebridge.ai"})
    assert staff_user["failed_login_attempts"] == 1

    # 6. Wrong password -> 401
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "staff@carebridge.ai",
            "password": "WrongPassword123!",
            "role": "STAFF",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.get_json()["detail"]
    staff_user = db.users.find_one({"email": "staff@carebridge.ai"})
    assert staff_user["failed_login_attempts"] == 2

    # 7. Correct login for Staff
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "Staff@CareBridge.AI ",
            "password": "CareBridge#Staff2026!Admin",
            "role": "STAFF",
            "captcha_answer": code,
            "captcha_token": token,
            "remember": True,
        },
    )
    assert resp.status_code == 200
    res_data = resp.get_json()
    assert "access_token" in res_data
    assert res_data["user"]["email"] == "staff@carebridge.ai"
    assert res_data["user"]["role"] == "STAFF"

    # 8. Correct login for Doctor
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "doctor@carebridge.ai",
            "password": "CareBridge#Doc2026!Secure",
            "role": "DOCTOR",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["role"] == "DOCTOR"

    # 9. Correct login for Patient
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "patient@carebridge.ai",
            "password": "CareBridge#Pt2026!Secure",
            "role": "PATIENT",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["role"] == "PATIENT"

    # 10. Login with original email: phoolkumari2604@gmail.com
    # 10a. Login as DOCTOR portal
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "phoolkumari2604@gmail.com",
            "password": "CareBridge#2026!Secure",
            "role": "DOCTOR",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "phoolkumari2604@gmail.com"
    assert resp.get_json()["user"]["role"] == "DOCTOR"
    assert resp.get_json()["user"]["doctor_id"] is not None

    # 10b. Login as PATIENT portal
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "phoolkumari2604@gmail.com",
            "password": "CareBridge#2026!Secure",
            "role": "PATIENT",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "phoolkumari2604@gmail.com"
    assert resp.get_json()["user"]["role"] == "PATIENT"
    assert resp.get_json()["user"]["patient_id"] is not None

    # 10c. Login as STAFF portal
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "phoolkumari2604@gmail.com",
            "password": "CareBridge#2026!Secure",
            "role": "STAFF",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "phoolkumari2604@gmail.com"
    assert resp.get_json()["user"]["role"] == "STAFF"

    # 10d. Universal Login (/login without role specified)
    c_data = client.get("/api/auth/captcha").get_json()
    code = str(c_data.get("code") or c_data.get("captcha") or c_data.get("question")).strip()
    token = c_data.get("captcha_token") or c_data.get("token") or ""
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "phoolkumari2604@gmail.com",
            "password": "CareBridge#2026!Secure",
            "role": "",
            "captcha_answer": code,
            "captcha_token": token,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "phoolkumari2604@gmail.com"
    assert "access_token" in resp.get_json()

    print("\n[SUCCESS] ALL LOGIN FLOW AND MULTI-ROLE AUTHENTICATION INTEGRATION TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_login_flow_security_and_roles()
