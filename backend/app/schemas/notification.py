from pydantic import BaseModel
from typing import Optional


class NotificationCreate(BaseModel):
    patient_id: str
    title: str
    message: str
    notification_type: str = "GENERAL"


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(BaseModel):
    id: str
    patient_id: str
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: Optional[str] = None
