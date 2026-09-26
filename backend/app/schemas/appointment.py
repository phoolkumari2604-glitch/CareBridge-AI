from pydantic import BaseModel
from typing import Optional


class AppointmentCreate(BaseModel):
    patient_id: str
    hospital_id: str
    doctor_id: str
    appointment_date: str
    appointment_time: str
    reason: str
    status: str = "PENDING"
    approval_status: str = "PENDING"


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None