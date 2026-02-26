from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid
from app.models.chat_model import ChannelType

# --- Attachment Schemas ---
class AttachmentCreate(BaseModel):
    file_url: str
    file_type: str
    file_name: Optional[str] = None
    file_size: Optional[str] = None

class AttachmentResponse(AttachmentCreate):
    id: uuid.UUID
    message_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Message Schemas ---

class MessageBase(BaseModel):
    content: str
    
class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    is_read: bool
    created_at: datetime
    
    # Ideally include sender info for UI
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    
    attachments: List[AttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Participant Schemas ---

class ParticipantResponse(BaseModel):
    user_id: uuid.UUID
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    last_read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- Conversation Schemas ---

class ConversationCreate(BaseModel):
    participant_ids: List[uuid.UUID] # List of user IDs to start a chat with
    type: ChannelType = ChannelType.DIRECT
    name: Optional[str] = None # For group chats

class ConversationResponse(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    type: ChannelType
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
