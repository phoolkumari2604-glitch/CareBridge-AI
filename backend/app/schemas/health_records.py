from pydantic import BaseModel
from typing import Optional


class HealthRecordCreate(BaseModel):
    patient_id: str
    record_type: str
    title: str
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    medications: list[str] = []
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    record_date: Optional[str] = None


class HealthRecordUpdate(BaseModel):
    record_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    medications: Optional[list[str]] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    record_date: Optional[str] = None
