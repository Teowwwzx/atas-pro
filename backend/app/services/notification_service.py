
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
        
        # Broadcast to SSE if user is connected
        import asyncio
        from app.services.sse_manager import sse_manager
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(sse_manager.send_to_user(recipient_id, notif))
        except RuntimeError:
            # No event loop running, skip SSE broadcast
            logger.warning(f"Skipping SSE broadcast for notification {notif.id} - no running event loop")
            pass
        
        return notif

    @staticmethod
    def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
        return db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).count()
