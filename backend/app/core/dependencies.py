from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from bson import ObjectId

from app.core.database import get_database
from app.core.security import decode_access_token


security = HTTPBearer(
    scheme_name="BearerAuth",
    auto_error=True
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get the currently authenticated user from the JWT token.
    """

    token = credentials.credentials

    try:
        payload = decode_access_token(token)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    try:
        object_id = ObjectId(user_id)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    db = get_database()

    user = db.users.find_one(
        {
            "_id": object_id
        }
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return user


# ============================================================
# ROLE-BASED AUTHORIZATION
# ============================================================

def require_patient(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow PATIENT users only.
    """

    if current_user.get("role") != "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required"
        )

    return current_user


def require_staff(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow STAFF users only.
    """

    if current_user.get("role") != "STAFF":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )

    return current_user


def require_admin(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow ADMIN users only.
    """

    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def require_staff_or_admin(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow STAFF or ADMIN users.
    """

    if current_user.get("role") not in {
        "STAFF",
        "ADMIN"
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or admin access required"
        )

    return current_user


def require_patient_or_staff_or_admin(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow any authenticated application user.
    """

    if current_user.get("role") not in {
        "PATIENT",
        "STAFF",
        "ADMIN"
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid application role required"
        )

    return current_user