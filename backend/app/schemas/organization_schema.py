
from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.organization_model import OrganizationType, OrganizationVisibility, OrganizationStatus

class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    type: OrganizationType = OrganizationType.community
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: OrganizationVisibility = OrganizationVisibility.public

class OrganizationCreate(OrganizationBase):
    bank_details: Optional[dict] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    type: Optional[OrganizationType] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    visibility: Optional[OrganizationVisibility] = None
    bank_details: Optional[dict] = None
    owner_id: Optional[UUID] = None

class OrganizationOwner(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class OrganizationResponse(OrganizationBase):
    id: UUID
    owner_id: UUID
    owner: Optional[OrganizationOwner] = None
    status: OrganizationStatus
    bank_details: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
