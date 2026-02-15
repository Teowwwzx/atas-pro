import logging
import uuid
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.event_model import Event, EventParticipant, EventParticipantRole, EventParticipantStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_bookings():
    """
    Seeds booking and invitation data for events.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding bookings and invitations...")

        # Fetch users
        student = db.query(User).filter(User.email == "student@gmail.com").first()
        expert = db.query(User).filter(User.email == "expert@gmail.com").first()
        sponsor = db.query(User).filter(User.email == "sponsor@gmail.com").first()
        admin = db.query(User).filter(User.email == "admin@gmail.com").first()

        if not student:
            logger.warning("Student user not found! Skipping student bookings.")
        
        # Fetch events
        online_event = db.query(Event).filter(Event.title == "Online Webinar on AI").first()
        physical_event = db.query(Event).filter(Event.title == "Physical Workshop on Python").first()

        bookings = []

        # 1. Student as Audience for Online Event (Accepted)
        if student and online_event:
            bookings.append({
                "event_id": online_event.id,
                "user_id": student.id,
                "role": EventParticipantRole.audience,
                "status": EventParticipantStatus.accepted,
                "join_method": "registration",
                "name": student.full_name,
                "email": student.email,
                "description": "Interested in AI basics."
            })

        # 2. Expert as Speaker for Online Event (Accepted)
        if expert and online_event:
            bookings.append({
                "event_id": online_event.id,
                "user_id": expert.id,
                "role": EventParticipantRole.speaker,
                "status": EventParticipantStatus.accepted,
                "join_method": "invitation",
                "name": expert.full_name,
                "email": expert.email,
                "description": "Keynote speaker."
            })

        # 3. Student Invited to Physical Event (Pending)
        if student and physical_event:
            bookings.append({
                "event_id": physical_event.id,
                "user_id": student.id,
                "role": EventParticipantRole.audience,
                "status": EventParticipantStatus.pending,
                "join_method": "invitation",
                "name": student.full_name,
                "email": student.email,
                "description": "invited by organizer"
            })

        # 4. Sponsor as Sponsor for Physical Event (Accepted)
        if sponsor and physical_event:
            bookings.append({
                "event_id": physical_event.id,
                "user_id": sponsor.id,
                "role": EventParticipantRole.sponsor,
                "status": EventParticipantStatus.accepted,
                "join_method": "registration",
                "name": sponsor.full_name,
                "email": sponsor.email,
                "description": "Gold Tier Sponsor"
            })

        for booking in bookings:
            existing = db.query(EventParticipant).filter(
                EventParticipant.event_id == booking["event_id"],
                EventParticipant.user_id == booking["user_id"]
            ).first()

            if not existing:
                participant = EventParticipant(
                    event_id=booking["event_id"],
                    user_id=booking["user_id"],
                    role=booking["role"],
                    status=booking["status"],
                    join_method=booking["join_method"],
                    name=booking["name"],
                    email=booking["email"],
                    description=booking.get("description")
                )
                db.add(participant)
                logger.info(f"Added participant {booking['email']} to event {booking['event_id']}")
            else:
                logger.info(f"Participant {booking['email']} already exists for event {booking['event_id']}")

        db.commit()
        logger.info("Bookings/Invitations seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding bookings: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_bookings()
