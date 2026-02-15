import logging
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from app.seeders.clean_db import clean_database
from app.seeders.user_seeder import seed_users
from app.seeders.org_seeder import seed_orgs
from app.seeders.event_seeder import seed_events
from app.seeders.follow_seeder import seed_follows
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

def seed_all():
    """
    Runs all basic seeders in the correct order.
    """
    try:
        logger.info("Starting full database seed...")
        
        clean_database()
        seed_users()
        seed_orgs()
        seed_categories()
        seed_events()
        seed_follows()
        # seed_extra_experts()
        # seed_extra_sponsors()
        seed_extra_past_events()
        seed_tags()
        seed_onboarding()
        seed_notifications()
        seed_email_templates()
        seed_bookings()
        seed_profile_details()
        
        logger.info("Database seeding completed successfully.")
        
    except Exception as e:
        logger.error(f"Seeding failed: {e}")

if __name__ == "__main__":
    seed_all()
