from pydantic import BaseModel
from typing import Optional


class AIChatRequest(BaseModel):
    patient_id: str
    message: str


class AIChatResponse(BaseModel):
    patient_id: str
    message: str
    response: str
    disclaimer: Optional[str] = None
