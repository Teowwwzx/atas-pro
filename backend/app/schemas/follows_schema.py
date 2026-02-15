from pydantic import BaseModel
import uuid
from datetime import datetime

class FollowCreate(BaseModel):
    followee_id: uuid.UUID | None = None
    org_id: uuid.UUID | None = None

class FollowerSummary(BaseModel):
    id: uuid.UUID
    full_name: str | None = None
    avatar_url: str | None = None
    visibility: str | None = None
    
    model_config = {"from_attributes": True}

class OrganizationSummary(BaseModel):
    id: uuid.UUID
    name: str
    logo_url: str | None = None
    
    model_config = {"from_attributes": True}

class FollowDetails(BaseModel):
    id: uuid.UUID
    follower_id: uuid.UUID
    followee_id: uuid.UUID | None = None
    org_id: uuid.UUID | None = None
    created_at: datetime
    
    follower: FollowerSummary | None = None
    followee: FollowerSummary | None = None
    organization: OrganizationSummary | None = None

    model_config = {"from_attributes": True}
