from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Request, Form
from fastapi.responses import Response
import uuid
import base64
import hmac
import hashlib
import csv
import io
import json
import hashlib
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
import redis as sync_redis
from app.core.config import settings
from fastapi.responses import Response, StreamingResponse
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.sql import func, select
from app.database.database import get_db
from app.models.event_model import (
    Event,
    EventFormat,
    EventCategory,
    EventCategory, # Ensure no dup
    Category,
    EventRegistrationType,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
    EventVisibility,
    EventStatus,
    EventRegistrationStatus,
    EventType,
    EventProposal,
    EventProposalComment,
    EventWalkInToken,
    EventPaymentStatus,
)
from app.models.event_model import ChecklistVisibility
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import Organization, organization_members
from app.models.notification_model import NotificationType
from app.services.notification_service import NotificationService
from app.services.event_reminder_service import EventReminderService
from app.services.event_payment_service import EventPaymentService
from app.services.email_service import (
    send_event_invitation_email,
    send_event_role_update_email,
    send_event_removed_email,
    send_event_joined_email,
    send_event_reminder_email,
    send_event_proposal_comment_email,
)
from app.services.cloudinary_service import upload_file
from app.schemas.event_schema import (
    EventDetails,
    EventCreate,
    EventUpdate,
    EventParticipantDetails,
    EventParticipantCreate,
    EventParticipantResponseUpdate,
    EventParticipantBulkCreate,
    EventParticipantRoleUpdate,
    CategoryCreate,
    CategoryResponse,
    EventCategoryAttach,
    AttendanceQRResponse,
    AttendanceScanRequest,
    AttendanceUserScanRequest,
    WalkInAttendanceRequest,
    EventReminderCreate,
    EventReminderResponse,
    MyEventItem,
    EventAttendanceStats,
    EventChecklistItemCreate,
    EventChecklistItemUpdate,
    EventChecklistItemResponse,

    EventProposalCreate,
    EventProposalResponse,
    EventProposalCommentCreate,
    EventProposalCommentResponse,
    EventProposalUpdate,
    EventProposalCommentUpdate,
    EventInvitationResponse,
    EventParticipationSummary,
    EventWalkInTokenCreate,
    EventWalkInTokenResponse,
    WalkInRegistrationRequest,
)
from typing import List
from sqlalchemy import text
from app.services.ai_service import generate_text_embedding, _vec_to_pg
from app.dependencies import get_current_user, get_current_user_optional
from app.dependencies import require_roles
from app.models.user_model import User, Role, user_roles
from app.models.event_model import EventReminder
from app.models.event_model import EventChecklistItem
from app.core.config import settings
from app.services.cloudinary_service import upload_file
from app.services.user_service import create_user
from app.schemas.user_schema import UserCreate
from app.models.profile_model import Profile
import os
from app.services.audit_service import log_admin_action

router = APIRouter()

DEFAULT_APU_PLACE_ID = "ChIJr7mC9fN5zDERSrD1wGg7oYQ"  # Asia Pacific University (placeholder); replace with actual Google Place ID in .env if needed

def _parse_role(value: str) -> EventParticipantRole:
    s = (value or "").strip().lower()
    aliases = {
        "commitee": "committee",
        "audiences": "audience",
        "speakers": "speaker",
        "sponsors": "sponsor",
        "students": "student",
        "teachers": "teacher",
        "organisers": "organizer",
        "organiser": "organizer",
    }
    s = aliases.get(s, s)
    return EventParticipantRole(s)

def _make_user_attendance_token(event_id: uuid.UUID, user_id: uuid.UUID, minutes_valid: int = 15) -> tuple[str, datetime]:
    exp = datetime.utcnow() + timedelta(minutes=minutes_valid)
    payload = f"{event_id}|{user_id}|{int(exp.timestamp())}"
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    token = f"{base64.urlsafe_b64encode(payload.encode('utf-8')).decode('utf-8').rstrip('=')}.{base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')}"
    return token, exp

def _verify_user_attendance_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    def _pad(s: str) -> str:
        return s + "=" * ((4 - len(s) % 4) % 4)
    payload_b64, sig_b64 = token.split(".")
    payload_raw = base64.urlsafe_b64decode(_pad(payload_b64)).decode("utf-8")
    sig = base64.urlsafe_b64decode(_pad(sig_b64))
    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_raw.encode("utf-8"), hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=400, detail="Invalid token signature")
    event_id_str, user_id_str, exp_ts_str = payload_raw.split("|")
    exp_ts = int(exp_ts_str)
    if int(datetime.utcnow().timestamp()) > exp_ts:
        raise HTTPException(status_code=400, detail="Token expired")
    return uuid.UUID(event_id_str), uuid.UUID(user_id_str)


# ... imports ...

@router.get("/events/count", response_model=dict, dependencies=[Depends(RateLimiter(times=20, seconds=60))])
def count_events(
    q_text: str | None = Query(None),
    status: EventStatus | None = Query(None),
    type: EventType | None = Query(None),
    format: EventFormat | None = Query(None),
    registration_type: EventRegistrationType | None = Query(None),
    registration_status: EventRegistrationStatus | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    category_name: str | None = Query(None),
    organizer_id: uuid.UUID | None = Query(None),
    visibility: EventVisibility | None = Query(None),
    upcoming: bool = Query(False),
    start_after: datetime | None = Query(None),
    end_before: datetime | None = Query(None),
    include_all_visibility: bool = Query(False),
    db: Session = Depends(get_db),
):
    # Cache key generation
    params = locals().copy()
    del params['db']
    # Serialize complex types
    for k, v in params.items():
        if isinstance(v, uuid.UUID):
            params[k] = str(v)
        elif isinstance(v, datetime):
            params[k] = v.isoformat()
        elif hasattr(v, "value"): # Enums
            params[k] = v.value
    
    param_str = json.dumps(params, sort_keys=True, default=str)
    cache_key = f"events:count:{hashlib.md5(param_str.encode()).hexdigest()}"

    # Try Redis
    try:
        r = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
        cached_val = r.get(cache_key)
        if cached_val:
            return json.loads(cached_val)
    except Exception as e:
        pass # Fail open

    query = db.query(Event)
    query = query.filter(Event.deleted_at.is_(None))

    if not include_all_visibility:
        if visibility is None:
            query = query.filter(Event.visibility == EventVisibility.public)
        else:
            query = query.filter(Event.visibility == visibility)
    elif visibility is not None:
        query = query.filter(Event.visibility == visibility)

    if upcoming:
        query = query.filter(Event.start_datetime >= func.now())
    if start_after:
        query = query.filter(Event.start_datetime >= start_after)
    if end_before:
        query = query.filter(Event.end_datetime <= end_before)

    if q_text:
        query = query.filter(Event.title.ilike(f"%{q_text}%"))
    
    if status:
        query = query.filter(Event.status == status)
    else:
        # Default behavior: match get_all_events
        # If searching for past events (end_before is set), allow ended/closed events too
        if end_before is not None:
             query = query.filter(Event.status.in_([EventStatus.published, EventStatus.ended, EventStatus.closed]))
        else:
             query = query.filter(Event.status == EventStatus.published)

    if type:
        query = query.filter(Event.type == type)
    if format:
        query = query.filter(Event.format == format)
    if registration_type:
        query = query.filter(Event.registration_type == registration_type)
    if registration_status:
        query = query.filter(Event.registration_status == registration_status)
    
    if organizer_id:
        query = query.filter(Event.organizer_id == organizer_id)

    if category_id is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .filter(EventCategory.category_id == category_id)
            .distinct()
        )
    elif category_name is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .join(Category, Category.id == EventCategory.category_id)
            .filter(func.lower(Category.name) == func.lower(category_name))
            .distinct()
        )

    count = query.count()
    result = {"total_count": count}
    
    # Set Cache
    try:
        r.setex(cache_key, 300, json.dumps(result)) # 5 mins
    except Exception:
        pass
        
    return result

@router.get("/events", response_model=List[EventDetails], dependencies=[Depends(RateLimiter(times=20, seconds=60))])
def get_all_events(
    db: Session = Depends(get_db),
    category_id: uuid.UUID | None = Query(None),
    category_name: str | None = Query(None),
    upcoming: bool | None = Query(None),
    q_text: str | None = Query(None),
    type: EventType | None = Query(None),
    format: EventFormat | None = Query(None),
    visibility: EventVisibility | None = Query(None),
    registration_type: EventRegistrationType | None = Query(None),
    registration_status: EventRegistrationStatus | None = Query(None),
    organizer_id: uuid.UUID | None = Query(None),
    start_after: datetime | None = Query(None),
    end_before: datetime | None = Query(None),
    page: int = 1,
    page_size: int = 20,
    include_all_visibility: bool = False, # New param
    status: EventStatus | None = Query(None),
    include_all_status: bool = False,
    current_user: User | None = Depends(get_current_user_optional),
    friends_only: bool = Query(False),
):
    # Cache key generation
    params = locals().copy()
    del params['db']
    del params['current_user'] # Don't cache based on user unless result differs
    # Note: 'friends_only' depends on current_user, so if friends_only=True, we must NOT cache globally or key by user
    
    can_cache = not friends_only # Disable cache for personalized friends query
    
    if can_cache:
        # Serialize params
        cache_params = params.copy()
        for k, v in cache_params.items():
            if isinstance(v, uuid.UUID):
                cache_params[k] = str(v)
            elif isinstance(v, datetime):
                cache_params[k] = v.isoformat()
            elif hasattr(v, "value"):
                cache_params[k] = v.value
        
        param_str = json.dumps(cache_params, sort_keys=True, default=str)
        cache_key = f"events:list:{hashlib.md5(param_str.encode()).hexdigest()}"

        try:
            r = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
            cached_val = r.get(cache_key)
            if cached_val:
                # We need to deserialize Pydantic models from JSON
                # This is tricky because EventDetails has nested objects
                # Simplest way: use FastAPI's jsonable_encoder before caching, but here we just return dicts and let Pydantic handle it?
                # Pydantic models can be instantiated from dicts
                data = json.loads(cached_val)
                return [EventDetails(**item) for item in data]
        except Exception as e:
            pass

    query = db.query(Event)
    # Exclude soft-deleted events
    query = query.filter(Event.deleted_at.is_(None))

    if friends_only:
        if not current_user:
            # If not logged in, return empty or throw? Returning empty seems safer for public page resilience.
            # Alternatively, ignore the filter. But "Your Friend Event" implies specific user context.
            # Let's return empty list to signify no results for this filter.
            return []
        
        from app.models.follows_model import Follow
        # Get IDs of users/orgs the current user follows
        followed_user_ids = db.query(Follow.followee_id).filter(
            Follow.follower_id == current_user.id,
            Follow.followee_id.isnot(None)
        ).subquery()
        
        # Filter events where organizer is in followed list
        query = query.filter(Event.organizer_id.in_(select(followed_user_ids)))
    
    if not include_all_visibility:
        if visibility is None:
            query = query.filter(Event.visibility == EventVisibility.public)
        else:
            query = query.filter(Event.visibility == visibility)
    # If include_all_visibility is True, we skip the visibility filter (unless specific visibility is requested? No, let's say it overrides default)
    # But if visibility IS provided, we should probably respect it?
    # Let's say: if include_all_visibility is True, we IGNORE the default "public only".
    # If visibility param IS provided, we still filter by it.
    if include_all_visibility:
        if visibility is not None:
             query = query.filter(Event.visibility == visibility)

    # Default: only published events, unless explicitly requesting otherwise
    if not include_all_status:
        if status is None:
            # If searching for past events (end_before is set), allow ended/closed events too
            if end_before is not None:
                query = query.filter(Event.status.in_([EventStatus.published, EventStatus.ended, EventStatus.closed]))
            else:
                query = query.filter(Event.status == EventStatus.published)
        else:
            query = query.filter(Event.status == status)
    
    if upcoming:
        query = query.filter(Event.start_datetime >= func.now())
    if q_text:
        query = query.filter(Event.title.ilike(f"%{q_text}%"))
    if type is not None:
        query = query.filter(Event.type == type)
    if format is not None:
        query = query.filter(Event.format == format)
    if registration_type is not None:
        query = query.filter(Event.registration_type == registration_type)
    if registration_status is not None:
        query = query.filter(Event.registration_status == registration_status)
    if organizer_id is not None:
        query = query.filter(Event.organizer_id == organizer_id)
    if start_after is not None:
        query = query.filter(Event.start_datetime >= start_after)
    if end_before is not None:
        query = query.filter(Event.end_datetime <= end_before)
    if category_id is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .filter(EventCategory.category_id == category_id)
            .distinct()
        )
    elif category_name is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .join(Category, Category.id == EventCategory.category_id)
            .filter(func.lower(Category.name) == func.lower(category_name))
            .distinct()
        )
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    events = (
        query.order_by(Event.start_datetime.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    if can_cache:
        from fastapi.encoders import jsonable_encoder
        try:
            # jsonable_encoder converts Pydantic models to dicts/lists suitable for JSON
            encoded_events = jsonable_encoder(events)
            r.setex(cache_key, 300, json.dumps(encoded_events))
        except Exception:
            pass

    return events

@router.get("/events/semantic-search", response_model=List[EventDetails])
def semantic_search_events(
    embedding: str | None = None,
    q_text: str | None = None,
    top_k: int = 20,
    db: Session = Depends(get_db),
):
    event_ids: list[uuid.UUID] = []
    if embedding:
        try:
            sql = text("SELECT event_id FROM event_embeddings ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k")
            rows = db.execute(sql, {"emb": embedding, "k": top_k}).fetchall()
            event_ids = [r[0] for r in rows]
        except Exception:
            db.rollback()
            event_ids = []
    elif q_text:
        try:
            vec = generate_text_embedding(q_text)
            if vec:
                emb = _vec_to_pg(vec)
                sql = text("SELECT event_id FROM event_embeddings ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k")
                rows = db.execute(sql, {"emb": emb, "k": top_k}).fetchall()
                event_ids = [r[0] for r in rows]
        except Exception:
            db.rollback()
            event_ids = []

    q = db.query(Event).filter(Event.deleted_at.is_(None))
    q = q.filter(Event.visibility == EventVisibility.public)
    if event_ids:
        items = q.filter(Event.id.in_(event_ids)).all()
        order = {eid: idx for idx, eid in enumerate(event_ids)}
        items.sort(key=lambda e: order.get(e.id, 10**9))
        return items[:top_k]
    elif q_text:
        q = q.filter(Event.title.ilike(f"%{q_text}%"))
    return q.order_by(Event.start_datetime.asc()).limit(top_k).all()

@router.get("/semantic/events", response_model=List[EventDetails])
def semantic_search_events_alias(
    embedding: str | None = None,
    q_text: str | None = None,
    top_k: int = 20,
    db: Session = Depends(get_db),
):
    return semantic_search_events(embedding=embedding, q_text=q_text, top_k=top_k, db=db)



@router.get("/events/me/history", response_model=List[EventDetails])
def get_my_event_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role_filter: str | None = Query(
        None,
        description="Filter by your involvement: organized | participant | speaker | sponsor",
    ),
):
    """List past events the current user has involvement in.

    Default: only events the user attended (status = attended).
    Filters:
    - organized: events you organized (past)
    - participant: events you attended as audience/student/teacher/committee
    - speaker: events you attended as speaker
    - sponsor: events you attended as sponsor
    """

    allowed_filters = {"organized", "participant", "speaker", "sponsor"}
    if role_filter is not None and role_filter not in allowed_filters:
        raise HTTPException(status_code=400, detail="Invalid role_filter")

    query = db.query(Event)

    # Always past events for history
    query = query.filter(Event.end_datetime < func.now(), Event.deleted_at.is_(None))

    if role_filter == "organized":
        query = query.filter(Event.organizer_id == current_user.id)
    else:
        # participant-related filters require join
        query = query.join(EventParticipant, EventParticipant.event_id == Event.id)
        query = query.filter(
            EventParticipant.user_id == current_user.id,
            EventParticipant.status == EventParticipantStatus.attended,
        )

        if role_filter == "speaker":
            query = query.filter(EventParticipant.role == EventParticipantRole.speaker)
        elif role_filter == "sponsor":
            query = query.filter(EventParticipant.role == EventParticipantRole.sponsor)
        elif role_filter == "participant":
            query = query.filter(
                EventParticipant.role.in_(
                    [
                        EventParticipantRole.audience,
                        EventParticipantRole.student,
                        EventParticipantRole.teacher,
                        EventParticipantRole.committee,
                    ]
                )
            )
        else:
            # No role_filter provided: include any attended role
            pass

    events = (
        query.order_by(Event.end_datetime.desc()).distinct().all()
    )
    return events



@router.get("/events/me/requests", response_model=List[EventInvitationResponse])
def get_my_requests(
    type: str = Query("pending", enum=["pending", "history"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List invitations (bookings) for the current user.
    type='pending': Pending invitations for future events.
    type='history': Rejected invitations or expired pending invitations.
    """
    now = datetime.now(timezone.utc)
    
    query = db.query(EventParticipant).join(Event, EventParticipant.event_id == Event.id)
    
    if type == "pending":
        # Pending and event not ended
        query = query.filter(
            EventParticipant.user_id == current_user.id,
            EventParticipant.status == EventParticipantStatus.pending,
            EventParticipant.join_method == "invited",
            Event.end_datetime > now
        )
    else:
        # History: Rejected OR (Pending and event ended)
        # We assume 'accepted' goes to 'My Schedule' (Joined Events)
        query = query.filter(
            EventParticipant.user_id == current_user.id,
            EventParticipant.join_method == "invited",
            (EventParticipant.status == EventParticipantStatus.rejected) |
            ((EventParticipant.status == EventParticipantStatus.pending) & (Event.end_datetime <= now))
        )

    participants = query.order_by(EventParticipant.created_at.desc()).all()
    
    return participants


@router.get("/events/me/requests/sent", response_model=List[EventInvitationResponse])
def get_sent_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List pending invitations (bookings) sent BY the current user (organizer) to others.
    """
    # Join EventParticipant -> Event -> User (invitee) -> Profile (optional)
    results = (
        db.query(EventParticipant, Event, User, Profile)
        .join(Event, EventParticipant.event_id == Event.id)
        .join(User, EventParticipant.user_id == User.id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .filter(
            Event.organizer_id == current_user.id,
            EventParticipant.status == EventParticipantStatus.pending,
            EventParticipant.join_method == "invited",
            EventParticipant.user_id != current_user.id
        )
        .order_by(EventParticipant.created_at.desc())
        .all()
    )

    items = []
    for participant, event, user, profile in results:
        # Manually assign event to participant to ensure Pydantic can validate it
        participant.event = event
        
        item = EventInvitationResponse.model_validate(participant)
        
        # Add invitee details
        item.invitee_name = profile.full_name if (profile and profile.full_name) else user.email
        item.invitee_email = user.email
        item.invitee_avatar = profile.avatar_url if profile else None
        
        items.append(item)

    return items





@router.post("/events", response_model=EventDetails)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event and assign the creator as organizer participant.

    Validation:
    - Dashboard Pro required for multiple events
    - title must not be empty
    - end_datetime must be after start_datetime
    - max_participant must be positive when provided
    """
    # Check Dashboard Pro requirement for multiple events
    # if not current_user.is_dashboard_pro:
    #     existing_event_count = db.query(Event).filter(
    #         Event.organizer_id == current_user.id
    #     ).count()
    #     if existing_event_count >= 1:
    #         raise HTTPException(
    #             status_code=403, 
    #             detail="Dashboard Pro required to organize multiple events"
    #         )
    
    # Basic validations
    if not event.title or not event.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    sd = event.start_datetime
    ed = event.end_datetime
    if sd.tzinfo is None:
        sd = sd.replace(tzinfo=timezone.utc)
    if ed.tzinfo is None:
        ed = ed.replace(tzinfo=timezone.utc)
    if ed <= sd:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
    
    if event.max_participant is not None and event.max_participant <= 0:
        raise HTTPException(status_code=400, detail="max_participant must be a positive integer")
    # Derive default type from format if not provided
    derived_type = event.type
    if derived_type is None:
        if event.format == EventFormat.webinar or getattr(event.format, 'value', None) == "webinar":
            derived_type = EventType.online
        else:
            # Most non-webinar formats are physical by default
            derived_type = EventType.physical

    # Validate organization if provided
    if event.organization_id:
        org = db.query(Organization).filter(Organization.id == event.organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if user is owner or member of the organization
        if org.owner_id != current_user.id:
             is_member = db.query(organization_members).filter(
                 organization_members.c.organization_id == org.id,
                 organization_members.c.user_id == current_user.id
             ).first()
             if not is_member:
                 raise HTTPException(status_code=403, detail="You must be a member of the organization to create events for it")

    # Default venue to APU if not provided
    venue_place_id = event.venue_place_id if event.venue_place_id else DEFAULT_APU_PLACE_ID

    # Avoid duplicate/unknown kwargs when constructing the ORM model
    # Exclude 'categories' as it's a relationship, not a direct field
    payload = event.model_dump(exclude={"start_datetime", "end_datetime", "type", "venue_place_id", "categories"})
    db_event = Event(
        **payload,
        organizer_id=current_user.id,
        start_datetime=sd,
        end_datetime=ed,
        type=derived_type,
        venue_place_id=venue_place_id,
    )
    # For paid events, do not auto-accept registrations
    try:
        from app.models.event_model import EventRegistrationType
        if db_event.registration_type == EventRegistrationType.paid:
            db_event.auto_accept_registration = False
    except Exception:
        pass

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # Handle categories
    if event.categories:
        from app.models.event_model import EventCategory
        for cat_id in event.categories:
            db_cat = EventCategory(event_id=db_event.id, category_id=cat_id)
            db.add(db_cat)
        db.commit()
    
    # Add organizer as an 'organizer' participant
    # Check if participant entry already exists (unlikely for new event, but safe)
    existing_participant = db.query(EventParticipant).filter(
        EventParticipant.event_id == db_event.id,
        EventParticipant.user_id == current_user.id
    ).first()

    if not existing_participant:
        organizer_participant = EventParticipant(
            event_id=db_event.id,
            user_id=current_user.id,
            role=EventParticipantRole.organizer,
            status=EventParticipantStatus.accepted
        )
        db.add(organizer_participant)
        db.commit()
    
    db.refresh(db_event)
    
    # Attach categories if provided
    if hasattr(event, 'categories') and event.categories:
        from app.models.event_model import Category, EventCategory
        for category_id in event.categories:
            # Verify category exists
            category = db.query(Category).filter(Category.id == category_id).first()
            if category:
                # Check if already attached
                exists = db.query(EventCategory).filter(
                    EventCategory.event_id == db_event.id,
                    EventCategory.category_id == category_id
                ).first()
                if not exists:
                    new_assoc = EventCategory(event_id=db_event.id, category_id=category_id)
                    db.add(new_assoc)
        db.commit()
        db.refresh(db_event)

    try:
        from app.services.ai_service import upsert_event_embedding
        src = f"{db_event.title}\n{db_event.description or ''}\nformat:{db_event.format} type:{db_event.type}"
        upsert_event_embedding(db, db_event.id, src)
    except Exception:
        pass

    return db_event


@router.get("/events/requests/{participant_id}", response_model=EventInvitationResponse)
def get_request_details(
    participant_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a specific invitation/request.
    Also ensures a Conversation exists for this request.
    """
    print(f"DEBUG: get_request_details called with ID: {participant_id}, User: {current_user.id}")
    participant = db.query(EventParticipant).filter(EventParticipant.id == participant_id).first()
    if participant is None:
        print(f"DEBUG: Invitation {participant_id} NOT FOUND in DB")
        raise HTTPException(status_code=404, detail="Invitation not found")

    if participant.user_id != current_user.id:
        print(f"DEBUG: User {current_user.id} not authorized for invitation {participant_id} (owner: {participant.user_id})")
        raise HTTPException(status_code=403, detail="Not authorized to view this invitation")
    
    # --- Chat Logic: Ensure Conversation Exists ---
    if not participant.conversation_id:
        # Ensure a single consistent 1:1 conversation for organizer and invitee
        from app.models.chat_model import Conversation, ConversationParticipant as ChatParticipant
        event = db.query(Event).filter(Event.id == participant.event_id).first()
        organizer_id = event.organizer_id
        # Try to reuse existing conversation between organizer and invitee
        organizer_convs = db.query(ChatParticipant.conversation_id)\
            .filter(ChatParticipant.user_id == organizer_id).subquery()
        existing_conv = db.query(Conversation)\
            .join(ChatParticipant, ChatParticipant.conversation_id == Conversation.id)\
            .filter(
                ChatParticipant.user_id == participant.user_id,
                Conversation.id.in_(organizer_convs)
            ).first()
        if existing_conv:
            participant.conversation_id = existing_conv.id
            db.add(participant)
            db.commit()
            db.refresh(participant)
        else:
            # Create new conversation if none exists
            new_conv = Conversation()
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            db.add(ChatParticipant(conversation_id=new_conv.id, user_id=organizer_id))
            db.add(ChatParticipant(conversation_id=new_conv.id, user_id=participant.user_id))
            participant.conversation_id = new_conv.id
            db.add(participant)
            db.commit()
            db.refresh(participant)

    return participant


@router.get("/events/{event_id}/export-participants", response_class=StreamingResponse)
def export_event_participants_csv(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export all participants of an event as a CSV file.
    Only the organizer can export.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can export participants")
        
    # Fetch participants with profile data
    participants = (
        db.query(EventParticipant, User, Profile)
        .outerjoin(User, EventParticipant.user_id == User.id)
        .outerjoin(Profile, User.id == Profile.user_id)
        .filter(EventParticipant.event_id == event_id)
        .order_by(EventParticipant.created_at.desc())
        .all()
    )
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Name", 
        "Email", 
        "Role", 
        "Status", 
        "Join Method", 
        "Registration Date", 
        "Check-in Status",
        "Payment Status"
    ])
    
    for participant, user, profile in participants:
        # Determine display name
        display_name = participant.name
        if not display_name:
            if profile and profile.full_name:
                display_name = profile.full_name
            elif user:
                display_name = "User"
            else:
                display_name = "Unknown"
                
        # Determine email
        email = participant.email
        if not email and user:
            email = user.email
            
        registration_date = participant.created_at.strftime("%Y-%m-%d %H:%M:%S") if participant.created_at else ""
        
        writer.writerow([
            display_name,
            email or "",
            participant.role.value if participant.role else "",
            participant.status.value if participant.status else "",
            participant.join_method or "",
            registration_date,
            "Attended" if participant.status == EventParticipantStatus.attended else "Not Checked-in",
            participant.payment_status.value if participant.payment_status else "N/A"
        ])
        
    output.seek(0)
    
    filename = f"participants_{event.title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


# --- Publish/Unpublish & Registration Management ---

@router.put("/events/{event_id}/publish", response_model=EventDetails)
def publish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can publish the event")
    event.status = EventStatus.published
    # default registration to opened on publish if not set
    if getattr(event, "registration_status", None) is None:
        event.registration_status = EventRegistrationStatus.opened
    db.add(event)
    db.commit()
    db.refresh(event)
    try:
        from app.services.ai_service import upsert_event_embedding
        src = f"{event.title}\n{event.description or ''}\nformat:{event.format} type:{event.type}"
        upsert_event_embedding(db, event.id, src)
    except Exception:
        db.rollback()
    log_admin_action(db, current_user.id, "event.publish", "event", event.id)
    return event


@router.put("/events/{event_id}/unpublish", response_model=EventDetails)
def unpublish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can unpublish the event")
    event.status = EventStatus.draft
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.unpublish", "event", event.id)
    return event


@router.put("/events/{event_id}/registration/open", response_model=EventDetails)
def open_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can manage registration")
    event.registration_status = EventRegistrationStatus.opened
    # Coupled behavior: opening registration enables attendance scanning
    if hasattr(event, "is_attendance_enabled"):
        event.is_attendance_enabled = True
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.open", "event", event.id)
    try:
        committees = db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role == EventParticipantRole.committee
        ).all()
        for link in committees:
            if link.user_id:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=link.user_id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"Registration opened for '{event.title}'",
                    link_url=f"/dashboard?eventId={event.id}&tab=settings"
                )
    except Exception:
        pass
    return event


@router.put("/events/{event_id}/registration/close", response_model=EventDetails)
def close_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can manage registration")
    event.registration_status = EventRegistrationStatus.closed
    # Coupled behavior: closing registration disables attendance scanning
    if hasattr(event, "is_attendance_enabled"):
        event.is_attendance_enabled = False
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.close", "event", event.id)
    try:
        committees = db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role == EventParticipantRole.committee
        ).all()
        for link in committees:
            if link.user_id:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=link.user_id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"Registration closed for '{event.title}'",
                    link_url=f"/dashboard?eventId={event.id}&tab=settings"
                )
    except Exception:
        pass
    return event


# --- Category Management ---

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return categories


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Case-insensitive uniqueness check
    existing = (
        db.query(Category)
        .filter(func.lower(Category.name) == func.lower(body.name))
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Category already exists")

    category = Category(name=body.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/events/mine", response_model=list[MyEventItem])
def list_my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List events for the current user (organizer or participant), with your role."""
    # Events organized by me
    organized = db.query(Event).filter(Event.organizer_id == current_user.id, Event.deleted_at.is_(None)).all()

    # Events I'm participating in (exclude duplicates)
    participation_links = (
        db.query(EventParticipant)
        .filter(EventParticipant.user_id == current_user.id)
        .all()
    )
    event_map: dict[uuid.UUID, MyEventItem] = {}

    for e in organized:
        event_map[e.id] = MyEventItem(
            event_id=e.id,
            title=e.title,
            start_datetime=e.start_datetime,
            end_datetime=e.end_datetime,
            type=e.type,
            status=e.status,
            my_role=EventParticipantRole.organizer,
            my_status=EventParticipantStatus.accepted,
            cover_url=e.cover_url,
            venue_remark=e.venue_remark,
            format=e.format,
            participant_count=e.participant_count,
        )

    for link in participation_links:
        e = db.query(Event).filter(Event.id == link.event_id, Event.deleted_at.is_(None)).first()
        if e is None:
            continue
        existing = event_map.get(e.id)
        # Preserve organizer role if already set; otherwise set from participation link
        if existing is None or existing.my_role != EventParticipantRole.organizer:
            event_map[e.id] = MyEventItem(
                event_id=e.id,
                title=e.title,
                start_datetime=e.start_datetime,
                end_datetime=e.end_datetime,
                type=e.type,
                status=e.status,
                my_role=link.role,
                my_status=link.status,
                cover_url=e.cover_url,
                venue_remark=e.venue_remark,
                format=e.format,
                participant_count=e.participant_count,
            )

    return list(event_map.values())


# --- Reminder Endpoints ---

@router.post("/events/{event_id}/reminders", response_model=EventReminderResponse)
def create_event_reminder(
    event_id: uuid.UUID,
    body: EventReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = EventReminderService.create_reminder(
        db,
        event_id=event_id,
        user=current_user,
        option=body.option,
    )
    return reminder

@router.delete("/events/{event_id}/reminders", status_code=204)
def delete_my_event_reminder(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    EventReminderService.delete_pending_reminders(db, event_id=event_id, user_id=current_user.id)
    return

@router.get("/events/reminders/me", response_model=list[EventReminderResponse])
def list_my_event_reminders(
    upcoming_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EventReminderService.list_my_reminders(db, user_id=current_user.id, upcoming_only=upcoming_only)


@router.post("/events/reminders/run", response_model=list[EventReminderResponse])
def run_due_event_reminders(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EventReminderService.run_due_for_user(db, user=current_user, limit=limit)


@router.get("/events/checklist/me", response_model=list[EventChecklistItemResponse])
def list_my_checklist_items(
    only_open: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(EventChecklistItem).filter(EventChecklistItem.assigned_user_id == current_user.id)
    if only_open:
        q = q.filter(EventChecklistItem.is_completed == False)
    items = q.order_by(EventChecklistItem.due_datetime.asc(), EventChecklistItem.sort_order.asc()).all()
    return items


@router.get("/events/{event_id}", response_model=EventDetails)
def get_event_details(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    is_admin = bool(current_user and ("admin" in current_user.roles))
    is_organizer = bool(current_user and (event.organizer_id == current_user.id))
    is_participant = False
    if current_user is not None:
        participant = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        is_participant = participant is not None
        
    # Security Check: Unpublished events (Draft) should NOT be visible to public
    # Only Organizer, Admin, or Committee (if implemented) can see drafts
    # Invited participants (e.g. speakers) should also see it to accept invitations
    if event.status != EventStatus.published:
        if event.status == EventStatus.draft and not (is_organizer or is_admin or is_participant):
             raise HTTPException(status_code=404, detail="Event not found")

    # Hide payment QR unless organizer, participant, or admin
    if not (is_organizer or is_participant or is_admin):
        event.payment_qr_url = None

    # Populate extra fields for EventDetails schema
    # organizer_name and organizer_avatar are properties on the Event model, so we don't set them manually.
    
    event.participant_count = (
        db.query(EventParticipant)
        .join(User, EventParticipant.user_id == User.id)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.status.in_([
                EventParticipantStatus.accepted,
                EventParticipantStatus.attended,
            ]),
            User.status == UserStatus.active
        )
        .count()
    )
    
    if event.type == EventType.online:
        event.meeting_url = event.venue_remark

    if event.visibility == EventVisibility.public:
        return event

    if is_admin or is_organizer or is_participant:
        return event

    raise HTTPException(status_code=403, detail="This event is private")


@router.get("/events/{event_id}/me", response_model=EventParticipationSummary)
def get_my_participation_summary(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    link = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if link is None:
        return EventParticipationSummary(is_participant=False, my_role=None, my_status=None)
    return EventParticipationSummary(is_participant=True, my_role=link.role, my_status=link.status)

@router.get("/events/{event_id}/participants", response_model=List[EventParticipantDetails])
def list_event_participants(
    event_id: uuid.UUID,
    role: str | None = Query(None),
    status: List[EventParticipantStatus] | None = Query(None),
    user_status: List[str] | None = Query(None),
    user_visibility: List[str] | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility == EventVisibility.private:
        if current_user is None:
            raise HTTPException(status_code=403, detail="This event is private")
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if participant is None:
                raise HTTPException(status_code=403, detail="This event is private")

    q = db.query(EventParticipant, User, Profile).\
        outerjoin(User, EventParticipant.user_id == User.id).\
        outerjoin(Profile, EventParticipant.user_id == Profile.user_id).\
        filter(EventParticipant.event_id == event.id)

    if role is not None:
        try:
            role_enum = EventParticipantRole(role)
            q = q.filter(EventParticipant.role == role_enum)
        except ValueError:
            return []
            
    if status:
        q = q.filter(EventParticipant.status.in_(status))

    if user_status:
        q = q.filter(User.status.in_(user_status))
    
    if user_visibility:
        q = q.filter(Profile.visibility.in_(user_visibility))

    results = q.all()
    
    output = []
    for p, u, prof in results:
        details = EventParticipantDetails.model_validate(p)
        if u:
            details.user_status = u.status
        if prof:
            details.user_visibility = prof.visibility
            details.user_avatar = prof.avatar_url
            details.user_full_name = prof.full_name
            details.user_title = prof.title
            
        output.append(details)

    return output


@router.post("/events/{event_id}/join", response_model=EventParticipantDetails)
def join_public_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a signed-in user to join a public event while registration is opened.
    - Prevent duplicate joins
    - Respect max_participant capacity (counts accepted)
    - Auto-accept to `accepted` if event.auto_accept_registration and capacity available, else `pending`
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility != EventVisibility.public:
        raise HTTPException(status_code=403, detail="This event is not public")

    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")

    # Require registration to be opened
    try:
        from app.models.event_model import EventRegistrationStatus
    except Exception:
        EventRegistrationStatus = None
    if EventRegistrationStatus is not None:
        if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
            raise HTTPException(status_code=400, detail="Registration is closed")

    # Check if event has started
    import datetime
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    if event.start_datetime and event.start_datetime < now_utc:
        # Event has started
        # If it is a physical event, reject and tell user to use Walk-in
        # For hybrid/online, we might allow it, but let's be strict for now based on user request.
        # The user specifically mentioned "Join by walk-in (for physical event)" or "Contact organizer".
        # We will return a specific 400 so frontend can handle it, or just a descriptive message.
        if event.location_type == "physical":
            raise HTTPException(
                status_code=400, 
                detail="Event has started. Please use Walk-in Registration at the venue or contact the organizer team to join."
            )
        else:
            # For online/hybrid, maybe allow? Or block? 
            # User said "or just contacting the organizer". Let's block to be safe and consistent.
            raise HTTPException(
                status_code=400, 
                detail="Event has started. Please contact the organizer team to join."
            )

    # Allow joining during event window as long as registration is opened

    # Already a participant?
    existing = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
        )
        .first()
    )
    if existing is not None:
        return existing

    # Capacity check counts accepted participants
    if event.max_participant is not None:
        accepted_count = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.status == EventParticipantStatus.accepted,
            )
            .count()
        )
        # If auto-accept is enabled and accepting would exceed capacity, reject
        if event.auto_accept_registration and accepted_count >= event.max_participant:
            raise HTTPException(status_code=400, detail="Event is full")

    # Determine initial status
    initial_status = EventParticipantStatus.accepted
    initial_payment_status = None

    # Handle Paid Events
    from app.models.event_model import EventRegistrationType, EventPaymentStatus
    if event.registration_type == EventRegistrationType.paid:
        initial_status = EventParticipantStatus.pending
        initial_payment_status = EventPaymentStatus.pending
    else:
        # Free event logic
        if event.max_participant is not None:
            if not event.auto_accept_registration:
                initial_status = EventParticipantStatus.pending
            else:
                # double-check capacity when auto-accept enabled
                if accepted_count >= event.max_participant:
                    initial_status = EventParticipantStatus.pending

    participant = EventParticipant(
        event_id=event.id,
        user_id=current_user.id,
        role=EventParticipantRole.audience,
        description=None,
        join_method="pre_registered",
        status=initial_status,
        payment_status=initial_payment_status,
    )
    db.add(participant)

    NotificationService.create_notification(
        db=db,
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant joined your event '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    db.refresh(participant)
    # Email confirmation best-effort to the participant
    if current_user.email:
        try:
            send_event_joined_email(email=current_user.email, event=event)
        except Exception:
            pass
    return participant


@router.post("/events/{event_id}/walk-in", response_model=EventParticipantDetails)
def walk_in_attendance(
    event_id: uuid.UUID,
    name: str = Form(...),
    email: str = Form(...),
    receipt: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    """
    Register a walk-in participant.
    - If email exists in participants, update status to attended.
    - If not, create new participant (linking User if exists).
    - If event is paid, receipt is required and status becomes pending.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if participant exists by email
    participant = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.email == email
    ).first()

    if participant:
        # User requested to block existing participants from using this form
        raise HTTPException(
            status_code=400, 
            detail="Participant with this email already registered. Please use standard check-in."
        )

    # Check if user exists
    user = db.query(User).filter(User.email == email).first()

    if user and user.id == event.organizer_id:
         raise HTTPException(status_code=400, detail="Organizer cannot register as a walk-in participant")
    
    status = EventParticipantStatus.attended
    payment_status = None
    payment_proof_url = None

    # Handle paid events logic
    if event.price and event.price > 0:
        if not receipt:
            raise HTTPException(status_code=400, detail="Payment receipt is required for paid events")
        
        # Upload receipt
        try:
            payment_proof_url = upload_file(receipt, "receipts")
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to upload receipt")

        status = EventParticipantStatus.pending
        payment_status = "pending"
    
    participant = EventParticipant(
        event_id=event_id,
        user_id=user.id if user else None,
        name=name,
        email=email,
        role=EventParticipantRole.audience,
        status=status,
        join_method="walk_in",
        payment_status=payment_status,
        payment_proof_url=payment_proof_url
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    # Notify organizer about new walk-in registration
    try:
        NotificationService.create_notification(
            db=db,
            recipient_id=event.organizer_id,
            actor_id=(user.id if user else event.organizer_id),
            type=NotificationType.event,
            content=f"New walk-in registration: {name} ({email}) for '{event.title}'",
            link_url=f"/dashboard?eventId={event.id}&tab=people"
        )
    except Exception:
        pass
    try:
        if user:
            msg = "Walk-in registration submitted, pending confirmation" if status == EventParticipantStatus.pending else "Attendance recorded"
            NotificationService.create_notification(
                db=db,
                recipient_id=user.id,
                actor_id=(user.id),
                type=NotificationType.event,
                content=f"{msg} for '{event.title}'",
                link_url=f"/main/events/{event.id}"
            )
    except Exception:
        pass
    return participant


@router.delete("/events/{event_id}/participants/me", status_code=204)
def leave_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a participant to quit an event. Organizer cannot leave their own event.
    Deleting the participation allows re-joining later if still open.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="You are not a participant of this event")

    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=403, detail="Organizer cannot leave their own event")

    # Delete participation record
    db.delete(participant)

    # Notify organizer
    NotificationService.create_notification(
        db=db,
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant left your event '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    return Response(status_code=204)


@router.post("/events/{event_id}/participants", response_model=EventParticipantDetails)
def invite_event_participant(
    event_id: uuid.UUID,
    body: EventParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can invite
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to invite participants")

    try:
        role_enum = _parse_role(body.role)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid participant role")
    if role_enum == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot invite organizer; event already has one")

    existing = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == body.user_id,
        )
        .first()
    )
    if existing:
        if existing.role != role_enum:
            existing.role = role_enum
            if body.description is not None:
                existing.description = body.description
            
            # Update sponsor fields if provided
            if body.promo_link is not None:
                existing.promo_link = body.promo_link
            if body.promo_image_url is not None:
                existing.promo_image_url = body.promo_image_url
                
            db.add(existing)

            NotificationService.create_notification(
                db=db,
                recipient_id=existing.user_id,
                actor_id=current_user.id,
                type=NotificationType.event,
                content=f"Your role for '{event.title}' has been updated to {role_enum.value}",
                link_url=f"/main/events/{event.id}",
            )
            db.commit()
            db.refresh(existing)

            recipient = db.query(User).filter(User.id == body.user_id).first()
            if recipient and recipient.email:
                send_event_role_update_email(email=recipient.email, event=event, new_role=role_enum)
            return existing
        else:
            # Even if role is same, allow updating sponsor details? 
            # The current logic raises 409 if role is same. 
            # I will modify to allow update if it is a sponsor and we have new data? 
            # For now, let's stick to existing flow but maybe I should allow updates.
            # User said "added by organizer". If already added, maybe they want to update.
            # But the 409 explicitly blocks. I will leave the 409 for now to avoid breaking existing flow logic 
            # unless requested. The prompt implies "filling" logic.
            raise HTTPException(status_code=409, detail="User is already a participant of this event")
    participant = EventParticipant(
        event_id=event.id,
        user_id=body.user_id,
        role=role_enum,
        description=body.description,
        join_method="invited",
        status=EventParticipantStatus.pending,
        promo_link=body.promo_link,
        promo_image_url=body.promo_image_url,
        proposal_id=body.proposal_id,
    )
    db.add(participant)
    NotificationService.create_notification(
        db=db,
        recipient_id=body.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"You have been invited to '{event.title}' as {role_enum.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    db.refresh(participant)
    # Send email notification (best-effort)
    recipient = db.query(User).filter(User.id == body.user_id).first()
    if recipient and recipient.email:
        send_event_invitation_email(email=recipient.email, event=event, role=role_enum, description=body.description)
    return participant

@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if (not is_admin) and (event.organizer_id != current_user.id):
        raise HTTPException(status_code=403, detail="Only organizer or admin can delete events")
    event.deleted_at = func.now()
    db.add(event)
    db.commit()
    log_admin_action(db, current_user.id, "event.delete", "event", event.id)
    return Response(status_code=204)


@router.put("/events/{event_id}/participants/me/status", response_model=EventParticipantDetails)
def respond_event_invitation(
    event_id: uuid.UUID,
    body: EventParticipantResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="You are not a participant of this event")

    # Only allow accepted or rejected responses from pending state, keep it simple
    participant.status = body.status
    db.add(participant)
    db.commit()
    db.refresh(participant)
    NotificationService.create_notification(
        db=db,
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant updated status to {body.status.value} for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    return participant


@router.put("/events/{event_id}/participants/me/payment", response_model=EventParticipantDetails)
def upload_payment_proof(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EventPaymentService.upload_payment_proof(db, event_id=event_id, file=file, current_user=current_user)


@router.post("/events/{event_id}/participants/bulk", response_model=List[EventParticipantDetails])
def invite_event_participants_bulk(
    event_id: uuid.UUID,
    body: EventParticipantBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can invite
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to invite participants")

    created: list[EventParticipant] = []
    for item in body.items:
        try:
            role_enum = _parse_role(item.role)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid participant role")
        if role_enum == EventParticipantRole.organizer:
            # Skip organizer invitations in bulk
            continue

        existing = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == item.user_id,
            )
            .first()
        )
        if existing is not None:
            if existing.role != role_enum:
                existing.role = role_enum
                if item.description is not None:
                    existing.description = item.description
                db.add(existing)
                NotificationService.create_notification(
                    db=db,
                    recipient_id=item.user_id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"Your role for '{event.title}' has been updated to {role_enum.value}",
                    link_url=f"/main/events/{event.id}",
                )
                created.append(existing)
                continue

        participant = EventParticipant(
            event_id=event.id,
            user_id=item.user_id,
            role=role_enum,
            description=item.description,
            join_method="invited",
            status=EventParticipantStatus.pending,
            proposal_id=item.proposal_id,
        )
        
        # If invited with a proposal, auto-create conversation immediately
        if item.proposal_id:
            from app.models.chat_model import Conversation, ConversationParticipant as ChatParticipant
            new_conv = Conversation()
            db.add(new_conv)
            db.flush()
            
            # Participants: Organizer & Expert
            p_ids = {current_user.id, item.user_id}
            for pid in p_ids:
                db.add(ChatParticipant(conversation_id=new_conv.id, user_id=pid))
            
            participant.conversation_id = new_conv.id

        db.add(participant)
        # Create notification per invitee
        NotificationService.create_notification(
            db=db,
            recipient_id=item.user_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"You have been invited to '{event.title}' as {role_enum.value}",
            link_url=f"/main/events/{event.id}",
        )
        created.append(participant)

    db.commit()
    # Refresh all created participants
    for p in created:
        db.refresh(p)
        # Send email best-effort
        recipient = db.query(User).filter(User.id == p.user_id).first()
        if recipient and recipient.email:
            send_event_invitation_email(email=recipient.email, event=event, role=p.role, description=p.description)

    return created


@router.put("/events/{event_id}/participants/{participant_id}/role", response_model=EventParticipantDetails)
def update_event_participant_role(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    body: EventParticipantRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer updates a participant's role. Cannot modify organizer participant."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can update roles
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can update participant roles")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Prevent changing organizer's role
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot change organizer's role")

    # Update role
    participant.role = body.role
    db.add(participant)
    db.commit()
    db.refresh(participant)

    NotificationService.create_notification(
        db=db,
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Your role for '{event.title}' has been updated to {body.role.value}",
        link_url=f"/main/events/{event.id}",
    )

    # Email best-effort
    recipient = db.query(User).filter(User.id == participant.user_id).first()
    if recipient and recipient.email:
        send_event_role_update_email(email=recipient.email, event=event, new_role=body.role)

    return participant


@router.put("/events/{event_id}/participants/{participant_id}/status", response_model=EventParticipantDetails)
def organizer_update_participant_status(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    body: EventParticipantResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer sets a participant's status to accepted or rejected."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can update participant status")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot change organizer's status")
    if body.status not in (EventParticipantStatus.accepted, EventParticipantStatus.rejected):
        raise HTTPException(status_code=400, detail="Only accepted or rejected are allowed")
    participant.status = body.status
    db.add(participant)
    db.commit()
    db.refresh(participant)
    NotificationService.create_notification(
        db=db,
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Your participation status for '{event.title}' is now {body.status.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    return participant


@router.post("/events/{event_id}/self-checkin", response_model=EventParticipantDetails)
def self_checkin(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Participant self-check-in for online events (or physical events via Event QR)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")

    # Check time window (custom logic or reuse EventPhase logic if available in backend, usually simple date check)
    now_utc = datetime.now(timezone.utc)
    
    # Allow check-in on event day (00:00 to 23:59) or during event time
    # Simplified: Allow if within 24h start or during event
    # For online events, maybe tighter window? stick to standard attendance open window
    
    # Logic: Start - 24h <= now <= End + buffer?
    # Usually attendance is open on Event Day.
    
    # Assuming start_datetime is TZ-aware or naive (DB stores naive UTC usually?)
    # Models use DateTime(timezone=True) often. Let's check model.
    # In `event_router.py`, `now_utc` is used.
    
    st = event.start_datetime
    if st.tzinfo is None:
        st = st.replace(tzinfo=timezone.utc)
    
    et = event.end_datetime
    if et.tzinfo is None:
        et = et.replace(tzinfo=timezone.utc)
        
    # Check-in window: 2 hours before start until end of event
    # Relaxed: 1 day before as per UI "QR Available 24h Before Event"
    start_window = st - timedelta(hours=24)
    end_window = et + timedelta(hours=4) # allow late checkout? or just end.
    
    if not (start_window <= now_utc <= end_window):
         raise HTTPException(status_code=400, detail="Check-in is not currently valid for this event.")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == None) # dummy
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    
    if participant is None:
        raise HTTPException(status_code=403, detail="You are not a registered participant.")
        
    if participant.status != EventParticipantStatus.accepted and participant.status != EventParticipantStatus.attended:
         raise HTTPException(status_code=403, detail="Registration not accepted.")

    if participant.status == EventParticipantStatus.attended:
        return participant # Already checked in
        
    participant.status = EventParticipantStatus.attended
    participant.attended_at = now_utc # If column exists? Let's check model.
    # If attended_at doesn't exist, just status.
    
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    return participant


@router.put("/events/{event_id}/participants/{participant_id}/payment", response_model=EventParticipantDetails)
def update_participant_payment_status(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    body: EventParticipantResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EventPaymentService.verify_participant_payment(
        db,
        event_id=event_id,
        participant_id=participant_id,
        new_status=body.status,
        current_user=current_user,
    )

@router.delete("/events/{event_id}/participants/{participant_id}")
def remove_event_participant(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer removes a participant from the event. Cannot remove organizer participant."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can remove
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can remove participants")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Prevent removing the organizer
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot remove organizer participant")

    # Delete participant
    db.delete(participant)
    db.commit()

    # Notify participant in-app
    NotificationService.create_notification(
        db=db,
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"You have been removed from '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()

    log_admin_action(db, current_user.id, "event.participant.remove", "event", event.id)

    # Email best-effort
    recipient = db.query(User).filter(User.id == participant.user_id).first()
    if recipient and recipient.email:
        send_event_removed_email(email=recipient.email, event=event)

    return {"detail": "Participant removed"}

# --- Event-Category Relationships ---

@router.get("/events/{event_id}/categories", response_model=List[CategoryResponse])
def list_event_categories(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # For private events, restrict visibility similar to participants
    if event.visibility == EventVisibility.private:
        if current_user is None:
            raise HTTPException(status_code=403, detail="This event is private")
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if participant is None:
                raise HTTPException(status_code=403, detail="This event is private")

    categories = (
        db.query(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .filter(EventCategory.event_id == event.id)
        .order_by(Category.name.asc())
        .all()
    )
    return categories


@router.post("/events/{event_id}/categories", response_model=List[CategoryResponse])
def attach_event_categories(
    event_id: uuid.UUID,
    body: EventCategoryAttach,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can modify categories
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to modify event categories")

    # Attach categories if they exist and not already attached
    for cid in body.category_ids:
        category = db.query(Category).filter(Category.id == cid).first()
        if category is None:
            raise HTTPException(status_code=404, detail=f"Category {cid} not found")
        existing = (
            db.query(EventCategory)
            .filter(EventCategory.event_id == event.id, EventCategory.category_id == cid)
            .first()
        )
        if existing is None:
            link = EventCategory(event_id=event.id, category_id=cid)
            db.add(link)

    db.commit()

    categories = (
        db.query(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .filter(EventCategory.event_id == event.id)
        .order_by(Category.name.asc())
        .all()
    )
    return categories


# --- End Event (Organizer) ---

@router.get("/events/{event_id}/proposals", response_model=List[EventProposalResponse])
def list_event_proposals(
    event_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if not is_admin:
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            allowed_roles = (
                EventParticipantRole.committee,
                EventParticipantRole.speaker,
                EventParticipantRole.sponsor,
            )
            if participant is None or participant.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Not allowed")
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    proposals = (
        db.query(EventProposal)
        .filter(EventProposal.event_id == event.id)
        .order_by(EventProposal.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    # Backfill conversation_id if missing
    from app.models.chat_model import Conversation, ConversationParticipant as ChatParticipant
    dirty = False
    for p in proposals:
        if not p.conversation_id:
            # Create Conversation
            new_conv = Conversation()
            db.add(new_conv)
            db.flush()
            
            # Participants: Organizer (event.organizer_id) & Created By (p.created_by_user_id)
            cparts = list(set([event.organizer_id, p.created_by_user_id]))
            for uid in cparts:
                 db.add(ChatParticipant(conversation_id=new_conv.id, user_id=uid))
            
            p.conversation_id = new_conv.id
            db.add(p)
            dirty = True
            
    if dirty:
        db.commit()
        # Refresh all to ensure IDs are loaded? Actually they are objects in session.
        # But let's be safe.
        for p in proposals:
            db.refresh(p)
            
    return proposals

@router.post("/events/{event_id}/proposals", response_model=EventProposalResponse)
async def create_event_proposal(
    event_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker):
            raise HTTPException(status_code=403, detail="Not allowed to create proposals")

    content_type = request.headers.get("content-type", "")
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    upload: UploadFile | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        title = form.get("title")
        description = form.get("description")
        file_url = form.get("file_url")
        potential = form.get("file")
        upload = potential if hasattr(potential, "filename") else None
    else:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        title = payload.get("title")
        description = payload.get("description")
        file_url = payload.get("file_url")

    if upload and not file_url:
        file_url = upload_file(upload, "event_proposals")
    final_title = title or event.title
    final_description = description or event.description

    proposal = EventProposal(
        event_id=event_id,
        created_by_user_id=current_user.id,
        title=title,
        description=description,
        file_url=file_url,
    )
    db.add(proposal)
    db.flush()

    # --- Chat Logic: Auto-create Conversation ---
    # Determine organizer ID
    event = db.query(Event).filter(Event.id == event_id).first()
    organizer_id = event.organizer_id
    
    # Simple logic: create a new conversation for this proposal
    from app.models.chat_model import Conversation, ConversationParticipant as ChatParticipant
    
    # Create Conversation ONLY if the proposal is created by someone else (e.g. an expert applying)
    # If the organizer creates the proposal (e.g. a template or internal doc), we don't start a chat yet.
    # The chat will start when they INVITE someone to this proposal.
    if current_user.id != organizer_id:
        new_conv = Conversation()
        db.add(new_conv)
        db.flush()
        
        # Add Participants: Organizer & Proposer
        p_ids = {organizer_id, current_user.id}
        for pid in p_ids:
            cp = ChatParticipant(conversation_id=new_conv.id, user_id=pid)
            db.add(cp)
        
        proposal.conversation_id = new_conv.id
        
        db.commit()
    else:
        # Just commit the proposal without a conversation
        db.commit()
        
    db.refresh(proposal)
    return proposal

@router.get("/events/{event_id}/proposals/{proposal_id}/comments", response_model=List[EventProposalCommentResponse])
def list_event_proposal_comments(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if not is_admin:
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            allowed_roles = (
                EventParticipantRole.committee,
                EventParticipantRole.speaker,
                EventParticipantRole.sponsor,
            )
            if participant is None or participant.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Not allowed")
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    comments = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.proposal_id == proposal.id)
        .order_by(EventProposalComment.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return comments

# --- Walk-in / On-site Registration Endpoints ---

@router.post("/events/{event_id}/walk-in/tokens", response_model=EventWalkInTokenResponse)
def create_walk_in_token(
    event_id: uuid.UUID,
    body: EventWalkInTokenCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a secure token for walk-in registration links.
    Only organizers or committee members can generate these.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Auth check
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.organizer):
            raise HTTPException(status_code=403, detail="Not authorized to generate walk-in tokens")

    token = EventWalkInToken(
        event_id=event_id,
        created_by_user_id=current_user.id,
        label=body.label,
        max_uses=body.max_uses,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token

@router.get("/events/walk-in/tokens/{event_id}", response_model=List[EventWalkInTokenResponse])
def get_walk_in_tokens(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active tokens for an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Auth check
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.organizer):
            raise HTTPException(status_code=403, detail="Not authorized")

    tokens = db.query(EventWalkInToken).filter(EventWalkInToken.event_id == event_id).order_by(EventWalkInToken.created_at.desc()).all()
    return tokens

@router.get("/events/walk-in/validate/{token_str}", response_model=EventDetails)
def validate_walk_in_token(
    token_str: str,
    db: Session = Depends(get_db),
):
    """
    Public endpoint to validate a token and get event details.
    """
    token_obj = db.query(EventWalkInToken).filter(EventWalkInToken.token == token_str).first()
    if not token_obj or not token_obj.is_active:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
        
    if token_obj.max_uses is not None and token_obj.current_uses >= token_obj.max_uses:
         raise HTTPException(status_code=400, detail="This link has reached its maximum usage limit")

    event = db.query(Event).filter(Event.id == token_obj.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    return event

@router.post("/events/walk-in/register/{token_str}", response_model=EventParticipantDetails)
def register_walk_in(
    token_str: str,
    name: str = Form(...),
    email: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    """
    Public endpoint to submit walk-in registration.
    """
    token_obj = db.query(EventWalkInToken).filter(EventWalkInToken.token == token_str).first()
    if not token_obj or not token_obj.is_active:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
        
    if token_obj.max_uses is not None and token_obj.current_uses >= token_obj.max_uses:
         raise HTTPException(status_code=400, detail="This link has reached its maximum usage limit")

    event = db.query(Event).filter(Event.id == token_obj.event_id).first()
    
    # Check if user already exists (by email)
    user = db.query(User).filter(User.email == email).first()
    user_id = user.id if user else None
    
    # Check duplicate participation
    if user_id:
        existing = db.query(EventParticipant).filter(EventParticipant.event_id == event.id, EventParticipant.user_id == user_id).first()
        if existing:
            if existing.status == EventParticipantStatus.pending and event.registration_type == EventRegistrationType.free:
                 existing.status = EventParticipantStatus.attended
                 db.add(existing)
                 db.commit()
                 db.refresh(existing)
                 return existing
            return existing 
    
    # Create Participant
    status = EventParticipantStatus.accepted
    payment_status = None
    payment_proof_url = None
    
    if event.registration_type == EventRegistrationType.paid:
        if not file:
             raise HTTPException(status_code=400, detail="Payment proof is required for paid events")
        
        # Upload file
        try:
            payment_proof_url = upload_file(file, "payment_proofs")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

        status = EventParticipantStatus.pending 
        payment_status = EventPaymentStatus.pending
    else:
        # Free event -> Auto attend
        status = EventParticipantStatus.attended

    participant = EventParticipant(
        event_id=event.id,
        user_id=user_id,
        name=name,
        email=email,
        role=EventParticipantRole.audience,
        status=status,
        payment_status=payment_status,
        payment_proof_url=payment_proof_url,
        join_method="walk_in",
        walk_in_token_id=token_obj.id,
        description=f"Walk-in via {token_obj.label or 'link'}"
    )
    db.add(participant)
    
    # Increment token usage
    token_obj.current_uses += 1
    db.add(token_obj)
    
    db.commit()
    db.refresh(participant)
    try:
        NotificationService.create_notification(
            db=db,
            recipient_id=event.organizer_id,
            actor_id=(user_id or event.organizer_id),
            type=NotificationType.event,
            content=f"New walk-in registration: {name} ({email}) for '{event.title}'",
            link_url=f"/dashboard?eventId={event.id}&tab=people"
        )
        if user_id:
            msg = "Walk-in registration submitted, pending confirmation" if status == EventParticipantStatus.pending else ("Attendance recorded" if status == EventParticipantStatus.attended else "Registration accepted")
            NotificationService.create_notification(
                db=db,
                recipient_id=user_id,
                actor_id=user_id,
                type=NotificationType.event,
                content=f"{msg} for '{event.title}'",
                link_url=f"/main/events/{event.id}"
            )
    except Exception:
        pass
    return participant

@router.post("/events/{event_id}/proposals/{proposal_id}/comments", response_model=EventProposalCommentResponse)
def create_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    body: EventProposalCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
        )
        .first()
    )
    if event.organizer_id != current_user.id and participant is None:
        raise HTTPException(status_code=403, detail="Not allowed to comment")
    comment = EventProposalComment(proposal_id=proposal.id, user_id=current_user.id, content=body.content)
    db.add(comment)
    NotificationService.create_notification(
        db=db,
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A comment was added to a proposal for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    # Notify proposal owner via in-app and email (best-effort) if not the same as organizer/actor
    if proposal.created_by_user_id != event.organizer_id and proposal.created_by_user_id != current_user.id:
        owner = db.query(User).filter(User.id == proposal.created_by_user_id).first()
        NotificationService.create_notification(
            db=db,
            recipient_id=proposal.created_by_user_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"A comment was added to your proposal for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        )
        if owner and owner.email:
            try:
                send_event_proposal_comment_email(email=owner.email, event=event, proposal=proposal, comment_content=body.content)
            except Exception:
                pass
    db.commit()
    db.refresh(comment)
    return comment

@router.put("/events/{event_id}/proposals/{proposal_id}", response_model=EventProposalResponse)
def update_event_proposal(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    body: EventProposalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
        if proposal is None:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if (my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker)) and proposal.created_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed to update proposals")
    else:
        proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
        if proposal is None:
            raise HTTPException(status_code=404, detail="Proposal not found")
    if body.title is not None:
        proposal.title = body.title
    if body.description is not None:
        proposal.description = body.description
    if body.file_url is not None:
        proposal.file_url = body.file_url
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

@router.delete("/events/{event_id}/proposals/{proposal_id}", status_code=204)
def delete_event_proposal(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if (my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker)) and proposal.created_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed to delete proposals")
    db.query(EventProposalComment).filter(EventProposalComment.proposal_id == proposal.id).delete(synchronize_session=False)
    db.delete(proposal)
    db.commit()
    return

@router.put("/events/{event_id}/proposals/{proposal_id}/comments/{comment_id}", response_model=EventProposalCommentResponse)
def update_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    comment_id: uuid.UUID,
    body: EventProposalCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comment = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.id == comment_id, EventProposalComment.proposal_id == proposal.id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        if event.organizer_id != current_user.id:
            my_participation = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if my_participation is None or my_participation.role != EventParticipantRole.committee:
                raise HTTPException(status_code=403, detail="Not allowed to update comment")
    if body.content is not None:
        comment.content = body.content
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/events/{event_id}/proposals/{proposal_id}/comments/{comment_id}", status_code=204)
def delete_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comment = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.id == comment_id, EventProposalComment.proposal_id == proposal.id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        if event.organizer_id != current_user.id:
            my_participation = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if my_participation is None or my_participation.role != EventParticipantRole.committee:
                raise HTTPException(status_code=403, detail="Not allowed to delete comment")
    db.delete(comment)
    db.commit()
    return

@router.post("/events/{event_id}/end", response_model=EventDetails)
def end_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer ends the event. Only allowed after event end time.
    Sets status to ended and marks non-attended audiences as absent.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can end the event
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can end the event")

    now_utc = datetime.now(timezone.utc)
    ed = event.end_datetime
    if ed.tzinfo is None:
        ed = ed.replace(tzinfo=timezone.utc)
    if now_utc < ed:
        raise HTTPException(status_code=400, detail="Event has not ended yet")

    # Set status to ended
    event.status = EventStatus.ended
    db.add(event)

    # Mark audiences who did not attend as absent
    audience_roles = [
        EventParticipantRole.audience,
        EventParticipantRole.student,
        EventParticipantRole.teacher,
    ]
    not_attended = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.accepted,
        )
        .all()
    )
    for p in not_attended:
        p.status = EventParticipantStatus.absent
        db.add(p)

    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.end", "event", event.id)
    return event


# --- Event Images (Organizer/Committee) ---

@router.put("/events/{event_id}/images/logo", response_model=EventDetails)
def update_event_logo(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update event logo")

    url = upload_file(file, "event_logos")
    event.logo_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}/images/cover", response_model=EventDetails)
def update_event_cover(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update event cover")

    url = upload_file(file, "event_covers")
    event.cover_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}/payment_qr", response_model=EventDetails)
def update_event_payment_qr(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EventPaymentService.update_event_payment_qr(db, event_id=event_id, file=file, current_user=current_user)


def _make_attendance_token(event_id: uuid.UUID, minutes_valid: int = 15) -> tuple[str, datetime]:
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes_valid)
    payload = f"{event_id}|{int(exp.timestamp())}"
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    token = f"{base64.urlsafe_b64encode(payload.encode('utf-8')).decode('utf-8').rstrip('=')}.{base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')}"
    return token, exp


def _verify_attendance_token(token: str) -> uuid.UUID:
    try:
        payload_b64, sig_b64 = token.split(".")
        # Pad base64 strings if needed
        def _pad(s: str) -> str:
            return s + "=" * ((4 - len(s) % 4) % 4)
        payload_raw = base64.urlsafe_b64decode(_pad(payload_b64)).decode("utf-8")
        sig = base64.urlsafe_b64decode(_pad(sig_b64))
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_raw.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected_sig):
            raise HTTPException(status_code=400, detail="Invalid token signature")
        event_id_str, exp_ts_str = payload_raw.split("|")
        exp_ts = int(exp_ts_str)
        if int(datetime.now(timezone.utc).timestamp()) > exp_ts:
            raise HTTPException(status_code=400, detail="Token expired")
        return uuid.UUID(event_id_str)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")


@router.post("/events/{event_id}/attendance/qr", response_model=AttendanceQRResponse)
def generate_event_attendance_qr(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a short-lived QR token for event attendance.
    Only organizer or committee can generate.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to generate attendance QR")

    token, exp = _make_attendance_token(event_id)
    return AttendanceQRResponse(token=token, expires_at=exp)


@router.get("/events/{event_id}/attendance/qr.png")
def get_event_attendance_qr_png(
    event_id: uuid.UUID,
    minutes_valid: int = Query(15, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a PNG QR image for a short-lived attendance token.
    Only organizer or committee can generate.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to generate attendance QR")

    token, _ = _make_attendance_token(event_id, minutes_valid=minutes_valid)

    try:
        import qrcode
        img = qrcode.make(token)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()
        return Response(content=png_bytes, media_type="image/png")
    except ImportError:
        raise HTTPException(status_code=500, detail="qrcode library not installed. Please add 'qrcode' and 'Pillow' to requirements.")


@router.post("/events/attendance/scan", response_model=EventParticipantDetails)
def scan_event_attendance(
    body: AttendanceScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark current user as attended for event defined by QR token.
    User must already be a participant. If not logged in, provide the email
    used for event registration. Idempotent if already attended.
    """
    event_id = _verify_attendance_token(body.token)
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")

    # Attendance only during event live window for published events
    now_utc = datetime.now(timezone.utc)
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")
    start_dt = event.start_datetime
    end_dt = event.end_datetime
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    if now_utc > end_dt:
        raise HTTPException(status_code=400, detail="Attendance is only available until the event end time")

    target_user_id: uuid.UUID | None = current_user.id

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == target_user_id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="You are not a participant of this event. Join before start time.")

    # Optional: disallow attendance before event starts
    # if event.start_datetime > func.now():
    #     raise HTTPException(status_code=400, detail="Attendance can only be marked during/after the event")

    # Only accepted participants can mark attendance; idempotent if already attended
    if participant.status == EventParticipantStatus.accepted:
        participant.status = EventParticipantStatus.attended
        db.add(participant)
        NotificationService.create_notification(
            db=db,
            recipient_id=participant.user_id,
            actor_id=participant.user_id,
            type=NotificationType.event,
            content=f"Attendance recorded for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        )
        db.commit()
        db.refresh(participant)
        return participant
    elif participant.status == EventParticipantStatus.attended:
        return participant
    else:
        raise HTTPException(status_code=403, detail="Only accepted participants can mark attendance")


@router.post("/events/{event_id}/attendance/walk_in", response_model=EventParticipantDetails)
def walk_in_event_attendance(
    event_id: uuid.UUID,
    body: WalkInAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")
    
    # Permission check: Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to register walk-in")

    now_utc = datetime.now(timezone.utc)
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")
    start_dt = event.start_datetime
    end_dt = event.end_datetime
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    if now_utc > end_dt:
        raise HTTPException(status_code=400, detail="Attendance is only available until the event end time")

    email_norm = body.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_norm).first()
    if user is None:
        rnd_pwd = base64.urlsafe_b64encode(os.urandom(24)).decode("utf-8").rstrip("=")
        user = create_user(db, UserCreate(email=email_norm, password=rnd_pwd))
        prof = db.query(Profile).filter(Profile.user_id == user.id).first()
        if prof:
            prof.full_name = body.name
            db.add(prof)
            db.commit()
            db.refresh(prof)

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == user.id)
        .first()
    )
    
    # Walk-in is ONLY for new onsite attendees, not existing participants
    if participant is not None:
        raise HTTPException(
            status_code=400, 
            detail="This email is already registered for this event. Please use the QR code attendance system instead."
        )
    
    # Create new walk-in participant
    participant = EventParticipant(
        event_id=event.id,
        user_id=user.id,
        role=EventParticipantRole.audience,
        description=None,
        join_method="walk_in",
        status=EventParticipantStatus.attended,
    )
    db.add(participant)
    NotificationService.create_notification(
        db=db,
        recipient_id=user.id,
        actor_id=user.id,
        type=NotificationType.event,
        content=f"Attendance recorded for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    db.refresh(participant)
    
    # Notify organizer that a walk-in attendance was recorded
    try:
        NotificationService.create_notification(
            db=db,
            recipient_id=event.organizer_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"Walk-in attendance recorded: {body.name} ({email_norm}) for '{event.title}'",
            link_url=f"/dashboard?eventId={event.id}&tab=people"
        )
    except Exception:
        pass
    return participant





# --- Attendance Stats (Organizer/Committee) ---

@router.get("/events/{event_id}/attendance/stats", response_model=EventAttendanceStats)
def get_event_attendance_stats(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return attendance stats for audiences and overall participants.
    Accessible by organizer or committee.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to view attendance stats")

    audience_roles = [
        EventParticipantRole.audience,
        EventParticipantRole.student,
        EventParticipantRole.teacher,
    ]
    valid_statuses = [
        EventParticipantStatus.accepted,
        EventParticipantStatus.attended,
        EventParticipantStatus.pending,
    ]

    total_audience = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id, 
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status.in_(valid_statuses)
        )
        .count()
    )
    attended_audience = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.attended,
        )
        .count()
    )
    absent_audience = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.absent,
        )
        .count()
    )
    total_participants = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.status.in_(valid_statuses)
        )
        .count()
    )
    attended_total = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.status == EventParticipantStatus.attended,
        )
        .count()
    )

    return EventAttendanceStats(
        event_id=event.id,
        total_audience=total_audience,
        attended_audience=attended_audience,
        absent_audience=absent_audience,
        total_participants=total_participants,
        attended_total=attended_total,
    )


# --- Scheduler (Transitions) ---

@router.post("/events/scheduler/run")
def run_event_scheduler(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run event status transitions:
    - Close registration at start time for published events
    - End events after end time and mark absent for accepted audiences
    Organizer-only for now. In production, wire to a backend scheduler.
    """
    # Only admins/organizers could be allowed; for now allow any authenticated user
    now = datetime.now(timezone.utc)
    updated = 0

    # Close registration
    to_close = (
        db.query(Event)
        .filter(
            Event.status == EventStatus.published,
            Event.start_datetime <= now,
        )
        .limit(limit)
        .all()
    )
    for e in to_close:
        if getattr(e, "registration_status", None) == EventRegistrationStatus.opened:
            e.registration_status = EventRegistrationStatus.closed
            db.add(e)
            updated += 1

    # End events and mark absents
    to_end = (
        db.query(Event)
        .filter(
            Event.status == EventStatus.published,
            Event.end_datetime < now,
        )
        .limit(limit)
        .all()
    )
    for e in to_end:
        e.status = EventStatus.ended
        db.add(e)
        audience_roles = [
            EventParticipantRole.audience,
            EventParticipantRole.student,
            EventParticipantRole.teacher,
        ]
        not_attended = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == e.id,
                EventParticipant.role.in_(audience_roles),
                EventParticipant.status == EventParticipantStatus.accepted,
            )
            .all()
        )
        for p in not_attended:
            p.status = EventParticipantStatus.absent
            db.add(p)
        updated += 1

    db.commit()
    return {"updated": updated}


# --- Event Checklist (Organizer/Committee) ---



@router.get("/events/{event_id}/checklist", response_model=list[EventChecklistItemResponse])
def list_event_checklist(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to view checklist")

    items = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.event_id == event.id)
        .order_by(EventChecklistItem.sort_order.asc(), EventChecklistItem.created_at.asc())
        .all()
    )
    return items


@router.post("/events/{event_id}/checklist", response_model=EventChecklistItemResponse)
def create_event_checklist_item(
    event_id: uuid.UUID,
    body: EventChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to create checklist")

    # Validate due date if provided: must be in future and not after event start
    if body.due_datetime is not None:
        due = body.due_datetime
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        event_start = event.start_datetime
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if due < now_utc:
            raise HTTPException(status_code=400, detail="Due date must be in the future")
        if due > event_start:
            raise HTTPException(status_code=400, detail="Due date must be on or before event start time")

    item = EventChecklistItem(
        event_id=event.id,
        title=body.title,
        description=body.description,
        visibility=body.visibility or ChecklistVisibility.internal,
        audience_role=body.audience_role,
        link_url=body.link_url,
        assigned_user_id=body.assigned_user_id,
        due_datetime=body.due_datetime,
        created_by_user_id=current_user.id,
        is_completed=False,
        sort_order=0,
    )
    
    # Handle Assignments
    if body.assigned_user_ids:
        users = db.query(User).filter(User.id.in_(body.assigned_user_ids)).all()
        item.assigned_users = users
        if users:
            item.assigned_user_id = users[0].id # Sync legacy
    elif body.assigned_user_id is not None:
        assigned = db.query(User).filter(User.id == body.assigned_user_id).first()
        if assigned is None:
            raise HTTPException(status_code=400, detail="Assigned user not found")
        item.assigned_users = [assigned]
        
    if body.file_ids is not None:
        files = db.query(EventProposal).filter(EventProposal.id.in_(body.file_ids)).all()
        item.files = files
        
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Notify assigned users (if any)
    try:
        if item.assigned_users:
            for u in item.assigned_users:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=u.id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"You have been assigned a task '{item.title}' for '{event.title}'",
                    link_url=f"/dashboard?eventId={event.id}&tab=checklist"
                )
    except Exception:
        pass
    return item


@router.put("/events/{event_id}/checklist/{item_id}", response_model=EventChecklistItemResponse)
def update_event_checklist_item(
    event_id: uuid.UUID,
    item_id: uuid.UUID,
    body: EventChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update checklist")

    item = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.id == item_id, EventChecklistItem.event_id == event.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if body.title is not None:
        item.title = body.title
    if body.description is not None:
        item.description = body.description
    if body.is_completed is not None:
        item.is_completed = body.is_completed
    if body.is_completed is not None:
        item.is_completed = body.is_completed

    # Handle Assignments (New Field)
    if body.assigned_user_ids is not None:
        users = db.query(User).filter(User.id.in_(body.assigned_user_ids)).all()
        item.assigned_users = users
        # Sync legacy field
        item.assigned_user_id = users[0].id if users else None

    # Handle Assignments (Legacy Field) - Only if new field not provided
    elif "assigned_user_id" in body.model_fields_set:
        if body.assigned_user_id is None:
            item.assigned_user_id = None
            item.assigned_users = []
        else:
            assigned = db.query(User).filter(User.id == body.assigned_user_id).first()
            if assigned is None:
                raise HTTPException(status_code=400, detail="Assigned user not found")
            item.assigned_user_id = body.assigned_user_id
            item.assigned_users = [assigned]

    if body.sort_order is not None:
        item.sort_order = body.sort_order
    # Explicitly clear due date if provided as null
    if "due_datetime" in body.model_fields_set and body.due_datetime is None:
        item.due_datetime = None
    if "visibility" in body.model_fields_set and body.visibility is not None:
        item.visibility = body.visibility
    if "audience_role" in body.model_fields_set:
        item.audience_role = body.audience_role
    if "link_url" in body.model_fields_set:
        item.link_url = body.link_url
    if body.due_datetime is not None:
        due = body.due_datetime
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        event_start = event.start_datetime
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if due < now_utc:
            raise HTTPException(status_code=400, detail="Due date must be in the future")
        if due > event_start:
            raise HTTPException(status_code=400, detail="Due date must be on or before event start time")
        item.due_datetime = due

    if body.file_ids is not None:
        files = db.query(EventProposal).filter(EventProposal.id.in_(body.file_ids)).all()
        item.files = files

    # Capture newly assigned users for notification
    prev_assigned_ids = set([u.id for u in getattr(item, "assigned_users", [])])
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    try:
        new_assigned_ids = set([u.id for u in getattr(item, "assigned_users", [])])
        newly_assigned = list(new_assigned_ids - prev_assigned_ids)
        if newly_assigned:
            users = db.query(User).filter(User.id.in_(newly_assigned)).all()
            for u in users:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=u.id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"You have been assigned a task '{item.title}' for '{event.title}'",
                    link_url=f"/dashboard?eventId={event.id}&tab=checklist"
                )
    except Exception:
        pass
    return item


@router.delete("/events/{event_id}/checklist/{item_id}")
def delete_event_checklist_item(
    event_id: uuid.UUID,
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to delete checklist item")

    item = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.id == item_id, EventChecklistItem.event_id == event.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Checklist item deleted"}

@router.get("/events/{event_id}/checklist/external", response_model=list[EventChecklistItemResponse])
def list_event_external_checklist(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    participant_role: EventParticipantRole | None = None
    if current_user is not None:
        link = (
            db.query(EventParticipant)
            .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
            .first()
        )
        participant_role = link.role if link else None

    if event.visibility == EventVisibility.private and participant_role is None and event.organizer_id != (current_user.id if current_user else None):
        raise HTTPException(status_code=403, detail="This event is private")
    items = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.event_id == event.id, EventChecklistItem.visibility == ChecklistVisibility.external)
        .order_by(EventChecklistItem.sort_order.asc(), EventChecklistItem.created_at.asc())
        .all()
    )
    def _visible(i: EventChecklistItem):
        if getattr(i, "audience_role", None) is None:
            return True
        return participant_role is not None and i.audience_role == participant_role
    filtered = [i for i in items if _visible(i)]
    return filtered
@router.put("/events/{event_id}", response_model=EventDetails)
def update_event(
    event_id: uuid.UUID,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can update core event details
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Only organizer or committee can update event")

    # Validate date range if provided
    if body.start_datetime is not None and body.end_datetime is not None:
        if body.end_datetime <= body.start_datetime:
            raise HTTPException(status_code=400, detail="End datetime must be after start datetime")

    if body.max_participant is not None and body.max_participant is not None and body.max_participant <= 0:
        raise HTTPException(status_code=400, detail="max_participant must be a positive integer")

    # Apply partial updates
    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.logo_url is not None:
        event.logo_url = body.logo_url
    if body.cover_url is not None:
        event.cover_url = body.cover_url
    if body.meeting_url is not None:
        event.meeting_url = body.meeting_url
    if body.format is not None:
        event.format = body.format
        # derive type if not provided
        if body.type is None:
            event.type = EventType.online if event.format == EventFormat.webinar else EventType.physical
    if body.type is not None:
        event.type = body.type
    if body.start_datetime is not None:
        event.start_datetime = body.start_datetime
    if body.end_datetime is not None:
        event.end_datetime = body.end_datetime
    if body.registration_type is not None:
        event.registration_type = body.registration_type
        # For paid events, enforce non auto-accept registration
        try:
            from app.models.event_model import EventRegistrationType
            if event.registration_type == EventRegistrationType.paid:
                event.auto_accept_registration = False
        except Exception:
            pass
    if body.visibility is not None:
        event.visibility = body.visibility
    if body.max_participant is not None:
        event.max_participant = body.max_participant
    if body.venue_place_id is not None:
        event.venue_place_id = body.venue_place_id
    if body.venue_remark is not None:
        event.venue_remark = body.venue_remark
    if body.remark is not None:
        event.remark = body.remark
    if body.price is not None:
        event.price = body.price
    if body.currency is not None:
        event.currency = body.currency

    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can delete event")
    # Soft-delete: mark the event as deleted and retain history
    event.deleted_at = func.now()
    db.add(event)
    db.commit()
    log_admin_action(db, current_user.id, "event.delete", "event", event_id)
    return

# --- Category Admin Management ---

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: uuid.UUID,
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    # Case-insensitive uniqueness check
    existing = (
        db.query(Category)
        .filter(func.lower(Category.name) == func.lower(body.name), Category.id != category_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Category already exists")
    category.name = body.name
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.query(EventCategory).filter(EventCategory.category_id == category_id).delete(synchronize_session=False)
    db.delete(category)
    db.commit()
    return
@router.post("/events/{event_id}/attendance/user_qr", response_model=AttendanceQRResponse)
def generate_user_attendance_qr(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="Not a participant of this event")
    token, exp = _make_user_attendance_token(event.id, current_user.id)
    return AttendanceQRResponse(token=token, expires_at=exp)


@router.get("/events/{event_id}/attendance/user_qr.png")
def get_user_attendance_qr_png(
    event_id: uuid.UUID,
    minutes_valid: int = Query(15, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
        raise HTTPException(status_code=400, detail="Registration is closed; attendance scanning is disabled")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="Not a participant of this event")
    token, _ = _make_user_attendance_token(event.id, current_user.id, minutes_valid=minutes_valid)
    import qrcode, io
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    return Response(content=png_bytes, media_type="image/png")


@router.post("/events/{event_id}/attendance/scan_user", response_model=EventParticipantDetails)
def scan_user_attendance(
    event_id: uuid.UUID,
    body: AttendanceUserScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if not getattr(event, "is_attendance_enabled", True):
        raise HTTPException(status_code=400, detail="Attendance is disabled for this event")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed")
    tok_event_id, tok_user_id = _verify_user_attendance_token(body.token)
    if tok_event_id != event.id:
        raise HTTPException(status_code=400, detail="Invalid token for event")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == tok_user_id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    participant.status = EventParticipantStatus.attended
    participant.join_method = participant.join_method or "qr_scan"
    db.add(participant)
    NotificationService.create_notification(
        db=db,
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Attendance recorded for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/events/{event_id}/proposals/ai-suggest")
def suggest_event_proposal(
    event_id: uuid.UUID,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    # Organizer or admin only
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if not is_admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    event_payload = {
        "title": event.title,
        "format": getattr(event, "format", None).value if getattr(event, "format", None) else None,
        "start_datetime": getattr(event, "start_datetime", None).isoformat() if getattr(event, "start_datetime", None) else None,
        "end_datetime": getattr(event, "end_datetime", None).isoformat() if getattr(event, "end_datetime", None) else None,
        "registration_type": getattr(event, "registration_type", None).value if getattr(event, "registration_type", None) else None,
        "visibility": getattr(event, "visibility", None).value if getattr(event, "visibility", None) else None,
        "capacity": getattr(event, "capacity", None),
        "location": getattr(event, "location", None),
    }

    expert_profile = None
    expert_id = body.get("expert_id")
    if expert_id:
        try:
            ex_uid = uuid.UUID(expert_id)
            from app.models.profile_model import Profile
            prof = db.query(Profile).filter(Profile.user_id == ex_uid).first()
            if prof is not None:
                # Tags
                from app.models.profile_model import profile_tags, Tag
                tag_rows = (
                    db.query(Tag.name)
                    .join(profile_tags, Tag.id == profile_tags.c.tag_id)
                    .filter(profile_tags.c.profile_id == prof.id)
                    .all()
                )
                expert_profile = {
                    "full_name": getattr(prof, "full_name", None),
                    "tags": [t[0] for t in tag_rows] if tag_rows else [],
                }
        except Exception:
            expert_profile = None

    from app.services.ai_service import generate_proposal
    options = {
        "tone": body.get("tone"),
        "length_hint": body.get("length_hint"),
        "audience_level": body.get("audience_level"),
        "language": body.get("language"),
        "sections": body.get("sections"),
    }
    result = generate_proposal(event_payload, expert_profile, options)
    return result


# --- Proposal Comments ---

@router.get("/events/proposals/{proposal_id}/comments", response_model=List[EventProposalCommentResponse])
def get_proposal_comments(
    proposal_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    event = db.query(Event).filter(Event.id == proposal.event_id).first()
    if event is None:
         # Should not happen if integrity is maintained
         raise HTTPException(status_code=404, detail="Event not found")

    # Access control: Organizer, Admin, or the Creator of the proposal
    is_organizer = event.organizer_id == current_user.id
    is_creator = proposal.created_by_user_id == current_user.id
    is_admin = any(r.name == "admin" for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all())

    if not (is_organizer or is_creator or is_admin):
         # Check if committee?
         # For now restrict strictly
         raise HTTPException(status_code=403, detail="Not allowed to view comments")

    comments = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.proposal_id == proposal_id)
        .order_by(EventProposalComment.created_at.asc())
        .all()
    )
    return comments


@router.post("/events/proposals/{proposal_id}/comments", response_model=EventProposalCommentResponse)
def create_proposal_comment(
    proposal_id: uuid.UUID,
    body: EventProposalCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    event = db.query(Event).filter(Event.id == proposal.event_id).first()
    
    # Access control
    is_organizer = event and event.organizer_id == current_user.id
    is_creator = proposal.created_by_user_id == current_user.id
    is_admin = any(r.name == "admin" for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all())

    if not (is_organizer or is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed to comment")

    comment = EventProposalComment(
        proposal_id=proposal_id,
        user_id=current_user.id,
        content=body.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Send Notification (Email/In-App) handling
    # If commenter is organizer -> notify creator
    # If commenter is creator -> notify organizer
    recipient_id = None
    if current_user.id == proposal.created_by_user_id:
        recipient_id = event.organizer_id
    elif current_user.id == event.organizer_id:
        recipient_id = proposal.created_by_user_id
    
    if recipient_id and recipient_id != current_user.id:
        try:
            NotificationService.create_notification(
                db=db,
                recipient_id=recipient_id,
                actor_id=current_user.id,
                type=NotificationType.event,
                content=f"New comment on proposal '{proposal.title}'",
                link_url=f"/dashboard/events/{event.id}",
            )
        except Exception:
            pass

        # Email
        try:
             # Fetch recipient email
             recipient = db.query(User).filter(User.id == recipient_id).first()
             if recipient:
                 try:
                    send_event_proposal_comment_email(
                        email=recipient.email,
                        event_title=event.title or "Event",
                        proposal_title=proposal.title or "Proposal",
                        commenter_name=current_user.email, # or profile name
                        comment_content=body.content
                    )
                 except:
                    pass
        except Exception:
            pass

    return comment
