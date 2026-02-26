
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from sqlalchemy import Enum as SQLEnum
from app.database.database import Base
import uuid

class ChannelType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"
    EVENT_ROOM = "event_room"

class ConversationParticipant(Base):
    __tablename__ = 'conversation_participants'

    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    
    last_read_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    conversation = relationship("Conversation", back_populates="participants")


class Conversation(Base):
    __tablename__ = 'conversations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=True) # Only for group chats/event rooms
    type = Column(SQLEnum(ChannelType), default=ChannelType.DIRECT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", order_by="desc(Message.created_at)", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = 'messages'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True) # If user deleted, keep message
    
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")


class Attachment(Base):
    __tablename__ = 'attachments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # e.g. 'image/png', 'application/pdf'
    file_name = Column(String(255), nullable=True)
    file_size = Column(String(50), nullable=True) # keeping string for flexibility or integer for bytes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    message = relationship("Message", back_populates="attachments")
