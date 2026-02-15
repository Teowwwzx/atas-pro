import logging
import uuid
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.profile_model import Tag

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_tags():
    """
    Seeds initial tags (IT related).
    """
    db = SessionLocal()
    try:
        logger.info("Seeding tags...")

        tags = [
            "Python", "Artificial Intelligence", "Blockchain", "Machine Learning", 
            "Data Science", "Web Development", "Cybersecurity", "Cloud Computing",
            "DevOps", "Mobile Development", "Fintech", "IoT", "Big Data",
            "UI/UX Design", "Product Management"
        ]

        for tag_name in tags:
            existing = db.query(Tag).filter(Tag.name == tag_name).first()
            if not existing:
                new_tag = Tag(name=tag_name)
                db.add(new_tag)
                logger.info(f"Added tag: {tag_name}")
            else:
                logger.info(f"Tag already exists: {tag_name}")

        db.commit()
        logger.info("Tags seeded successfully.")

        # --- Assign tags to basic users ---
        logger.info("Assigning tags to basic users...")
        
        # Define assignments
        assignments = {
            "student@gmail.com": ["Python", "Artificial Intelligence", "Web Development"],
            "expert@gmail.com": ["Artificial Intelligence", "Machine Learning", "Data Science"],
            "sponsor@gmail.com": ["Fintech", "Blockchain", "Business"], # 'Business' might need to be created if not in list, using existing ones from list 
            # Re-checking tag list: Fintech, Blockchain exists. Business is NOT in tag list. replacing Business with IoT
            "admin@gmail.com": ["DevOps", "Cybersecurity", "Cloud Computing"]
        }
        
        # Update sponsor tags to match existing list
        assignments["sponsor@gmail.com"] = ["Fintech", "Blockchain", "IoT"]

        from app.models.user_model import User
        
        for email, tag_names in assignments.items():
            user = db.query(User).filter(User.email == email).first()
            if user and user.profile:
                # Fetch tag objects
                tags_to_assign = db.query(Tag).filter(Tag.name.in_(tag_names)).all()
                
                # Assign tags (replace existing)
                user.profile.tags = tags_to_assign
                logger.info(f"Assigned tags {tag_names} to {email}")
            else:
                logger.warning(f"User or profile not found for assignment: {email}")
        
        db.commit()
        logger.info("User tags assigned successfully.")

    except Exception as e:
        logger.error(f"Error seeding tags: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_tags()
