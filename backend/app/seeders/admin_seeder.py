import logging
import uuid
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_admin():
    """
    Seeds a single admin user.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding admin user...")

        # 1. Ensure Admin Role Exists
        role_name = "admin"
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            db.flush()
            logger.info(f"Created role: {role_name}")

        # 2. Create Admin User
        admin_email = "admin@gmail.com"
        user = db.query(User).filter(User.email == admin_email).first()
        
        if not user:
            user = User(
                email=admin_email,
                password=get_password_hash("password123"),
                is_verified=True,
                status=UserStatus.active,
                referral_code=str(uuid.uuid4())[:8]
            )
            
            user.roles.append(role)
            db.add(user)
            db.flush()
            
            # Create Profile
            profile = Profile(
                user_id=user.id,
                full_name="Admin User",
                visibility=ProfileVisibility.public,
                title="System Administrator",
                is_onboarded=True
            )
            db.add(profile)
            
            logger.info(f"Created admin user: {admin_email}")
        else:
            logger.info(f"Admin user already exists: {admin_email}")

        db.commit()
        logger.info("Admin seeder completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
