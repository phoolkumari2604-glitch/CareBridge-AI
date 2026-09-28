from pydantic import BaseModel
from typing import Optional


class ConversationMessageCreate(BaseModel):
    patient_id: str
    message: str
    sender: str = "USER"


class ConversationMessageResponse(BaseModel):
    id: str
    patient_id: str
    message: str
    sender: str
    created_at: Optional[str] = None
