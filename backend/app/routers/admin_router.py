# app/routers/admin_router.py


from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from typing import List
import app.database.database
from app.database.database import get_db
from app.dependencies import require_roles
from app.models.user_model import User, Role, user_roles
from app.models.audit_log_model import AuditLog
from app.services.audit_service import log_admin_action
from pydantic import BaseModel
import csv
import io
from datetime import datetime
from fastapi.responses import StreamingResponse
import uuid
import json

from app.services.email_service import _wrap_html
from app.models.email_template_model import EmailTemplate as EmailTemplateModel
from app.schemas.email_schema import EmailTemplateCreate, EmailTemplateUpdate
from app.seeders.email_template_seeder import seed_default_email_templates
from app.models.event_model import (
    Event,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
    EventType,
    EventFormat,
    EventVisibility,
    EventStatus,
    EventRegistrationStatus,
    EventCategory,
    Category
)
from app.schemas.event_schema import EventUpdate, EventDetails, EventCreate
from app.services.cloudinary_service import upload_file

router = APIRouter()

@router.put("/events/{event_id}", response_model=EventDetails)
def admin_update_event(
    event_id: str,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Handle ownership transfer
    if body.organizer_id is not None:
        if body.organizer_id != event.organizer_id:
            # Verify new owner exists
            new_owner = db.query(User).filter(User.id == body.organizer_id).first()
            if not new_owner:
                raise HTTPException(status_code=404, detail="New organizer user not found")

            # Update event owner
            event.organizer_id = body.organizer_id

            # Ensure new owner is a participant with 'organizer' role
            new_owner_participant = db.query(EventParticipant).filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == body.organizer_id
            ).first()

            if new_owner_participant:
                new_owner_participant.role = EventParticipantRole.organizer
                new_owner_participant.status = EventParticipantStatus.accepted
            else:
                db.add(EventParticipant(
                    event_id=event.id,
                    user_id=body.organizer_id,
                    role=EventParticipantRole.organizer,
                    status=EventParticipantStatus.accepted,
                    join_method="seed" 
                ))

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
    if body.status is not None:
        event.status = body.status
    if body.organization_id is not None:
        event.organization_id = body.organization_id
    if body.payment_qr_url is not None:
        event.payment_qr_url = body.payment_qr_url
    if body.auto_accept_registration is not None:
        event.auto_accept_registration = body.auto_accept_registration
    if body.is_attendance_enabled is not None:
        event.is_attendance_enabled = body.is_attendance_enabled

    if body.categories is not None:
        # Clear existing categories
        db.query(EventCategory).filter(EventCategory.event_id == event.id).delete()
        
        # Add new categories
        for category_id in body.categories:
            # Verify category exists
            cat_exists = db.query(Category).filter(Category.id == category_id).first()
            if cat_exists:
                db.add(EventCategory(event_id=event.id, category_id=category_id))

    # Validate dates
    if event.end_datetime <= event.start_datetime:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
        
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Re-index for search if needed (best effort)
    try:
        from app.services.ai_service import upsert_event_embedding
        src = f"{event.title}\n{event.description or ''}\nformat:{event.format} type:{event.type}"
        upsert_event_embedding(db, event.id, src)
    except Exception:
        pass

    return event


@router.put("/events/{event_id}/images/payment-qr", response_model=EventDetails)
def admin_update_event_payment_qr(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    url = upload_file(file, "payment_qrs")
    event.payment_qr_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/events", response_model=List[EventDetails])
def admin_list_events(
    q: str | None = Query(None),
    status: EventStatus | None = Query(None),
    type: EventType | None = Query(None),
    format: EventFormat | None = Query(None),
    organizer_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin endpoint to list all events with filters"""
    query = db.query(Event)
    
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%"))
    if status:
        query = query.filter(Event.status == status)
    if type:
        query = query.filter(Event.type == type)
    if format:
        query = query.filter(Event.format == format)
    if organizer_id:
        query = query.filter(Event.organizer_id == organizer_id)
    
    return (
        query.order_by(Event.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

@router.post("/events", response_model=EventDetails)
def admin_create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """
    Admin endpoint to create a new event.
    """
    # Validate dates
    if body.end_datetime <= body.start_datetime:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
    
    # Create event with admin as organizer
    event = Event(
        organizer_id=current_user.id,
        title=body.title,
        description=body.description,
        format=body.format,
        type=body.type,
        start_datetime=body.start_datetime,
        end_datetime=body.end_datetime,
        registration_type=body.registration_type,
        visibility=body.visibility,
        status=EventStatus[body.status] if body.status and body.status in EventStatus.__members__ else EventStatus.draft,
        max_participant=body.max_participant,
        venue_place_id=body.venue_place_id,
        venue_remark=body.venue_remark,
        remark=body.remark,
        price=body.price or 0.0,
        currency=body.currency or "MYR",
        payment_qr_url=body.payment_qr_url,
        organization_id=body.organization_id
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Add categories if provided
    if body.categories:
        for cat_id in body.categories:
            cat_exists = db.query(Category).filter(Category.id == cat_id).first()
            if cat_exists:
                db.add(EventCategory(event_id=event.id, category_id=cat_id))
        db.commit()
    
    # Add organizer as participant
    db.add(EventParticipant(
        event_id=event.id,
        user_id=current_user.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="admin_create"
    ))
    db.commit()
    
    log_admin_action(db, current_user.id, "event.create", "event", event.id)
    db.refresh(event)
    return event



@router.delete("/events/{event_id}")
def admin_delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """
    Admin endpoint to delete an event.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    log_admin_action(db, current_user.id, "event.delete", "event", event.id)
    
    # Delete associated data
    db.query(EventCategory).filter(EventCategory.event_id == event_id).delete()
    db.query(EventParticipant).filter(EventParticipant.event_id == event_id).delete()
    
    # Delete the event
    db.delete(event)
    db.commit()
    
    return {"status": "success", "message": "Event deleted"}


@router.put("/events/{event_id}/publish", response_model=EventDetails)
def admin_publish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
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
def admin_unpublish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.status = EventStatus.draft
    db.add(event)
    db.commit()
    db.refresh(event)
    
    log_admin_action(db, current_user.id, "event.unpublish", "event", event.id)
    return event

@router.put("/events/{event_id}/registration/open", response_model=EventDetails)
def admin_open_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.registration_status = EventRegistrationStatus.opened
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.open", "event", event.id)
    return event

@router.put("/events/{event_id}/registration/close", response_model=EventDetails)
def admin_close_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event.registration_status = EventRegistrationStatus.closed
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.close", "event", event.id)
    return event

@router.put("/events/{event_id}/images/logo", response_model=EventDetails)
def admin_update_event_logo(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    url = upload_file(file, "event_logos")
    event.logo_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}/images/cover", response_model=EventDetails)
def admin_update_event_cover(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    url = upload_file(file, "event_covers")
    event.cover_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/ping")
def read_admin_root():
    return {"message": "Welcome to the ATAS Admin API!"}

from app.models.organization_model import Organization, OrganizationVisibility, OrganizationType, OrganizationStatus
from app.schemas.organization_schema import OrganizationResponse, OrganizationUpdate

@router.get("/organizations", response_model=List[OrganizationResponse])
def admin_list_organizations(
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    status: OrganizationStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    query = db.query(Organization).options(joinedload(Organization.owner).joinedload(User.profile))
    # Admin sees all visibilities by default
    
    # Filter out soft-deleted
    query = query.filter(Organization.deleted_at.is_(None))
    
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    if type:
        query = query.filter(Organization.type == type)
    if status:
        query = query.filter(Organization.status == status)

    return (
        query.order_by(Organization.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

@router.get("/organizations/count")
def admin_count_organizations(
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    status: OrganizationStatus | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    query = db.query(Organization)
    query = query.filter(Organization.deleted_at.is_(None))
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    if type:
        query = query.filter(Organization.type == type)
    if status:
        query = query.filter(Organization.status == status)
    total = query.with_entities(Organization.id).distinct().count()
    return {"total_count": total}


@router.post("/organizations/{org_id}/approve", response_model=OrganizationResponse)
def admin_approve_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Approve a pending organization"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.status = OrganizationStatus.approved
    db.commit()
    db.refresh(org)
    
    log_admin_action(db, current_user.id, "organization.approve", "organization", org.id)
    return org


@router.post("/organizations/{org_id}/reject", response_model=OrganizationResponse)
def admin_reject_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Reject a pending organization"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.status = OrganizationStatus.rejected
    db.commit()
    db.refresh(org)
    
    log_admin_action(db, current_user.id, "organization.reject", "organization", org.id)
    return org


@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def admin_update_organization(
    org_id: uuid.UUID,
    body: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Update organization details"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Apply partial updates
    if body.name is not None:
        org.name = body.name
    if body.description is not None:
        org.description = body.description
    if body.logo_url is not None:
        org.logo_url = body.logo_url
    if body.cover_url is not None:
        org.cover_url = body.cover_url
    if body.type is not None:
        org.type = body.type
    if body.website_url is not None:
        org.website_url = body.website_url
    if body.location is not None:
        org.location = body.location
    if body.visibility is not None:
        org.visibility = body.visibility
    if body.bank_details is not None:
        org.bank_details = body.bank_details
    if body.owner_id is not None:
        # Verify new owner exists
        new_owner = db.query(User).filter(User.id == body.owner_id).first()
        if not new_owner:
            raise HTTPException(status_code=404, detail="New owner user not found")
        org.owner_id = body.owner_id
    
    db.commit()
    db.refresh(org)
    
    log_admin_action(db, current_user.id, "organization.update", "organization", org.id)
    return org


@router.delete("/organizations/{org_id}")
def admin_delete_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Delete an organization"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    log_admin_action(db, current_user.id, "organization.delete", "organization", org.id)
    
    # Delete the organization
    db.delete(org)
    db.commit()
    
    return {"status": "success", "message": "Organization deleted"}

@router.get("/audit-logs", response_model=List[dict])
def list_audit_logs(
    action: str | None = None,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if actor_user_id:
        q = q.filter(AuditLog.user_id == actor_user_id)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AuditLog.target_id == target_id)
    if start_after is not None:
        q = q.filter(AuditLog.created_at >= start_after)
    if end_before is not None:
        q = q.filter(AuditLog.created_at <= end_before)
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [
        {
            "id": str(i.id),
            "actor_user_id": str(i.user_id) if i.user_id else None,
            "action": i.action,
            "target_type": i.target_type,
            "target_id": str(i.target_id) if i.target_id else None,
            "details": i.details,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in items
    ]

@router.get("/audit-logs/count")
def count_audit_logs(
    action: str | None = None,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if actor_user_id:
        q = q.filter(AuditLog.user_id == actor_user_id)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AuditLog.target_id == target_id)
    if start_after is not None:
        q = q.filter(AuditLog.created_at >= start_after)
    if end_before is not None:
        q = q.filter(AuditLog.created_at <= end_before)
    total = q.with_entities(AuditLog.id).distinct().count()
    return {"total_count": total}


class RoleApprovalRequest(BaseModel):
    role_name: str


@router.post("/users/{user_id}/roles/approve")
def approve_user_role(
    user_id: str,
    body: RoleApprovalRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.user_service import assign_role_to_user, remove_role_from_user
    approved: list[str] = []
    if body and body.role_name:
        final_role = body.role_name.strip().lower()
        pending_role = f"{final_role}_pending"
        assign_role_to_user(db, u, final_role)
        remove_role_from_user(db, u, pending_role)
        approved.append(final_role)
        log_admin_action(db, current_user.id, f"role.approve.{final_role}", "user", u.id)
    else:
        names = [r.name for r in getattr(u, "roles", [])]
        for name in names:
            if isinstance(name, str) and name.endswith("_pending"):
                final_role = name[:-8]
                assign_role_to_user(db, u, final_role)
                remove_role_from_user(db, u, name)
                approved.append(final_role)
                log_admin_action(db, current_user.id, f"role.approve.{final_role}", "user", u.id)
    db.commit()
    return {"user_id": str(u.id), "approved_roles": approved}


class RoleRejectionRequest(BaseModel):
    role_name: str
    reason: str | None = None


@router.post("/users/{user_id}/roles/reject")
def reject_user_role(
    user_id: str,
    body: RoleRejectionRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.user_service import remove_role_from_user
    rejected: list[str] = []
    if body and body.role_name:
        final_role = body.role_name.strip().lower()
        pending_role = f"{final_role}_pending"
        remove_role_from_user(db, u, pending_role)
        rejected.append(final_role)
        log_admin_action(db, current_user.id, f"role.reject.{final_role}", "user", u.id)
    else:
        names = [r.name for r in getattr(u, "roles", [])]
        for name in names:
            if isinstance(name, str) and name.endswith("_pending"):
                final_role = name[:-8]
                remove_role_from_user(db, u, name)
                rejected.append(final_role)
                log_admin_action(db, current_user.id, f"role.reject.{final_role}", "user", u.id)
    db.commit()
    return {"user_id": str(u.id), "rejected_roles": rejected, "reason": (body.reason if body else None)}


# --- Email Templates (Admin) ---





def _render_template(db: Session, name_or_id: str, variables: dict[str, str]) -> tuple[str, str]:
    q = db.query(EmailTemplateModel).filter(func.lower(EmailTemplateModel.name) == func.lower(name_or_id))
    t = q.first()
    if t is None:
        try:
            tid = uuid.UUID(name_or_id)
            t = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == tid).first()
        except Exception:
            t = None
    if t is None:
        subject = variables.get("subject", "Notification")
        inner_html = variables.get("body_html", "<p>You have a new message.</p>")
    else:
        subject = t.subject
        inner_html = t.body_html
        for k, v in (variables or {}).items():
            inner_html = inner_html.replace(f"{{{{{k}}}}}", v or "")
    html = _wrap_html(subject, inner_html)
    return subject, html


@router.get("/email-templates", response_model=List[dict])
def list_email_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    items = db.query(EmailTemplateModel).order_by(EmailTemplateModel.updated_at.desc().nullslast(), EmailTemplateModel.created_at.desc()).all()
    if not items:
        seed_default_email_templates(db)
        items = db.query(EmailTemplateModel).order_by(EmailTemplateModel.created_at.desc()).all()
    return [
        {
            "id": str(i.id),
            "name": i.name,
            "subject": i.subject,
            "body_html": i.body_html,
            "variables": (json.loads(i.variables) if i.variables else []),
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in items
    ]


@router.post("/email-templates", response_model=dict)
def create_email_template(
    body: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    existing = db.query(EmailTemplateModel).filter(func.lower(EmailTemplateModel.name) == func.lower(body.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    item = EmailTemplateModel(
        name=body.name,
        subject=body.subject,
        body_html=body.body_html,
        variables=(json.dumps(body.variables) if body.variables else None),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.put("/email-templates/{template_id}", response_model=dict)
def update_email_template(
    template_id: uuid.UUID,
    body: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    if body.name is not None:
        conflict = (
            db.query(EmailTemplateModel)
            .filter(func.lower(EmailTemplateModel.name) == func.lower(body.name), EmailTemplateModel.id != template_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=400, detail="Template name already exists")
        item.name = body.name
    if body.subject is not None:
        item.subject = body.subject
    if body.body_html is not None:
        item.body_html = body.body_html
    if body.variables is not None:
        item.variables = json.dumps(body.variables) if body.variables else None
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/email-templates/{template_id}", response_model=dict)
def get_email_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.delete("/email-templates/{template_id}")
def delete_email_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(item)
    db.commit()
    return {"message": "ok"}


class EmailTemplateBroadcastRequest(BaseModel):
    template_id: str | None = None
    template_name: str | None = None
    variables: dict[str, str] | None = None
    target_role: str | None = None
    target_user_id: uuid.UUID | None = None


@router.post("/email-templates/broadcast")
async def broadcast_email_template(
    body: EmailTemplateBroadcastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    name = (body.template_name or body.template_id or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="template_name or template_id required")

    query = db.query(User)
    if body.target_user_id:
        query = query.filter(User.id == body.target_user_id)
    elif body.target_role:
        query = (
            query
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .filter(func.lower(Role.name) == func.lower(body.target_role))
        )

    users = query.all()
    subject, html = _render_template(db, name, body.variables or {})

    # Try sending emails (best-effort)
    import resend
    from app.core.config import settings
    resend.api_key = settings.RESEND_API_KEY
    sent = 0
    for u in users:
        if not u.email:
            continue
        params = {"from": settings.SENDER_EMAIL, "to": [u.email], "subject": subject, "html": html}
        try:
            resend.Emails.send(params)
            sent += 1
        except Exception:
            # Silent fail per user; continue
            pass

    details_json = json.dumps({
        "template_name": name,
        "variables": body.variables or {},
        "target_role": body.target_role,
        "target_user_id": str(body.target_user_id) if body.target_user_id else None,
        "recipient_count": sent,
    })
    log_admin_action(db, current_user.id, "broadcast_email_template", "system", current_user.id, details_json)
    return {"count": sent}


class EmailTemplateTestSendRequest(BaseModel):
    to_email: str
    variables: dict[str, str] | None = None


@router.post("/email-templates/{template_id}/test-send")
def test_send_email_template(
    template_id: str,
    body: EmailTemplateTestSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    if not body.to_email:
        raise HTTPException(status_code=400, detail="to_email required")
    subject, html = _render_template(db, template_id, body.variables or {})
    import resend
    from app.core.config import settings
    resend.api_key = settings.RESEND_API_KEY
    params = {"from": settings.SENDER_EMAIL, "to": [body.to_email], "subject": f"[Test] {subject}", "html": html}
    try:
        resend.Emails.send(params)
        log_admin_action(db, current_user.id, "email_template.test_send", "user", current_user.id, json.dumps({"template_id": template_id, "to_email": body.to_email}))
        return {"message": "ok"}
    except Exception:
        # Still return ok to match frontend fallback behavior
        return {"message": "ok"}
@router.get("/pending-roles", response_model=list[str])
def list_pending_roles(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    roles = db.query(Role).all()
    names = [r.name for r in roles if isinstance(r.name, str) and r.name.endswith("_pending")]
    # Return unique sorted list
    return sorted(set(names))


# --- Admin Media Upload Endpoints ---

from fastapi import UploadFile, File
from app.services import profile_service, cloudinary_service

@router.put("/users/{user_id}/avatar")
def admin_update_user_avatar(
    user_id: uuid.UUID,
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    # Using profile_service.update_avatar logic but for specific user_id
    # profile_service.update_avatar expects owner logic, let's reuse update_profile logic or direct service call
    # Ideally profile_service.update_avatar(db, user_id, avatar) works for any user_id if we pass it
    p = profile_service.update_avatar(db, user_id, avatar)
    if not p:
        # Try creating profile if missing? Or just 404
        raise HTTPException(status_code=404, detail="User profile not found")
    return p

@router.put("/users/{user_id}/cover")
def admin_update_user_cover(
    user_id: uuid.UUID,
    cover: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    p = profile_service.update_cover_picture(db, user_id, cover)
    if not p:
        raise HTTPException(status_code=404, detail="User profile not found")
    return p

@router.put("/organizations/{org_id}/logo")
def admin_update_org_logo(
    org_id: uuid.UUID,
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    url = cloudinary_service.upload_file(logo, "org_logos")
    org.logo_url = url
    db.commit()
    db.refresh(org)
    log_admin_action(db, current_user.id, "organization.update_logo", "organization", org.id)
    return org

@router.put("/organizations/{org_id}/cover")
def admin_update_org_cover(
    org_id: uuid.UUID,
    cover: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    url = cloudinary_service.upload_file(cover, "org_covers")
    org.cover_url = url
    db.commit()
    db.refresh(org)
    log_admin_action(db, current_user.id, "organization.update_cover", "organization", org.id)
    return org


# Category Management Endpoints

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str | None = None

class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: __import__("datetime").datetime
    updated_at: __import__("datetime").datetime | None = None
    
    model_config = {"from_attributes": True}


@router.post("/categories", response_model=CategoryResponse)
def admin_create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Create a new category"""
    # Check for duplicate category name (case-insensitive)
    existing = db.query(Category).filter(
        func.lower(Category.name) == func.lower(body.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{body.name}' already exists")
    
    category = Category(name=body.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    
    log_admin_action(db, current_user.id, "category.create", "category", category.id)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def admin_update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Update a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if body.name is not None:
        # Check for duplicate category name (case-insensitive), excluding current category
        existing = db.query(Category).filter(
            func.lower(Category.name) == func.lower(body.name),
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{body.name}' already exists")
        
        category.name = body.name
    
    db.commit()
    db.refresh(category)
    
    log_admin_action(db, current_user.id, "category.update", "category", category.id)
    return category


@router.delete("/categories/{category_id}")
def admin_delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Delete a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    log_admin_action(db, current_user.id, "category.delete", "category", category.id)
    
    # Delete associated event-category relationships
    db.query(EventCategory).filter(EventCategory.category_id == category_id).delete()
    
    # Delete the category
    db.delete(category)
    db.commit()
    
    return {"status": "success", "message": "Category deleted"}


# --- Export Endpoints ---

@router.get("/export/users")
def export_users_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Export all users to CSV"""
    from io import StringIO
    import csv
    
    # Fetch all users with profiles
    users = db.query(User).options(joinedload(User.profile)).all()
    
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', 'Email', 'Full Name', 'Status', 'Verified', 'Roles', 'Created At'])
    
    # Write data
    for user in users:
        roles = ','.join([r.name for r in user.roles]) if user.roles else ''
        full_name = user.profile.full_name if user.profile else ''
        writer.writerow([
            str(user.id),
            user.email,
            full_name,
            user.status.value if user.status else '',
            user.is_verified,
            roles,
            user.created_at.isoformat() if user.created_at else ''
        ])
    
    output.seek(0)
    log_admin_action(db, current_user.id, "users.export", "system", None)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"}
    )


@router.get("/export/events")
def export_events_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Export all events to CSV"""
    from io import StringIO
    import csv
    
    events = db.query(Event).all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'Title', 'Format', 'Type', 'Status', 'Visibility',
        'Start Date', 'End Date', 'Organizer ID', 'Organization ID',
        'Registration Type', 'Max Participants', 'Created At'
    ])
    
    # Write data
    for event in events:
        writer.writerow([
            str(event.id),
            event.title,
            event.format.value if event.format else '',
            event.type.value if event.type else '',
            event.status.value if event.status else '',
            event.visibility.value if event.visibility else '',
            event.start_datetime.isoformat() if event.start_datetime else '',
            event.end_datetime.isoformat() if event.end_datetime else '',
            str(event.organizer_id) if event.organizer_id else '',
            str(event.organization_id) if event.organization_id else '',
            event.registration_type.value if event.registration_type else '',
            event.max_participant or '',
            event.created_at.isoformat() if event.created_at else ''
        ])
    
    output.seek(0)
    log_admin_action(db, current_user.id, "events.export", "system", None)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=events_export.csv"}
    )


@router.get("/export/organizations")
def export_organizations_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Export all organizations to CSV"""
    from io import StringIO
    import csv
    
    orgs = db.query(Organization).all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'Name', 'Type', 'Status', 'Visibility',
        'Owner ID', 'Location', 'Website', 'Created At'
    ])
    
    # Write data
    for org in orgs:
        writer.writerow([
            str(org.id),
            org.name,
            org.type.value if org.type else '',
            org.status.value if org.status else '',
            org.visibility.value if org.visibility else '',
            str(org.owner_id) if org.owner_id else '',
            org.location or '',
            org.website_url or '',
            org.created_at.isoformat() if org.created_at else ''
        ])
    
    output.seek(0)
    log_admin_action(db, current_user.id, "organizations.export", "system", None)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=organizations_export.csv"}
    )
