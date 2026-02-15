import logging
import uuid
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.organization_model import Organization
from app.models.follows_model import Follow

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_follows():
    """
    Seeds the database with initial follows.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding follows...")

        # 1. Find User (Student) and Org (APU)
        student_user = db.query(User).filter(User.email == "student@gmail.com").first()
        apu_org = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()

        if not student_user or not apu_org:
            logger.error("Student user or APU organization not found. Please seed users and organizations first.")
            return

        # 2. Check if Follow exists
        follow = db.query(Follow).filter(
            Follow.follower_id == student_user.id,
            Follow.org_id == apu_org.id
        ).first()

        if not follow:
            follow = Follow(
                follower_id=student_user.id,
                org_id=apu_org.id
            )
            db.add(follow)
            db.commit()
            logger.info(f"User {student_user.email} is now following APU")
        else:
            logger.info(f"User {student_user.email} is already following APU")

    except Exception as e:
        logger.error(f"Error seeding follows: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_follows()
