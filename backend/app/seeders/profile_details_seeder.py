import logging
import uuid
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.profile_model import JobExperience, Education
from app.models.organization_model import Organization

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_profile_details():
    """
    Seeds job experiences and education for basic users.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding profile details (Experience & Education)...")

        # Fetch users
        admin = db.query(User).filter(User.email == "admin@gmail.com").first()
        student = db.query(User).filter(User.email == "student@gmail.com").first()
        expert = db.query(User).filter(User.email == "expert@gmail.com").first()
        sponsor = db.query(User).filter(User.email == "sponsor@gmail.com").first()
        
        # Fetch organization (APU)
        apu = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()

        # Data Definitions
        
        # Student Education
        if student and apu:
            edu = Education(
                user_id=student.id,
                org_id=apu.id, # Linking to APU
                qualification="Bachelor's Degree",
                field_of_study="Computer Science (Artificial Intelligence)",
                school="Asia Pacific University",
                start_datetime=datetime(2023, 9, 1),
                end_datetime=datetime(2026, 7, 30),
                remark="CGPA: 3.8"
            )
            db.add(edu)
            logger.info(f"Added education for {student.email}")

        # Expert Experience & Education
        if expert:
            # Education
            db.add(Education(
                user_id=expert.id,
                qualification="PhD",
                field_of_study="Machine Learning",
                school="National University of Singapore",
                start_datetime=datetime(2015, 8, 1),
                end_datetime=datetime(2019, 5, 30)
            ))
            # Experience
            db.add(JobExperience(
                user_id=expert.id,
                title="Senior AI Researcher",
                description="Leading research in generative models.",
                start_datetime=datetime(2020, 1, 15)
                # Current job, so no end_datetime
            ))
            logger.info(f"Added details for {expert.email}")

        # Sponsor Experience
        if sponsor:
            db.add(JobExperience(
                user_id=sponsor.id,
                title="Marketing Director",
                description="Overseeing global tech partnerships.",
                start_datetime=datetime(2018, 6, 1)
            ))
            logger.info(f"Added details for {sponsor.email}")
            
        # Admin Experience (as APU Staff)
        if admin and apu:
             db.add(JobExperience(
                user_id=admin.id,
                org_id=apu.id,
                title="System Administrator",
                description="Managing university event platforms.",
                start_datetime=datetime(2022, 3, 1)
            ))
             logger.info(f"Added details for {admin.email}")

        db.commit()
        logger.info("Profile details seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding profile details: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_profile_details()
