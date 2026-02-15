# model/profile_model.py


from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, Enum, Table, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
import uuid
from app.database.database import Base

class ProfileVisibility(enum.Enum):
    public = "public"
    private = "private"

profile_tags = Table(
    'profile_tags',
    Base.metadata,
    Column('profile_id', UUID(as_uuid=True), ForeignKey('profiles.id', ondelete="CASCADE"), primary_key=True),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('tags.id', ondelete="CASCADE"), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

profile_skills = Table(
    'profile_skills',
    Base.metadata,
    Column('profile_id', UUID(as_uuid=True), ForeignKey('profiles.id', ondelete="CASCADE"), primary_key=True),
    Column('skill_id', UUID(as_uuid=True), ForeignKey('skills.id', ondelete="CASCADE"), primary_key=True),
    Column('level', Integer, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    twitter_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    
    # Efficient Trust Flow fields
    title = Column(String, nullable=True) # e.g. "Senior Engineer @ Grab"
    average_rating = Column(Float, nullable=False, default=0.0)
    today_status = Column(String, nullable=True) # e.g. "Open to offers"
    
    # Onboarding Fields
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    origin_country = Column(String, nullable=True)
    can_be_speaker = Column(Boolean, default=False, nullable=False)
    intents = Column(JSON, nullable=True) # ["looking_for_sponsor", "open_to_hiring"]

    availability = Column(String, nullable=True) # e.g. "Weekdays after 8pm"
    is_onboarded = Column(Boolean, default=False, nullable=False, server_default='false')

    visibility = Column(Enum(ProfileVisibility), default=ProfileVisibility.public, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    tags = relationship("Tag", secondary=profile_tags, back_populates="profiles")
    skills = relationship("Skill", secondary=profile_skills, back_populates="profiles")
    user = relationship("User", back_populates="profile")

    @property
    def educations(self):
        return self.user.educations if self.user else []

    @property
    def job_experiences(self):
        return self.user.job_experiences if self.user else []

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    profiles = relationship("Profile", secondary=profile_tags, back_populates="tags")

class Education(Base):
    __tablename__ = "educations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    qualification = Column(String, nullable=True)
    field_of_study = Column(String, nullable=True)
    school = Column(String, nullable=True)
    start_datetime = Column(DateTime(timezone=True), nullable=True)
    end_datetime = Column(DateTime(timezone=True), nullable=True)
    resume_url = Column(String, nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="educations")

class JobExperience(Base):
    __tablename__ = "job_experiences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_datetime = Column(DateTime(timezone=True), nullable=True)
    end_datetime = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="job_experiences")
