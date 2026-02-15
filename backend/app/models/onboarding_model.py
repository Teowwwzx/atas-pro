# model/onboarding_model.py

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Enum, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
import uuid
from app.database.database import Base


class OnboardingStatus(enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"


class UserOnboarding(Base):
    """
    Track user onboarding progress through the platform.
    Real-world platforms use this to collect additional information
    about users after registration to personalize their experience.
    """
    __tablename__ = "user_onboardings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Onboarding flow tracking
    status = Column(Enum(OnboardingStatus), default=OnboardingStatus.not_started, nullable=False)
    current_step = Column(Integer, default=0, nullable=False)  # 0-based step index
    total_steps = Column(Integer, default=5, nullable=False)  # Total onboarding steps
    
    # Step completion flags
    profile_completed = Column(Boolean, default=False, nullable=False)
    skills_added = Column(Boolean, default=False, nullable=False)
    interests_selected = Column(Boolean, default=False, nullable=False)
    experience_added = Column(Boolean, default=False, nullable=False)
    preferences_set = Column(Boolean, default=False, nullable=False)
    
    # Additional onboarding data (flexible JSONB storage)
    # This can store step-specific data like:
    # - Career goals
    # - Areas of interest
    # - Notification preferences
    # - Accessibility settings
    onboarding_data = Column(JSON, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    skipped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
