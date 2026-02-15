
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

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

class ConversationResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
