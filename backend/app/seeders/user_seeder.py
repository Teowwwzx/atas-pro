import logging
import uuid
import random
from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_users():
    """
    Seeds the database with initial roles and users.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding users and roles...")

        # 1. Create Roles
        roles_data = ["admin", "student", "expert", "sponsor"]
        roles = {}
        
        for role_name in roles_data:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.flush() # Flush to get ID
                logger.info(f"Created role: {role_name}")
            roles[role_name] = role

        available_avatars = [
            "/img/avatars/1.jpg",
            "/img/avatars/2.png",
            "/img/avatars/3.jpg",
            "/img/avatars/strategy.jpg",
            "/img/avatars/tim.webp"
        ]

        # 2. Create Users
        users_config = [
            {
                "email": "admin@gmail.com",
                "password": "123123",
                "role": "admin",
                "full_name": "Admin User",
                "is_active": True
            },
            {
                "email": "student@gmail.com",
                "password": "123123",
                "role": "student",
                "full_name": "Student User",
                "is_active": True
            },
            {
                "email": "expert@gmail.com",
                "password": "123123",
                "role": "expert",
                "full_name": "Dr. Expert",
                "is_active": True,
                "title": "Senior Researcher"
            },
            {
                "email": "sponsor@gmail.com",
                "password": "123123",
                "role": "sponsor",
                "full_name": "Sponsor User",
                "is_active": True
            }
        ]

        for user_data in users_config:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                # Create User
                user = User(
                    email=user_data["email"],
                    password=get_password_hash(user_data["password"]),
                    is_verified=True,
                    status=UserStatus.active if user_data["is_active"] else UserStatus.inactive,
                    referral_code=str(uuid.uuid4())[:8] # Simple random referral code
                )
                
                # Assign Role
                role = roles.get(user_data["role"])
                if role:
                    user.roles.append(role)
                
                db.add(user)
                db.flush() # Get User ID
                
                # Create Profile
                profile = Profile(
                    user_id=user.id,
                    full_name=user_data["full_name"],
                    visibility=ProfileVisibility.public,
                    title=user_data.get("title"),
                    avatar_url=random.choice(available_avatars),
                    is_onboarded=True
                )
                db.add(profile)
                
                logger.info(f"Created user: {user_data['email']} ({user_data['role']})")
            else:
                profile = db.query(Profile).filter(Profile.user_id == user.id).first()
                if not profile:
                    profile = Profile(
                        user_id=user.id,
                        full_name=user_data["full_name"],
                        visibility=ProfileVisibility.public,
                        title=user_data.get("title"),
                        avatar_url=random.choice(available_avatars),
                        is_onboarded=True
                    )
                    db.add(profile)
                else:
                    if not profile.avatar_url:
                        profile.avatar_url = random.choice(available_avatars)
                        db.add(profile)
                logger.info(f"User already exists: {user_data['email']}")

        db.commit()
        logger.info("Users seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
