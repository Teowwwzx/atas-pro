
from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from enum import Enum

class CommunicationType(str, Enum):
    EMAIL = "email"
    NOTIFICATION = "notification"

class CommunicationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class CommunicationLogBase(BaseModel):
    type: CommunicationType
    recipient: str
    subject: Optional[str] = None
    status: CommunicationStatus
    created_at: datetime
    error_message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class CommunicationLogResponse(CommunicationLogBase):
    id: str
    metadata_payload: Optional[Dict[str, Any]] = None
