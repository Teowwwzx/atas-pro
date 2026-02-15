import logging
import uuid
import os
import sys
import random
from datetime import datetime, timedelta, timezone

# Add path to sys to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import Organization
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventStatus, EventVisibility, EventParticipant, EventParticipantRole, EventParticipantStatus
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_extra_sponsors():
    """
    Seeds 3 extra sponsors and related past events with sponsorship tiers.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding extra sponsors...")

        sponsor_role = db.query(Role).filter(Role.name == "sponsor").first()
        admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        apu_org = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()

        if not sponsor_role or not admin_user or not apu_org:
            logger.error("Dependencies missing (Role, Admin, or Org). Run basic seeders first.")
            return

        # Available sponsor promo images in frontend/public/img/sponsor
        available_sponsor_images = [
            "/img/sponsor/aha-kopi-sponsor.jpg",
            "/img/sponsor/cover.jpg",
            "/img/sponsor/logo.jpg"
        ]
        
        # Shuffle for random assignment
        random.shuffle(available_sponsor_images)

        sponsors_config = [
            {"email": "sponsor_gold@gmail.com", "name": "TechGiant Corp", "tier": "Gold Sponsor", "promo_image": available_sponsor_images[0], "promo_link": "https://techgiant.com"},
            {"email": "sponsor_silver@gmail.com", "name": "Innovate Ltd", "tier": "Silver Sponsor", "promo_image": available_sponsor_images[1], "promo_link": "https://innovate.io"},
            {"email": "sponsor_bronze@gmail.com", "name": "Community Inc", "tier": "Bronze Sponsor", "promo_image": available_sponsor_images[2], "promo_link": "https://community.org"}
        ]

        created_sponsors = []

        # 1. Create Sponsors
        for data in sponsors_config:
            user = db.query(User).filter(User.email == data["email"]).first()
            if not user:
                user = User(
                    email=data["email"],
                    password=get_password_hash("password123"),
                    is_verified=True,
                    status=UserStatus.active,
                    referral_code=str(uuid.uuid4())[:8]
                )
                user.roles.append(sponsor_role)
                db.add(user)
                db.flush()
                
                profile = Profile(
                    user_id=user.id,
                    full_name=data["name"],
                    visibility=ProfileVisibility.public,
                    is_onboarded=True,
                    bio=f"Proud {data['tier']} supporting local tech events."
                )
                db.add(profile)
                db.commit() # Commit to get ID for next steps
                logger.info(f"Created sponsor {data['name']}")
                created_sponsors.append({"user": user, "tier": data["tier"]})
            else:
                logger.info(f"Sponsor {data['email']} already exists.")
                created_sponsors.append({"user": user, "tier": data["tier"]})

        # 2. Create Related Past Event
        # We create one major past event and add all sponsors with their tiers
        now = datetime.now(timezone.utc)
        past_event = db.query(Event).filter(Event.title == "Past Tech Summit 2025").first()
        
        if not past_event:
            past_event = Event(
                title="Past Tech Summit 2025",
                description="A major gathering of tech enthusiasts from last year.",
                organizer_id=admin_user.id,
                organization_id=apu_org.id,
                format=EventFormat.seminar,
                type=EventType.physical,
                start_datetime=now - timedelta(days=365), # 1 year ago
                end_datetime=now - timedelta(days=365, hours=8),
                registration_type=EventRegistrationType.free,
                status=EventStatus.ended,
                visibility=EventVisibility.public,
                cover_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            )
            db.add(past_event)
            db.flush()
            logger.info("Created past event: Past Tech Summit 2025")
        
        # 3. Add Sponsors to Event
        for idx, sponsor_info in enumerate(created_sponsors):
            sp_user = sponsor_info["user"]
            tier = sponsor_info["tier"]
            sponsor_config = sponsors_config[idx]
            
            # Check if participant
            participant = db.query(EventParticipant).filter(
                EventParticipant.event_id == past_event.id,
                EventParticipant.user_id == sp_user.id
            ).first()
            
            if not participant:
                participant = EventParticipant(
                    event_id=past_event.id,
                    user_id=sp_user.id,
                    role=EventParticipantRole.sponsor,
                    status=EventParticipantStatus.accepted,
                    description=tier, # Storing tier in description
                    email=sp_user.email,
                    name=sp_user.full_name or sp_user.email,
                    promo_image_url=sponsor_config["promo_image"],  # Add promo image
                    promo_link=sponsor_config["promo_link"]  # Add promo link
                )
                db.add(participant)
                logger.info(f"Added {sp_user.email} as {tier} with promo image to event.")
            else:
                # Update existing participant with promo images
                participant.promo_image_url = sponsor_config["promo_image"]
                participant.promo_link = sponsor_config["promo_link"]
                db.add(participant)
                logger.info(f"Updated {sp_user.email} with new promo image.")

        db.commit()
        logger.info("Extra sponsors seeds completed.")

    except Exception as e:
        logger.error(f"Error seeding extra sponsors: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_extra_sponsors()
