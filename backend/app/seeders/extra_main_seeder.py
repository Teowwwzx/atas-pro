import logging
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from app.seeders.extra_expert_seeder import seed_extra_experts
from app.seeders.extra_sponsor_seeder import seed_extra_sponsors
from app.seeders.extra_past_events_seeder import seed_extra_past_events
from app.seeders.onboarding_seeder import seed_onboarding
from app.seeders.notification_seeder import seed_notifications
from app.seeders.email_template_seeder import seed_email_templates
from app.seeders.extra_booking_seeder import seed_bookings
from app.seeders.tag_seeder import seed_tags
from app.seeders.category_seeder import seed_categories
from app.seeders.profile_details_seeder import seed_profile_details

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_extra_all():
    """
    Runs all EXTRA seeders.
    Does NOT clean the database or run basic seeders.
    Useful for appending data to an existing database.
    """
    try:
        logger.info("Starting extra database seed...")
        
        seed_extra_experts()
        seed_extra_sponsors()
        seed_extra_past_events()
        seed_onboarding()
        seed_notifications()
        seed_email_templates()
        seed_bookings()
        seed_tags()
        seed_categories()
        seed_profile_details()
        
        logger.info("Extra database seeding completed successfully.")
        
    except Exception as e:
        logger.error(f"Extra seeding failed: {e}")

if __name__ == "__main__":
    seed_extra_all()
