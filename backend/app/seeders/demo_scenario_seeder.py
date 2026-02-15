import logging
import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, 
    EventStatus, EventVisibility, Category, EventCategory,
    EventParticipant, EventParticipantRole, EventParticipantStatus
)
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_or_create_user(db: Session, email: str, role_name: str, full_name: str, title: str = None):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Get Role
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            db.flush()
        
        # Create User
        user = User(
            email=email,
            password=get_password_hash("123123"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=str(uuid.uuid4())[:8]
        )
        user.roles.append(role)
        db.add(user)
        db.flush()
        
        # Create Profile
        profile = Profile(
            user_id=user.id,
            full_name=full_name,
            visibility=ProfileVisibility.public,
            title=title,
            avatar_url=f"https://ui-avatars.com/api/?name={full_name.replace(' ', '+')}&background=random",
            is_onboarded=True
        )
        db.add(profile)
        logger.info(f"Created user: {email}")
    else:
        logger.info(f"User exists: {email}")
    return user

def get_or_create_category(db: Session, name: str):
    category = db.query(Category).filter(Category.name == name).first()
    if not category:
        category = Category(name=name)
        db.add(category)
        db.flush()
        logger.info(f"Created category: {name}")
    return category

def seed_demo_scenario():
    db = SessionLocal()
    try:
        logger.info("Seeding demo scenario...")
        
        # 1. Ensure Users
        student = get_or_create_user(db, "student@gmail.com", "student", "Student User", "Computer Science Student")
        expert = get_or_create_user(db, "expert@gmail.com", "expert", "Dr. Expert", "Senior AI Researcher")
        
        # 2. Ensure Categories
        tech_cat = get_or_create_category(db, "Technology")
        career_cat = get_or_create_category(db, "Career")
        business_cat = get_or_create_category(db, "Business")
        
        now = datetime.now(timezone.utc)
        
        # 3. Create Events
        events_data = [
            {
                "title": "APU Mega Hackathon 2025",
                "description": "Join the biggest hackathon of the year! 48 hours of coding, innovation, and fun. Prizes worth RM 10,000 to be won.",
                "organizer": expert,
                "category": tech_cat,
                "format": EventFormat.workshop, # Hackathon often fits workshop or other
                "type": EventType.physical,
                "start": now + timedelta(days=10),
                "end": now + timedelta(days=12),
                "cover": "https://images.unsplash.com/photo-1504384308090-c54be3855485?q=80&w=2664&auto=format&fit=crop",
                "participants": [(student, EventParticipantRole.student, EventParticipantStatus.accepted)]
            },
            {
                "title": "Future Career Fair",
                "description": "Connect with top employers from Google, Microsoft, and more. Bring your CV!",
                "organizer": expert,
                "category": career_cat,
                "format": EventFormat.seminar,
                "type": EventType.physical,
                "start": now + timedelta(days=5),
                "end": now + timedelta(days=5, hours=8),
                "cover": "https://images.unsplash.com/photo-1559223607-a43c990ed9bb?q=80&w=2670&auto=format&fit=crop",
                "participants": [(student, EventParticipantRole.student, EventParticipantStatus.accepted)]
            },
            {
                "title": "AI Research Symposium",
                "description": "A deep dive into the latest advancements in Large Language Models and Generative AI.",
                "organizer": expert,
                "category": tech_cat,
                "format": EventFormat.webinar,
                "type": EventType.online,
                "start": now + timedelta(days=20),
                "end": now + timedelta(days=20, hours=3),
                "meeting_url": "https://meet.google.com/demo-link",
                "cover": "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2670&auto=format&fit=crop",
                "participants": [(student, EventParticipantRole.audience, EventParticipantStatus.attended)]
            },
            {
                "title": "Student Study Group: Algorithms",
                "description": "Peer-to-peer study session for Data Structures and Algorithms.",
                "organizer": student,
                "category": tech_cat,
                "format": EventFormat.club_event,
                "type": EventType.physical,
                "start": now + timedelta(days=3),
                "end": now + timedelta(days=3, hours=2),
                "cover": "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2670&auto=format&fit=crop",
                "participants": [(expert, EventParticipantRole.speaker, EventParticipantStatus.accepted)]
            },
            {
                "title": "Startup Pitch Night",
                "description": "Watch aspiring student entrepreneurs pitch their ideas to investors.",
                "organizer": expert,
                "category": business_cat,
                "format": EventFormat.panel_discussion,
                "type": EventType.physical,
                "start": now + timedelta(days=15),
                "end": now + timedelta(days=15, hours=4),
                "cover": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2670&auto=format&fit=crop",
                "participants": [] # No student participant yet
            }
        ]
        
        for evt_data in events_data:
            # Check if event exists (by title)
            existing_event = db.query(Event).filter(Event.title == evt_data["title"]).first()
            if not existing_event:
                event = Event(
                    title=evt_data["title"],
                    description=evt_data["description"],
                    organizer_id=evt_data["organizer"].id,
                    format=evt_data["format"],
                    type=evt_data["type"],
                    start_datetime=evt_data["start"],
                    end_datetime=evt_data["end"],
                    registration_type=EventRegistrationType.free,
                    status=EventStatus.published,
                    visibility=EventVisibility.public,
                    cover_url=evt_data["cover"],
                    meeting_url=evt_data.get("meeting_url"),
                    venue_remark="APU Campus" if evt_data["type"] == EventType.physical else "Online",
                    max_participant=100
                )
                db.add(event)
                db.flush()
                
                # Add Category
                ec = EventCategory(event_id=event.id, category_id=evt_data["category"].id)
                db.add(ec)
                
                # Add Participants
                for (user, role, status) in evt_data["participants"]:
                    # Check existing participant
                    part = db.query(EventParticipant).filter(
                        EventParticipant.event_id == event.id,
                        EventParticipant.user_id == user.id
                    ).first()
                    
                    if not part:
                        part = EventParticipant(
                            event_id=event.id,
                            user_id=user.id,
                            role=role,
                            status=status,
                            name=user.email, # Fallback name
                            email=user.email
                        )
                        db.add(part)
                
                logger.info(f"Created event: {evt_data['title']}")
            else:
                logger.info(f"Event exists: {evt_data['title']}")

        db.commit()
        logger.info("Demo scenario seeded successfully!")

    except Exception as e:
        logger.error(f"Error seeding demo scenario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_scenario()
