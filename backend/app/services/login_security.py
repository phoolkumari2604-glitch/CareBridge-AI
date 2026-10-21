import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from flask import request, has_request_context

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
CAPTCHA_THRESHOLD = 3


def ensure_utc(dt):
    """Safely convert offset-naive or ISO string datetime to timezone-aware UTC datetime."""
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    if isinstance(dt, datetime):
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def get_client_ip() -> str:
    """Extract client IP address safely for rate limiting."""
    if not has_request_context():
        return "127.0.0.1"
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


def log_dev_auth_event(code: str, email: str, detail: str):
    """Log structured authentication events in development only (never logs passwords)."""
    env = os.getenv("FLASK_ENV", "development").lower()
    if env != "production":
        print(f"[AuthSecurity][{code}] email={email} ip={get_client_ip()} | {detail}")


def generate_login_challenge(answer: str = None) -> dict:
    """Generate a lightweight server-signed 4-digit numeric challenge."""
    if not answer or not str(answer).isdigit():
        answer = str(secrets.randbelow(9000) + 1000)
    else:
        answer = str(answer).strip()
    secret = os.getenv("JWT_SECRET_KEY", "carebridge-default-secret")
    nonce = secrets.token_hex(8)
    sig = hmac.new(
        secret.encode("utf-8"),
        f"{nonce}:{answer}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return {
        "captcha": answer,
        "code": answer,
        "question": answer,
        "token": f"{nonce}:{sig}",
        "captcha_token": f"{nonce}:{sig}",
    }


def verify_login_challenge(token: str, user_answer: str) -> bool:
    """Verify the user's answer against the server-signed challenge token."""
    if not token or not user_answer or ":" not in token:
        return False
    nonce, sig = token.split(":", 1)
    secret = os.getenv("JWT_SECRET_KEY", "carebridge-default-secret")
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        f"{nonce}:{str(user_answer).strip()}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(sig, expected_sig)


def check_ip_and_account_lockout(db, email: str, user: dict | None, now: datetime):
    """
    Check both IP-level and account-level lockouts.
    Returns (is_locked, remaining_seconds, failed_count).
    """
    ip_addr = get_client_ip()
    ip_doc = db.login_rate_limits.find_one({"ip": ip_addr})
    ip_failed = 0

    if ip_doc:
        ip_locked_until = ensure_utc(ip_doc.get("locked_until"))
        ip_failed = ip_doc.get("failed_attempts", 0)
        if ip_locked_until and ip_locked_until > now:
            rem_sec = max(1, int((ip_locked_until - now).total_seconds()))
            return True, rem_sec, max(ip_failed, MAX_FAILED_ATTEMPTS)
        elif ip_locked_until and ip_locked_until <= now:
            db.login_rate_limits.update_one(
                {"_id": ip_doc["_id"]},
                {"$set": {"failed_attempts": 0, "locked_until": None}},
            )
            ip_failed = 0

    if user:
        user_locked_until = ensure_utc(user.get("locked_until"))
        user_failed = user.get("failed_login_attempts") or 0
        if user_locked_until and user_locked_until > now:
            rem_sec = max(1, int((user_locked_until - now).total_seconds()))
            return True, rem_sec, max(user_failed, MAX_FAILED_ATTEMPTS)
        elif user_locked_until and user_locked_until <= now:
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"failed_login_attempts": 0, "locked_until": None}},
            )
            user_failed = 0
        return False, 0, max(user_failed, ip_failed)

    return False, 0, ip_failed


def record_failed_login(db, email: str, user: dict | None, now: datetime) -> dict:
    """
    Increment failed login counters for both IP and account.
    Returns structured payload with generic message and optional remaining_attempts / lockout.
    """
    ip_addr = get_client_ip()
    ip_doc = db.login_rate_limits.find_one({"ip": ip_addr})
    ip_failed = (ip_doc.get("failed_attempts", 0) if ip_doc else 0) + 1
    ip_update = {"failed_attempts": ip_failed, "updated_at": now}

    if ip_failed >= MAX_FAILED_ATTEMPTS * 2:
        ip_update["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)

    db.login_rate_limits.update_one(
        {"ip": ip_addr},
        {"$set": ip_update},
        upsert=True,
    )

    user_failed = 0
    locked_until = None

    if user:
        user_failed = (user.get("failed_login_attempts") or 0) + 1
        user_update = {"failed_login_attempts": user_failed, "updated_at": now}
        if user_failed >= MAX_FAILED_ATTEMPTS:
            locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            user_update["locked_until"] = locked_until
            user_update["failed_login_attempts"] = 0
        db.users.update_one({"_id": user["_id"]}, {"$set": user_update})

    effective_failures = user_failed if user else min(ip_failed, MAX_FAILED_ATTEMPTS - 1)

    if locked_until:
        rem_sec = int(LOCKOUT_DURATION_MINUTES * 60)
        return {
            "locked": True,
            "status_code": 429,
            "code": "ACCOUNT_LOCKED",
            "detail": "Account temporarily locked due to 5 failed sign-in attempts. Please wait 15 minutes or reset your password.",
            "lockout_seconds": rem_sec,
            "remaining_attempts": 0,
        }

    # Generic message for attempts 1-3 so we never reveal which accounts exist
    response_payload = {
        "locked": False,
        "status_code": 401,
        "code": "INVALID_CREDENTIALS",
        "detail": "Invalid email or password",
    }

    # Only show remaining attempts after the 3rd failure (i.e. failure 3 or 4)
    if user and effective_failures >= 3:
        remaining = max(0, MAX_FAILED_ATTEMPTS - effective_failures)
        response_payload["remaining_attempts"] = remaining
        response_payload["detail"] = (
            f"Invalid email or password. {remaining} attempt(s) remaining before a 15-minute lockout."
        )

    if effective_failures >= CAPTCHA_THRESHOLD:
        response_payload["requires_captcha"] = True
        response_payload["captcha"] = generate_login_challenge()

    return response_payload


def reset_login_counters(db, user: dict, now: datetime):
    """Reset both account and IP failed attempt counters upon successful authentication."""
    ip_addr = get_client_ip()
    db.login_rate_limits.update_one(
        {"ip": ip_addr},
        {"$set": {"failed_attempts": 0, "locked_until": None, "updated_at": now}},
        upsert=True,
    )
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"failed_login_attempts": 0, "locked_until": None}},
    )


def attach_session_cookie(response, access_token: str, remember_me: bool = False):
    """Attach a secure httpOnly session cookie alongside the response."""
    max_age = 30 * 24 * 3600 if remember_me else 12 * 3600
    is_prod = os.getenv("FLASK_ENV", "development").lower() == "production"
    response.set_cookie(
        "cb_access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        secure=is_prod,
        samesite="Lax",
        path="/",
    )
    return response
