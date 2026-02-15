import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user_model import User, Role
from app.models.event_model import (
    Event, EventFormat, EventType, EventVisibility, 
    EventStatus, EventRegistrationStatus, EventRegistrationType,
    EventParticipant, EventParticipantRole, EventParticipantStatus
)
from app.database.database import SessionLocal
from app.core.security import get_password_hash
from faker import Faker
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

fake = Faker()

def seed_large_scale_events(count=1000):
    """
    Seeds a large number of events.
    Assigns them to random existing users as organizers.
    """
    db = SessionLocal()
    try:
        logger.info(f"🚀 Starting large scale seed of {count} events...")
        
        # 1. Fetch existing users to be organizers
        user_ids = [row[0] for row in db.query(User.id).all()]
        
        if not user_ids:
            logger.error("❌ No users found. Run user seeders first.")
            return

        logger.info(f"📊 Found {len(user_ids)} potential organizers.")
        
        seeded_new = 0
        
        # Batch generation
        for i in range(count):
            organizer_id = random.choice(user_ids)
            event_id = uuid.uuid4()
            
            # Random Dates (upcoming and past)
            is_upcoming = random.choice([True, True, False]) # Bias towards upcoming
            if is_upcoming:
                start_date = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 90))
            else:
                start_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 365))
                
            end_date = start_date + timedelta(hours=random.randint(1, 4))
            
            # Create Event
            event = Event(
                id=event_id,
                organizer_id=organizer_id,
                title=fake.sentence(nb_words=6)[:-1], # Remove trailing period
                description=fake.text(max_nb_chars=500),
                format=random.choice(list(EventFormat)),
                type=random.choice(list(EventType)),
                start_datetime=start_date,
                end_datetime=end_date,
                visibility=random.choice([EventVisibility.public, EventVisibility.public, EventVisibility.private]), # Bias public
                status=EventStatus.published if is_upcoming else EventStatus.ended,
                registration_status=EventRegistrationStatus.opened if is_upcoming else EventRegistrationStatus.closed,
                registration_type=random.choice(list(EventRegistrationType)),
                max_participant=random.randint(10, 500),
                auto_accept_registration=random.choice([True, False]),
                venue_remark=fake.address() if random.choice([True, False]) else "Online",
                cover_url=f"https://picsum.photos/seed/{event_id}/800/400"
            )
            
            db.add(event)
            
            # Add Organizer Participant
            participant = EventParticipant(
                event_id=event_id,
                user_id=organizer_id,
                role=EventParticipantRole.organizer,
                status=EventParticipantStatus.accepted
            )
            db.add(participant)
            
            seeded_new += 1
            
            if seeded_new % 100 == 0:
                db.commit()
                logger.info(f"✅ Seeded {seeded_new}/{count} events...")
                
        db.commit()
        logger.info(f"🏁 Successfully seeded {seeded_new} NEW events.")

    except Exception as e:
        logger.error(f"❌ Large scale event seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed large scale events")
    parser.add_argument("--count", type=int, default=1000, help="Number of events to seed")
    args = parser.parse_args()
    
    seed_large_scale_events(count=args.count)
