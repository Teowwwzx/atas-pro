from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class NotificationResponse(BaseModel):
    id: uuid.UUID
    recipient_id: uuid.UUID
    actor_id: uuid.UUID
    type: str
    content: str
    link_url: str | None = None
    is_read: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class NotificationReadAllResponse(BaseModel):
    updated_count: int
