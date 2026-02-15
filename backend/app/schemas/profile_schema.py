# profile_schema.py

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator
import uuid
from datetime import datetime
from typing import List, Optional
from app.models.profile_model import ProfileVisibility
from app.schemas.intent_types import IntentType

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class SkillBase(BaseModel):
    name: str

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class ProfileBase(BaseModel):
    full_name: str
    bio: Optional[str] = None
    title: Optional[str] = None # New field
    availability: Optional[str] = None # New field
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    can_be_speaker: bool = False
    visibility: ProfileVisibility = ProfileVisibility.public

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    title: Optional[str] = None
    availability: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    visibility: Optional[ProfileVisibility] = None
    
    # New Fields
    country: Optional[str] = None
    city: Optional[str] = None
    origin_country: Optional[str] = None
    can_be_speaker: bool = None
    intents: Optional[List[str]] = None
    today_status: Optional[str] = None
    tag_ids: Optional[List[uuid.UUID]] = None  # For updating tags
    
    @field_validator('intents')
    @classmethod
    def validate_intents(cls, v):
        if v is None:
            return v
        # Validate each intent is a valid IntentType
        valid_intents = IntentType.values()
        for intent in v:
            if intent not in valid_intents:
                raise ValueError(f"Invalid intent: {intent}. Must be one of {valid_intents}")
        return v
    
    @field_validator('tag_ids')
    @classmethod
    def validate_tag_limit(cls, v):
        if v is not None and len(v) > 3:
            raise ValueError("Maximum 3 tags allowed")
        return v


class ProfileResponse(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    tags: List[TagResponse] = []
    skills: List[SkillResponse] = []
    educations: List[EducationResponse] = []
    job_experiences: List[JobExperienceResponse] = []
    average_rating: float = 0.0
    reviews_count: int = 0
    is_onboarded: bool = False
    
    # Missing fields
    country: Optional[str] = None
    city: Optional[str] = None
    origin_country: Optional[str] = None
    can_be_speaker: bool = False
    intents: Optional[List[str]] = None
    today_status: Optional[str] = None
    email: Optional[str] = None # Added for UI display
    roles: List[str] = [] # Added for frontend permission checks
    distance: Optional[float] = None # Debugging field for semantic search
    
    followers_count: int = 0
    following_count: int = 0
    
    sponsor_tier: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class EducationBase(BaseModel):
    qualification: Optional[str] = None
    field_of_study: Optional[str] = None
    school: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    resume_url: Optional[str] = None
    remark: Optional[str] = None

class EducationCreate(EducationBase):
    org_id: Optional[uuid.UUID] = None

class EducationUpdate(EducationBase):
    org_id: Optional[uuid.UUID] = None

class EducationResponse(EducationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class JobExperienceBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None

class JobExperienceCreate(JobExperienceBase):
    org_id: Optional[uuid.UUID] = None

class JobExperienceUpdate(JobExperienceBase):
    org_id: Optional[uuid.UUID] = None

class JobExperienceResponse(JobExperienceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class OnboardingUpdate(BaseModel):
    full_name: str
    role: str
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    
    # New Fields
    country: Optional[str] = None
    city: Optional[str] = None
    origin_country: Optional[str] = None
    can_be_speaker: bool = False
    intents: Optional[List[str]] = None
    
    specialist: Optional[str] = None # Maps to field_of_study (student) or title (expert)
    
    # For Student Education creation
    education: Optional[EducationCreate] = None
    
    # For Tags
    tag_ids: Optional[List[uuid.UUID]] = None
    
    availability: Optional[str] = None # Speaker preferred time
