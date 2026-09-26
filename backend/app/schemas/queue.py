from pydantic import BaseModel
from typing import Optional


class QueueCreate(BaseModel):
    appointment_id: str


class QueueUpdate(BaseModel):
    status: Optional[str] = None