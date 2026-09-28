from pydantic import BaseModel
from typing import Optional


class VitalSignsCreate(BaseModel):
    patient_id: str
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    spo2: Optional[float] = None
    weight_kg: Optional[float] = None


class VitalSignsUpdate(BaseModel):
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    spo2: Optional[float] = None
    weight_kg: Optional[float] = None
