from pydantic import BaseModel
from typing import Optional


class ApprovalCreate(BaseModel):
    appointment_id: str
    status: str
    approved_by: Optional[str] = None
    reason: Optional[str] = None


class ApprovalUpdate(BaseModel):
    status: Optional[str] = None
    approved_by: Optional[str] = None
    reason: Optional[str] = None