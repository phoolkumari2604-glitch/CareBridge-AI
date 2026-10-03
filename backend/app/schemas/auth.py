from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "PATIENT"
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    patient_id: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse