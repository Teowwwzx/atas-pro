from fastapi import APIRouter, Depends, HTTPException
import uuid
import asyncio
import json
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database.database import get_db
from app.models.notification_model import Notification, NotificationType
from app.schemas.notification_schema import NotificationResponse, NotificationReadAllResponse
from app.dependencies import get_current_user, require_roles
from app.models.user_model import User

router = APIRouter()

@router.get("/notifications/me", response_model=list[NotificationResponse])
def list_my_notifications(
    unread_only: bool = False,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    q = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
    )
    if unread_only:
        q = q.filter(Notification.is_read == False)
    items = (
        q.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items

@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.recipient_id == current_user.id)
        .first()
    )
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/notifications/read-all", response_model=NotificationReadAllResponse)
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Notification).filter(Notification.recipient_id == current_user.id, Notification.is_read == False)
    count = q.count()
    q.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return NotificationReadAllResponse(updated_count=count)

@router.get("/notifications/me/unread-count")
def get_unread_notifications_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"unread_count": count}


from pydantic import BaseModel

class BroadcastNotificationRequest(BaseModel):
    title: str
    content: str
    target_role: str | None = None
    target_user_id: uuid.UUID | None = None
    link_url: str | None = None

@router.post("/admin/notifications/broadcast")
async def broadcast_notification(
    body: BroadcastNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    query = db.query(User)
    if body.target_user_id:
        query = query.filter(User.id == body.target_user_id)
    elif body.target_role:
        from app.models.user_model import user_roles, Role
        query = (
            query
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .filter(func.lower(Role.name) == func.lower(body.target_role))
        )

    users = query.all()
    
    notifications = []
    for user in users:
        # Use NotificationService to create notification
        from app.services.notification_service import NotificationService
        notif = NotificationService.create_notification(
            db=db,
            recipient_id=user.id,
            actor_id=current_user.id,
            type=NotificationType.system,
            content=body.content,
            link_url=body.link_url
        )
        notifications.append(notif)
    
    # Log the broadcast action to audit logs
    import json
    from app.services.audit_service import log_admin_action
    
    details_json = json.dumps({
        "title": body.title,
        "content": body.content,
        "target_role": body.target_role,
        "target_user_id": str(body.target_user_id) if body.target_user_id else None,
        "link_url": body.link_url,
        "recipient_count": len(notifications)
    })
    
    log_admin_action(
        db=db,
        actor_user_id=current_user.id,
        action="broadcast_notification",
        target_type="system",
        target_id=current_user.id, # Using admin ID as target for system-wide actions
        details=details_json
    )

    db.commit()
    return {"count": len(notifications)}
