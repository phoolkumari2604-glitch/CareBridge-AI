from pydantic import BaseModel
from typing import Optional


class HealthProfileCreate(BaseModel):
    patient_id: str
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = None
    blood_sugar: Optional[float] = None
    cholesterol: Optional[float] = None
    allergies: list[str] = []
    medical_conditions: list[str] = []
    medications: list[str] = []


class HealthProfileUpdate(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = None
    blood_sugar: Optional[float] = None
    cholesterol: Optional[float] = None
    allergies: Optional[list[str]] = None
    medical_conditions: Optional[list[str]] = None
    medications: Optional[list[str]] = None
