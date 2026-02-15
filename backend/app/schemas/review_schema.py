from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime

class ReviewCreate(BaseModel):
    event_id: uuid.UUID | None = None
    reviewee_id: uuid.UUID | None = None
    org_id: uuid.UUID | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID | None = None
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID | None = None
    org_id: uuid.UUID | None = None
    rating: int
    comment: str | None = None
    created_at: datetime
    
    reviewer_name: str | None = None
    reviewer_avatar: str | None = None
    is_anonymous: bool = False
