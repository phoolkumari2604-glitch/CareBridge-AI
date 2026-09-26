from pydantic import BaseModel
from typing import Optional


class HospitalCreate(BaseModel):
    name: str
    city: str
    address: str
    phone: str
    email: Optional[str] = None
    emergency_available: bool = True
    specialties: list[str] = []
    status: str = "ACTIVE"


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_available: Optional[bool] = None
    specialties: Optional[list[str]] = None
    status: Optional[str] = None
