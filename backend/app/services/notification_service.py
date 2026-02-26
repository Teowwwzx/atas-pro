
from sqlalchemy.orm import Session
import uuid
from app.models.notification_model import Notification, NotificationType

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: uuid.UUID,
        actor_id: uuid.UUID,
        type: NotificationType,
        content: str,
        link_url: str = None
    ) -> Notification:
        notif = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type,
            content=content,
            link_url=link_url,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        return notif

    @staticmethod
    def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
        return db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).count()
