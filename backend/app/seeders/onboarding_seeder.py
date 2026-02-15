import logging
from dotenv import load_dotenv
load_dotenv()
import random
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.encoders import jsonable_encoder
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.profile_model import Profile
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.services.ai_service import generate_text_embedding, _vec_to_pg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_onboarding():
    """
    Updates basic users with onboarding data and simulates full onboarding flow:
    - Updates Profile (bio, intents, etc.)
    - Creates UserOnboarding record (completed)
    - Generates Embeddings (for experts)
    """
    db = SessionLocal()
    try:
        logger.info("Seeding onboarding data...")

        available_avatars = [
            "/img/avatars/1.jpg",
            "/img/avatars/2.png",
            "/img/avatars/3.jpg",
            "/img/avatars/strategy.jpg",
            "/img/avatars/tim.webp"
        ]
        random.shuffle(available_avatars)

        # Define onboarding data for basic users
        onboarding_data = {
            "admin@gmail.com": {
                "bio": "System Administrator and Community Manager at APU.",
                "intents": ["hiring_talent", "looking_for_speaker"],
                "availability": "Weekdays 9am-5pm",
                "city": "Kuala Lumpur",
                "country": "Malaysia",
                "origin_country": "Malaysia",
                "average_rating": 5.0,
                "title": "Community Manager"
            },
            "student@gmail.com": {
                "bio": "Computer Science student eager to learn about AI and Fintech.",
                "intents": ["open_to_job", "looking_for_sponsor"],
                "availability": "Weekends and Evenings",
                "city": "Kuala Lumpur",
                "country": "Malaysia",
                "origin_country": "Malaysia",
                "average_rating": 0.0,
                "title": "CS Student",
                "linkedin_url": "https://linkedin.com/in/student-user",
                "github_url": "https://github.com/student-user"
            },
            "expert@gmail.com": {
                "bio": "Senior Researcher specializing in Artificial Intelligence and Machine Learning.",
                "intents": ["open_to_speak", "hiring_talent"],
                "availability": "Flexible, by appointment",
                "city": "Singapore",
                "country": "Singapore",
                "origin_country": "Singapore",
                "average_rating": 4.9,
                "can_be_speaker": True,
                "title": "Senior AI Researcher",
                "role": "expert" # Tag for embedding generation
            },
            "sponsor@gmail.com": {
                "bio": "Representing corporate interests in tech education and innovation.",
                "intents": ["hiring_talent", "open_to_sponsor"],
                "availability": "Weekdays 10am-4pm",
                "city": "Petaling Jaya",
                "country": "Malaysia",
                "origin_country": "Malaysia",
                "average_rating": 4.5,
                "title": "Corporate Relations Manager"
            }
        }

        for email, data in onboarding_data.items():
            user = db.query(User).filter(User.email == email).first()
            if user and user.profile:
                profile = user.profile
                
                # 1. Update Profile fields
                profile.bio = data.get("bio")
                profile.intents = data.get("intents")
                profile.availability = data.get("availability")
                profile.city = data.get("city")
                profile.country = data.get("country")
                profile.is_onboarded = True
                
                if "linkedin_url" in data:
                    profile.linkedin_url = data["linkedin_url"]
                if "github_url" in data:
                    profile.github_url = data["github_url"]
                if "can_be_speaker" in data:
                    profile.can_be_speaker = data["can_be_speaker"]
                if "title" in data:
                    profile.title = data["title"]
                if "origin_country" in data:
                    profile.origin_country = data["origin_country"]
                if not profile.avatar_url:
                    profile.avatar_url = random.choice(available_avatars)
                if "average_rating" in data:
                    profile.average_rating = data["average_rating"]

                logger.info(f"Updated profile data for {email}")

                # 2. Update/Create UserOnboarding Record
                user_onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user.id).first()
                if not user_onboarding:
                    user_onboarding = UserOnboarding(user_id=user.id)
                    db.add(user_onboarding)
                
                # Mark as fully completed
                user_onboarding.status = OnboardingStatus.completed
                user_onboarding.profile_completed = True
                user_onboarding.skills_added = True
                user_onboarding.interests_selected = True
                user_onboarding.experience_added = True
                user_onboarding.preferences_set = True
                user_onboarding.onboarding_data = jsonable_encoder(data)
                
                logger.info(f"Updated UserOnboarding record for {email}")

                # 3. Generate Embeddings (Only for Experts)
                if data.get("role") == "expert":
                    try:
                        src = f"{profile.full_name}\n{profile.bio or ''}\navailability:{profile.availability or ''}"
                        vec = generate_text_embedding(src)
                        if vec:
                            emb = _vec_to_pg(vec)
                            up = text(
                                """
                                INSERT INTO expert_embeddings(user_id, embedding, source_text)
                                VALUES (:uid, CAST(:emb AS vector), :src)
                                ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
                                """
                            )
                            db.execute(up, {"uid": user.id, "emb": emb, "src": src})
                            logger.info(f"Generated expert embedding for {email}")
                    except Exception as e:
                        logger.error(f"Failed to generate embedding for {email}: {e}")

            else:
                logger.warning(f"User or profile not found for {email}")

        db.commit()
        logger.info("Onboarding seeding (full flow) completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding onboarding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_onboarding()
