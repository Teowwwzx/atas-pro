import logging
import uuid
import os
import sys
import random
from faker import Faker
from sqlalchemy import select

# Add path to sys to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, Tag
from app.models.ai_model import ExpertEmbedding
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

fake = Faker()

import argparse

def seed_large_scale_experts(count=1000):
    """
    Seeds a large number of experts with random data and random embeddings.
    Skips existing emails to avoid UniqueViolation.
    """
    db = SessionLocal()
    try:
        logger.info(f"🚀 Starting large scale seed of {count} experts...")

        expert_role = db.query(Role).filter(Role.name == "expert").first()
        if not expert_role:
             logger.error("❌ Expert role not found. Run basic seeders first.")
             return

        tags = db.query(Tag).all()
        password_hash = get_password_hash("password123")
        
        seeded_new = 0
        attempts = 0
        max_attempts = count * 2 # Safety break
        
        # Pre-fetch existing emails into a set for O(1) lookup speed
        existing_emails = {row[0] for row in db.query(User.email).all()}
        logger.info(f"📊 Found {len(existing_emails)} existing users in DB.")

        while seeded_new < count and attempts < max_attempts:
            attempts += 1
            email = fake.unique.email()
            
            if email in existing_emails:
                continue # Skip if already exists
            
            user_id = uuid.uuid4()
            
            # Create User
            user = User(
                id=user_id,
                email=email,
                password=password_hash,
                is_verified=True,
                status=UserStatus.active,
                referral_code=str(uuid.uuid4())[:8]
            )
            user.roles.append(expert_role)
            db.add(user)
            
            # Create Profile
            profile = Profile(
                id=uuid.uuid4(),
                user_id=user_id,
                full_name=fake.name(),
                bio=fake.text(max_nb_chars=200),
                title=f"{fake.job()} @ {fake.company()}",
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
                visibility="public",
                availability="Flexible"
            )
            
            if tags:
                selected_tags = random.sample(tags, k=min(len(tags), random.randint(1, 3)))
                for tag in selected_tags:
                    profile.tags.append(tag)
            
            db.add(profile)
            
            # Create Fake Embedding
            fake_embedding = [random.random() for _ in range(768)]
            embedding_record = ExpertEmbedding(
                user_id=user_id,
                embedding=fake_embedding,
                source_text=f"{profile.full_name} {profile.title} {profile.bio}",
                model_name="fake-v2-seeder",
                embedding_version="0.0.1"
            )
            db.add(embedding_record)
            
            seeded_new += 1
            existing_emails.add(email) # Add to set to prevent duplicates in same run

            if seeded_new % 100 == 0:
                db.commit()
                logger.info(f"✅ Seeded {seeded_new}/{count} new experts...")

        db.commit()
        logger.info(f"🏁 Successfully seeded {seeded_new} NEW experts.")

    except Exception as e:
        logger.error(f"❌ Large scale seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed large scale experts")
    parser.add_argument("--count", type=int, default=1000, help="Number of experts to seed")
    args = parser.parse_args()
    
    seed_large_scale_experts(count=args.count)
