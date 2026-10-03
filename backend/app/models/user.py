from datetime import datetime, UTC


def create_user_document(
    name: str,
    email: str,
    password_hash: str,
    role: str,
    phone: str | None = None,
):
    """
    Create a MongoDB user document.
    """

    return {
        "name": name,
        "email": email.lower(),
        "password_hash": password_hash,
        "role": role,
        "phone": phone,
        "created_at":datetime.now(UTC),
    }

