from pydantic import BaseModel
from typing import Optional


class HealthAlertResponse(BaseModel):
    patient_id: str
    alert_type: str
    severity: str
    message: str
    vital_id: Optional[str] = None
    created_at: Optional[str] = None
