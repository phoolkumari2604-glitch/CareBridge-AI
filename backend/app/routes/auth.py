from fastapi import APIRouter, Depends, HTTPException
from datetime import timedelta

from app.core.database import get_database
from app.core.dependencies import get_current_user, require_admin
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import create_user_document
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    LoginResponse,
)
from app.services.audit_service import log_audit_action


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/register", response_model=UserResponse)
def register_user(user: RegisterRequest):
    db = get_database()

    existing_user = db.users.find_one(
        {"email": user.email.lower()}
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists",
        )

    password_hash = hash_password(user.password)

    user_data = create_user_document(
        name=user.name,
        email=user.email,
        password_hash=password_hash,
        role="PATIENT",
        phone=user.phone,
    )

    result = db.users.insert_one(user_data)

    # Audit patient registration
    log_audit_action(
        db=db,
        user_id=str(result.inserted_id),
        user_role="PATIENT",
        action="PATIENT_REGISTERED",
        resource="USER",
        resource_id=str(result.inserted_id),
        details=f"Patient user {user_data['email']} registered successfully",
    )

    return {
        "id": str(result.inserted_id),
        "name": user_data["name"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data["phone"],
    }


@router.post("/login", response_model=LoginResponse)
def login_user(user: LoginRequest):
    db = get_database()

    existing_user = db.users.find_one(
        {"email": user.email.lower()}
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user.password,
        existing_user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token_data = {
        "sub": str(existing_user["_id"]),
        "email": existing_user["email"],
        "role": existing_user["role"],
    }

    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=60),
    )

    # Audit successful login
    log_audit_action(
        db=db,
        user_id=str(existing_user["_id"]),
        user_role=existing_user["role"],
        action="LOGIN_SUCCESS",
        resource="AUTH",
        resource_id=str(existing_user["_id"]),
        details="User logged in successfully",
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


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: dict = Depends(get_current_user),
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "phone": current_user.get("phone"),
    }


@router.post(
    "/staff",
    response_model=UserResponse,
)
def create_staff_user(
    user: RegisterRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    existing_user = db.users.find_one(
        {"email": user.email.lower()}
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists",
        )

    password_hash = hash_password(user.password)

    user_data = create_user_document(
        name=user.name,
        email=user.email,
        password_hash=password_hash,
        role="STAFF",
        phone=user.phone,
    )

    result = db.users.insert_one(user_data)

    # Audit staff creation
    log_audit_action(
        db=db,
        user_id=str(current_user["_id"]),
        user_role=current_user["role"],
        action="STAFF_CREATED",
        resource="USER",
        resource_id=str(result.inserted_id),
        details=f"Staff user {user_data['email']} created",
    )

    return {
        "id": str(result.inserted_id),
        "name": user_data["name"],
        "email": user_data["email"],
        "role": "STAFF",
        "phone": user_data["phone"],
    }