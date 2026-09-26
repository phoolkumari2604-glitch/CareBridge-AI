from pydantic import BaseModel
from typing import Optional


class DoctorCreate(BaseModel):
    hospital_id: str
    name: str
    specialization: str
    qualification: str
    experience: int
    consultation_fee: float
    available_days: list[str] = []
    available_slots: list[str] = []
    status: str = "AVAILABLE"


class DoctorUpdate(BaseModel):
    hospital_id: Optional[str] = None
    name: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[list[str]] = None
    available_slots: Optional[list[str]] = None
    status: Optional[str] = None