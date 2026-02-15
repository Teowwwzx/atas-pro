from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.user_model import User
from app.models.event_model import (
    Event, EventParticipant, EventFormat, EventType, 
    EventVisibility, EventStatus, EventRegistrationStatus, 
    EventParticipantRole, EventParticipantStatus, EventRegistrationType
)
from app.models.chat_model import Conversation, ConversationParticipant, Message
from app.schemas.booking_schema import BookingCreate, BookingResponse
import uuid
from datetime import timezone

router = APIRouter()

@router.post("/bookings", response_model=BookingResponse)
def create_booking(
    body: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Streamlined booking flow:
    1. Create Private Event
    2. Add Organizer (User)
    3. Invite Expert (Speaker)
    4. Create Chat
    """
    
    # 1. Validate Expert
    expert = db.query(User).filter(User.id == body.expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
        
    if expert.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot book yourself")

    # 2. Create Event
    # Ensure timezones
    sd = body.start_datetime
    ed = body.end_datetime
    if sd.tzinfo is None: sd = sd.replace(tzinfo=timezone.utc)
    if ed.tzinfo is None: ed = ed.replace(tzinfo=timezone.utc)
    
    # Basic validation
    if ed <= sd:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    event_id = uuid.uuid4()
    event = Event(
        id=event_id,
        organizer_id=current_user.id,
        title=body.title,
        description=f"1-on-1 session between {current_user.full_name} and {expert.full_name}",
        format=EventFormat.other, # or 'workshop' if preferred, stick to 'other' for safety
        type=EventType.online,
        start_datetime=sd,
        end_datetime=ed,
        visibility=EventVisibility.private,
        status=EventStatus.published,
        registration_status=EventRegistrationStatus.closed, # No public registration
        registration_type=EventRegistrationType.free, # Default to free for now (Phase 2)
        max_participant=2,
        auto_accept_registration=True
    )
    db.add(event)
    
    # 3. Add Participants
    # Organizer
    p_org = EventParticipant(
        event_id=event_id,
        user_id=current_user.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted
    )
    db.add(p_org)
    
    # Expert (Speaker)
    p_exp = EventParticipant(
        event_id=event_id,
        user_id=expert.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending # Needs acceptance
    )
    db.add(p_exp)
    
    # 4. Create or Reuse Conversation & Initial Message
    # Try to find an existing 1:1 conversation between organizer and expert
    existing_conv_id_subq = db.query(ConversationParticipant.conversation_id)\
        .filter(ConversationParticipant.user_id == current_user.id).subquery()
    existing_conv = db.query(Conversation)\
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)\
        .filter(
            ConversationParticipant.user_id == expert.id,
            Conversation.id.in_(existing_conv_id_subq)
        ).first()
    if existing_conv:
        conversation = existing_conv
    else:
        conversation = Conversation()
        db.add(conversation)
        db.flush()  # get id
        # Add participants to conversation
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=current_user.id))
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=expert.id))
    
    # Link conversation to the Expert's participant record (so they see it in requests)
    p_exp.conversation_id = conversation.id
    
    # Send Initial Message if provided
    if body.message:
        msg = Message(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            content=body.message
        )
        db.add(msg)
        
    db.commit()
    db.refresh(event)
    
    return BookingResponse(
        event_id=event.id,
        organizer_id=current_user.id,
        expert_id=expert.id,
        title=event.title,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        status="pending",
        conversation_id=conversation.id
    )
