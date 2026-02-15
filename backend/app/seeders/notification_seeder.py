import logging
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.notification_model import Notification, NotificationType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_notifications():
    """
    Seeds initial system notifications for basic users (e.g. Welcome messages).
    """
    db = SessionLocal()
    try:
        logger.info("Seeding notifications...")

        # Basic users to notify
        target_emails = [
            "admin@gmail.com",
            "student@gmail.com",
            "expert@gmail.com",
            "sponsor@gmail.com"
        ]

        welcome_content = "Welcome to ATAS! Your profile is now set up."

        for email in target_emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Check if notification already exists
                existing = db.query(Notification).filter(
                    Notification.recipient_id == user.id,
                    Notification.content == welcome_content
                ).first()
                
                if not existing:
                    notification = Notification(
                        recipient_id=user.id,
                        actor_id=user.id, # System action, self-attributed
                        type=NotificationType.system,
                        content=welcome_content,
                        link_url="/dashboard"
                    )
                    db.add(notification)
                    logger.info(f"Created welcome notification for {email}")
                else:
                    logger.info(f"Welcome notification already exists for {email}")
            else:
                logger.warning(f"User not found for notification: {email}")

        db.commit()
        logger.info("Notifications seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding notifications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_notifications()
