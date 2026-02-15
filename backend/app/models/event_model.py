# model/event_model.py

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, Enum, Float, UniqueConstraint, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func, select
from sqlalchemy.orm import relationship, column_property
import enum
import uuid
from app.database.database import Base

class EventFormat(enum.Enum):
    panel_discussion = "panel_discussion"
    workshop = "workshop"
    webinar = "webinar"
    seminar = "seminar"
    club_event = "club_event"
    other = "other"

class EventType(enum.Enum):
    online = "online"
    physical = "physical"
    hybrid = "hybrid"
    offline = "offline" # Deprecated: kept for legacy data compatibility

class EventRegistrationType(enum.Enum):
    free = "free"
    paid = "paid"

class EventStatus(enum.Enum):
    draft = "draft"
    published = "published"
    opened = "opened"
    closed = "closed"
    declined = "declined"
    ended = "ended"
    cancelled = "cancelled"

class EventRegistrationStatus(enum.Enum):
    opened = "opened"
    closed = "closed"

class EventVisibility(enum.Enum):
    public = "public"
    private = "private"

class ChecklistVisibility(enum.Enum):
    internal = "internal"
    external = "external"

class EventParticipantRole(enum.Enum):
    organizer = "organizer"
    committee = "committee"
    speaker = "speaker"
    sponsor = "sponsor"
    audience = "audience"
    student = "student"
    teacher = "teacher"

class EventPaymentStatus(enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"

class EventParticipantStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    attended = "attended"
    absent = "absent"
    # interviewing = "interviewing"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization")
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    meeting_url = Column(String, nullable=True)
    payment_qr_url = Column(String, nullable=True)
    format = Column(Enum(EventFormat), nullable=False)
    type = Column(Enum(EventType), nullable=False)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    registration_type = Column(Enum(EventRegistrationType), nullable=False)
    registration_status = Column(Enum(EventRegistrationStatus), nullable=False, default=EventRegistrationStatus.opened)
    status = Column(Enum(EventStatus), default=EventStatus.draft, nullable=False)
    visibility = Column(Enum(EventVisibility), default=EventVisibility.public, nullable=False)
    auto_accept_registration = Column(Boolean, nullable=False, default=True)
    is_attendance_enabled = Column(Boolean, nullable=False, default=True)
    max_participant = Column(Integer, nullable=True)
    venue_place_id = Column(String, nullable=True)
    venue_remark = Column(String, nullable=True)
    remark = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # New fields for Phase 1 Fintech
    price = Column(Float, nullable=True, default=0.0)  # e.g. 15.00
    currency = Column(String, nullable=True, default="MYR") # e.g. MYR

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    organizer = relationship("User", foreign_keys=[organizer_id])
    categories = relationship("EventCategory", back_populates="event")

    @property
    def organizer_name(self):
        return self.organizer.full_name if self.organizer else None

    @property
    def organizer_avatar(self):
        return self.organizer.avatar_url if self.organizer else None

    # Relationships
    categories = relationship("EventCategory", backref="event", cascade="all, delete-orphan")
    pictures = relationship("EventPicture", backref="event", cascade="all, delete-orphan")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")

class EventCategory(Base):
    __tablename__ = "event_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category")

    @property
    def name(self):
        return self.category.name if self.category else None

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventPicture(Base):
    __tablename__ = "event_pictures"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    url = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventWalkInToken(Base):
    __tablename__ = "event_walk_in_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    label = Column(String, nullable=True)
    
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, nullable=False, default=0)
    
    is_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    event = relationship("Event")
    created_by = relationship("User", foreign_keys=[created_by_user_id])

class EventParticipant(Base):
    __tablename__ = "event_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    role = Column(Enum(EventParticipantRole), nullable=False)
    description = Column(String, nullable=True)
    join_method = Column(String, nullable=True)
    status = Column(Enum(EventParticipantStatus), nullable=False, default=EventParticipantStatus.pending)
    
    # Validation / Payment fields
    payment_status = Column(Enum(EventPaymentStatus), nullable=True, default=None)
    payment_proof_url = Column(String, nullable=True)

    # Sponsor specific fields
    promo_link = Column(String, nullable=True)
    promo_image_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("event_proposals.id"), nullable=True)
    walk_in_token_id = Column(UUID(as_uuid=True), ForeignKey("event_walk_in_tokens.id"), nullable=True)
    
    event = relationship("Event", back_populates="participants")
    proposal = relationship("EventProposal")
    walk_in_token = relationship("EventWalkInToken")

    __table_args__ = (
        # Ensure a user can only be a participant of an event ONCE
        # This handles the "Prevent Duplicate Participants" requirement
        UniqueConstraint('event_id', 'user_id', name='uq_event_participant_user'),
    )

class EventMailTemplate(Base):
    __tablename__ = "event_mail_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EventReminder(Base):
    __tablename__ = "event_reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    option = Column(String, nullable=False)  # one_week | three_days | one_day
    remind_at = Column(DateTime(timezone=True), nullable=False)
    is_sent = Column(Boolean, nullable=False, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EventChecklistItem(Base):
    __tablename__ = "event_checklist_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    visibility = Column(Enum(ChecklistVisibility), nullable=False, default=ChecklistVisibility.internal)
    # Optional role targeting for external visibility
    audience_role = Column(Enum(EventParticipantRole), nullable=True)
    # Optional external link for collaboration (e.g., Google Docs/Sheets)
    link_url = Column(String, nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    due_datetime = Column(DateTime(timezone=True), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_users = relationship("User", secondary="event_checklist_assignments", backref="assigned_checklist_items")

    @property
    def assigned_user_ids(self):
        return [u.id for u in self.assigned_users]

    files = relationship("EventProposal", secondary="event_checklist_item_files")

class EventChecklistAssignment(Base):
    __tablename__ = "event_checklist_assignments"
    
    checklist_item_id = Column(UUID(as_uuid=True), ForeignKey("event_checklist_items.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

class EventProposal(Base):
    __tablename__ = "event_proposals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Link to a generic conversation (replaces EventProposalComment)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True)

class EventProposalComment(Base):
    __tablename__ = "event_proposal_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("event_proposals.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



# Association table for checklist items and files (proposals)
event_checklist_item_files = Table(
    "event_checklist_item_files",
    Base.metadata,
    Column("checklist_item_id", UUID(as_uuid=True), ForeignKey("event_checklist_items.id", ondelete="CASCADE"), primary_key=True),
    Column("proposal_id", UUID(as_uuid=True), ForeignKey("event_proposals.id", ondelete="CASCADE"), primary_key=True)
)


# Inject participant_count property to Event model
# Counts all participants who are accepted or attended (or organizer)
Event.participant_count = column_property(
    select(func.count(EventParticipant.id))
    .where(EventParticipant.event_id == Event.id)
    .where(EventParticipant.status.in_([
        EventParticipantStatus.accepted,
        EventParticipantStatus.attended,
        EventParticipantStatus.pending # Optional: Include pending if "Registered" typically means signed up
    ]))
    .correlate_except(EventParticipant)
    .scalar_subquery()
)

# Late import to avoid circular dependency
from app.models.review_model import Review

Event.reviews_count = column_property(
    select(func.count(Review.id))
    .where(Review.event_id == Event.id)
    .where(Review.deleted_at.is_(None))
    .correlate_except(Review)
    .scalar_subquery()
)

Event.average_rating = column_property(
    select(func.coalesce(func.avg(Review.rating), 0.0))
    .where(Review.event_id == Event.id)
    .where(Review.deleted_at.is_(None))
    .correlate_except(Review)
    .scalar_subquery()
)

Event.sponsors = relationship(
    "EventParticipant",
    primaryjoin="and_(EventParticipant.event_id==Event.id, EventParticipant.role=='sponsor', EventParticipant.status=='accepted')",
    viewonly=True
)

