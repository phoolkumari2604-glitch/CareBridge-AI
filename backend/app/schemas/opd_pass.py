from pydantic import BaseModel
from typing import Optional


class OPDPassCreate(BaseModel):
    appointment_id: str


class OPDPassUpdate(BaseModel):
    status: Optional[str] = None