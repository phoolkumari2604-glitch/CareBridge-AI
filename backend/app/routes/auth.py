from datetime import timedelta

from fastapi import APIRouter, HTTPException, Depends

from app.core.database import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.core.dependencies import (
    get_current_user,
    require_admin,
)

from app.models.user import create_user_document
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER PATIENT
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
)
def register_user(
    user: RegisterRequest,
):
    db = get_database()

    # Public registration is allowed only for PATIENT
    role = user.role.upper()

    if role != "PATIENT":
        raise HTTPException(
            status_code=403,
            detail="Only PATIENT accounts can be registered through this endpoint",
        )

    # Check duplicate email
    existing_user = db.users.find_one(
        {
            "email": user.email.lower()
        }
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists",
        )

    # Hash password
    password_hash = hash_password(
        user.password
    )

    # Create user document
    user_data = create_user_document(
        name=user.name,
        email=user.email,
        password_hash=password_hash,
        role="PATIENT",
        phone=user.phone,
    )

    # Insert user
    result = db.users.insert_one(
        user_data
    )

    return {
        "id": str(result.inserted_id),
        "name": user_data["name"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data["phone"],
    }


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
def login_user(
    user: LoginRequest,
):
    db = get_database()

    # Find user
    existing_user = db.users.find_one(
        {
            "email": user.email.lower()
        }
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(
        user.password,
        existing_user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # JWT payload
    token_data = {
        "sub": str(existing_user["_id"]),
        "email": existing_user["email"],
        "role": existing_user["role"],
    }

    # Create token
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(
            minutes=60
        ),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(existing_user["_id"]),
            "name": existing_user["name"],
            "email": existing_user["email"],
            "role": existing_user["role"],
            "phone": existing_user.get("phone"),
        },
    }


# ============================================================
# GET CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: dict = Depends(
        get_current_user
    ),
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "phone": current_user.get("phone"),
    }


# ============================================================
# CREATE STAFF USER
# ADMIN ONLY
# ============================================================

@router.post(
    "/staff",
    response_model=UserResponse,
)
def create_staff_user(
    user: RegisterRequest,
    current_user: dict = Depends(
        require_admin
    ),
):
    db = get_database()

    # Check duplicate email
    existing_user = db.users.find_one(
        {
            "email": user.email.lower()
        }
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists",
        )

    # Hash password
    password_hash = hash_password(
        user.password
    )

    # Always create STAFF
    user_data = create_user_document(
        name=user.name,
        email=user.email,
        password_hash=password_hash,
        role="STAFF",
        phone=user.phone,
    )

    # Insert staff user
    result = db.users.insert_one(
        user_data
    )

    return {
        "id": str(result.inserted_id),
        "name": user_data["name"],
        "email": user_data["email"],
        "role": "STAFF",
        "phone": user_data["phone"],
    }


