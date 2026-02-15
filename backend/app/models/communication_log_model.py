
from sqlalchemy import Column, String, DateTime, Enum, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from app.database.database import Base
import enum
import uuid

class CommunicationType(str, enum.Enum):
    EMAIL = "email"
    NOTIFICATION = "notification"

class CommunicationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    type = Column(Enum(CommunicationType), nullable=False)
    recipient = Column(String, nullable=False, index=True) # Email or User ID
    subject = Column(String, nullable=True) # For emails
    content = Column(Text, nullable=True) # Captured content or summary
    status = Column(Enum(CommunicationStatus), default=CommunicationStatus.PENDING, index=True)
    error_message = Column(Text, nullable=True)
    metadata_payload = Column(JSON, nullable=True) # Store extra info like template_id, variables
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
