from pydantic import BaseModel, EmailStr
from typing import Optional


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[EmailStr] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[list[str]] = []
    medical_history: Optional[list[str]] = []


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[list[str]] = None
    medical_history: Optional[list[str]] = None