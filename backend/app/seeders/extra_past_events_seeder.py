import logging
import uuid
import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# Add path to sys to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.organization_model import Organization
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, EventParticipant, EventParticipantRole, EventParticipantStatus, Category, EventCategory
from app.models.review_model import Review

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_extra_past_events():
    """
    Seeds 3 extra past events related to extra experts and sponsors.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding extra past events...")

        admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        apu_org = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()
        
        # Fetch Categories
        fintech_cat = db.query(Category).filter(Category.name == "Fintech").first()
        ai_cat = db.query(Category).filter(Category.name == "Artificial Intelligence").first()
        cyber_cat = db.query(Category).filter(Category.name == "Cybersecurity").first()

        if not admin_user or not apu_org:
             logger.error("Admin or APU Org not found. Run basic seeders first.")
             return

        # Find Extra Experts
        experts = db.query(User).filter(User.email.in_([
            "expert_fintech@gmail.com", "expert_ai@gmail.com", "expert_cyber@gmail.com"
        ])).all()
        
        # Find Extra Sponsors
        sponsors = db.query(User).filter(User.email.in_([
            "sponsor_gold@gmail.com", "sponsor_silver@gmail.com", "sponsor_bronze@gmail.com"
        ])).all()

        if not experts or not sponsors:
            logger.warning("Could not find all extra experts/sponsors. Make sure extra_expert_seeder and extra_sponsor_seeder have run.")

        now = datetime.now(timezone.utc)
        
        past_events_data = [
            {
                "title": "Fintech Revolution Summit 2024",
                "desc": "Exploring the future of finance with blockchain.",
                "days_ago": 200,
                "format": EventFormat.panel_discussion,
                "expert_email": "expert_fintech@gmail.com",
                "sponsor_email": "sponsor_gold@gmail.com",
                "cat_id": fintech_cat.id if fintech_cat else None,
                "reviewer_email": "expert_ai@gmail.com",
                "rating": 5,
                "review_comment": "Excellent insights on Fintech! The panel discussion was very engaging."
            },
            {
                "title": "AI in Healthcare Conference",
                "desc": "How AI is transforming medical diagnosis.",
                "days_ago": 150,
                "format": EventFormat.webinar,
                "expert_email": "expert_ai@gmail.com",
                "sponsor_email": "sponsor_silver@gmail.com",
                "cat_id": ai_cat.id if ai_cat else None,
                "reviewer_email": "expert_cyber@gmail.com",
                "rating": 4,
                "review_comment": "Very informative session on AI applications. Would love to see more case studies next time."
            },
            {
                "title": "Cybersecurity Bootcamp",
                "desc": "Intensive workshop for network security.",
                "days_ago": 100,
                "format": EventFormat.workshop,
                "expert_email": "expert_cyber@gmail.com",
                "sponsor_email": "sponsor_bronze@gmail.com",
                "cat_id": cyber_cat.id if cyber_cat else None,
                "reviewer_email": "expert_fintech@gmail.com",
                "rating": 5,
                "review_comment": "Best security bootcamp ever! The hands-on labs were incredibly useful."
            }
        ]

        for data in past_events_data:
            event = db.query(Event).filter(Event.title == data["title"]).first()
            if not event:
                event = Event(
                    title=data["title"],
                    description=data["desc"],
                    organizer_id=admin_user.id,
                    organization_id=apu_org.id,
                    format=data["format"],
                    type=EventType.hybrid,
                    start_datetime=now - timedelta(days=data["days_ago"]),
                    end_datetime=now - timedelta(days=data["days_ago"], hours=4),
                    registration_type=EventRegistrationType.free,
                    status=EventStatus.ended,
                    visibility=EventVisibility.public,
                    cover_url="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&auto=format&fit=crop&q=60"
                )
                db.add(event)
                db.flush() # Get ID
                
                if data["cat_id"]:
                    ec = EventCategory(event_id=event.id, category_id=data["cat_id"])
                    db.add(ec)

                logger.info(f"Created event: {data['title']}")

                # Add Expert as Speaker
                expert = next((u for u in experts if u.email == data["expert_email"]), None)
                if expert:
                    speaker = EventParticipant(
                        event_id=event.id,
                        user_id=expert.id,
                        role=EventParticipantRole.speaker,
                        status=EventParticipantStatus.accepted,
                        name=expert.full_name,
                        email=expert.email
                    )
                    db.add(speaker)
                
                # Add Sponsor
                sponsor = next((u for u in sponsors if u.email == data["sponsor_email"]), None)
                if sponsor:
                    sp_participant = EventParticipant(
                        event_id=event.id,
                        user_id=sponsor.id,
                        role=EventParticipantRole.sponsor,
                        status=EventParticipantStatus.accepted,
                        name=sponsor.full_name,
                        email=sponsor.email,
                        description="Event Partner"
                    )
                    db.add(sp_participant)

                # Add Review
                reviewer = next((u for u in experts if u.email == data["reviewer_email"]), None)
                if reviewer:
                    review = Review(
                        event_id=event.id,
                        reviewer_id=reviewer.id,
                        rating=data["rating"],
                        comment=data["review_comment"]
                    )
                    db.add(review)
                    logger.info(f"Added review for event: {data['title']}")
                
            else:
                logger.info(f"Event {data['title']} already exists.")

        db.commit()
        logger.info("Extra past events seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding extra past events: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_extra_past_events()
