from datetime import datetime, UTC


def create_user_document(
    name: str,
    email: str,
    password_hash: str,
    role: str,
    phone: str | None = None,
    status: str = "active",
    email_verified: bool = True,
):
    """
    Create a MongoDB user document.
    """
    now = datetime.now(UTC)
    return {
        "name": (name or "").strip(),
        "email": (email or "").strip().lower(),
        "password_hash": password_hash,
        "role": (role or "PATIENT").strip().upper(),
        "phone": phone,
        "status": status,
        "email_verified": email_verified,
        "failed_login_attempts": 0,
        "locked_until": None,
        "created_at": now,
        "updated_at": now,
    }

