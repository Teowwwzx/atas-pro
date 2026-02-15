import logging
import uuid
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.event_model import Category

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_categories():
    """
    Seeds event categories.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding categories...")

        categories = [
            "Artificial Intelligence", "Blockchain", "Fintech", "Cloud Computing",
            "Cybersecurity", "Data Science", "Internet of Things", "Software Engineering",
            "Mobile Development", "DevOps"
        ]

        for cat_name in categories:
            existing = db.query(Category).filter(Category.name == cat_name).first()
            if not existing:
                new_category = Category(name=cat_name)
                db.add(new_category)
                logger.info(f"Added category: {cat_name}")
            else:
                logger.info(f"Category already exists: {cat_name}")

        db.commit()
        logger.info("Categories seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding categories: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_categories()
