import logging
import uuid
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.organization_model import Organization
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, Category, EventCategory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_events():
    """
    Seeds the database with initial events.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding events...")

        # 1. Find Organizer (Admin) and Org (APU)
        admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        apu_org = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()
        ai_cat = db.query(Category).filter(Category.name == "Artificial Intelligence").first()

        if not admin_user or not apu_org:
            logger.error("Admin user or APU organization not found. Please seed users and organizations first.")
            return

        now = datetime.now(timezone.utc)

        # 2. Create Online Free Event
        event1 = Event(
            title="Introduction to AI (Webinar)",
            description="Join us for an exciting webinar on the basics of Artificial Intelligence.",
            organizer_id=admin_user.id,
            organization_id=apu_org.id,
            format=EventFormat.webinar,
            type=EventType.online,
            start_datetime=now + timedelta(days=7), # 1 week from now
            end_datetime=now + timedelta(days=7, hours=2),
            registration_type=EventRegistrationType.free,
            status=EventStatus.published,
            visibility=EventVisibility.public,
            meeting_url="https://meet.google.com/abc-defg-hij",
            cover_url="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWklMjB3ZWJpbmFyfGVufDB8fDB8fHww"
        )
        db.add(event1)
        db.flush()

        if ai_cat:
            ec1 = EventCategory(event_id=event1.id, category_id=ai_cat.id)
            db.add(ec1)

        logger.info("Created event: Introduction to AI (Online Free)")

        # 3. Create Physical Paid Event
        event2 = Event(
            title="Advanced Robotics Workshop",
            description="Hands-on workshop building your first robot.",
            organizer_id=admin_user.id,
            organization_id=apu_org.id,
            format=EventFormat.workshop,
            type=EventType.physical,
            start_datetime=now + timedelta(days=14), # 2 weeks from now
            end_datetime=now + timedelta(days=14, hours=4),
            registration_type=EventRegistrationType.paid,
            price=50.00,
            currency="MYR",
            status=EventStatus.published,
            visibility=EventVisibility.public,
            venue_place_id="ChIJ...", # Placeholder
            venue_remark="APU Campus, Lab 3",
            cover_url="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cm9ib3RpY3N8ZW58MHx8MHx8fDA%3D"
        )
        db.add(event2)
        db.flush()

        if ai_cat:
            ec2 = EventCategory(event_id=event2.id, category_id=ai_cat.id)
            db.add(ec2)

        logger.info("Created event: Advanced Robotics Workshop (Physical Paid)")

        db.commit()
        logger.info("Events seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding events: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_events()
