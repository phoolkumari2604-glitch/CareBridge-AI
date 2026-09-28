from pydantic import BaseModel
from typing import Optional


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[str] = None
