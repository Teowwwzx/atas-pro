from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

class BookingCreate(BaseModel):
    expert_id: UUID
    start_datetime: datetime
    end_datetime: datetime
    title: Optional[str] = "1-on-1 Consultation"
    message: Optional[str] = None # Initial message to send
    # Payment fields (Phase 3 placeholder)
    payment_method: Optional[str] = None 

class BookingResponse(BaseModel):
    event_id: UUID
    organizer_id: UUID
    expert_id: UUID
    title: str
    start_datetime: datetime
    end_datetime: datetime
    status: str
    conversation_id: Optional[UUID] = None
    
    model_config = ConfigDict(from_attributes=True)
