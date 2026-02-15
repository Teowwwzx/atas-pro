import logging
import uuid
import os
import sys
import random

# Add path to sys to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User, Role, UserStatus
from app.models.profile_model import Profile, ProfileVisibility, Tag
from app.models.review_model import Review
from app.core.security import get_password_hash
from app.services.ai_service import upsert_expert_embedding

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_extra_experts():
    """
    Seeds 3 extra experts with tags, embeddings, and reviews.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding extra experts...")

        expert_role = db.query(Role).filter(Role.name == "expert").first()
        student_user = db.query(User).filter(User.email == "student@gmail.com").first() # Reviewer
        
        if not expert_role:
             logger.error("Expert role not found. Run basic seeders first.")
             return

        # Available avatars in frontend/public/img/avatars
        available_avatars = [
            "/img/avatars/1.jpg",
            "/img/avatars/2.png", 
            "/img/avatars/3.jpg",
            "/img/avatars/strategy.jpg",
            "/img/avatars/tim.webp"
        ]
        
        # Randomly shuffle avatars for variety
        random.shuffle(available_avatars)

        experts_data = [
            {
                "email": "expert_fintech@gmail.com",
                "name": "Sarah Fintech",
                "title": "Fintech Innovation Lead",
                "bio": "Expert in Blockchain, DeFi, and Financial Technology with 10 years experience.",
                "tags": ["Fintech", "Blockchain", "DeFi"],
                "review": "Sarah provided excellent insights on DeFi protocols.",
                "avatar_url": available_avatars[0],  # Random avatar
                "availability": "Weekdays 9am-6pm, flexible hours"
            },
            {
                "email": "expert_ai@gmail.com",
                "name": "Dr. Alan AI",
                "title": "Chief AI Scientist",
                "bio": "Specializing in NLP, LLMs, and Generative AI applications for business.",
                "tags": ["Artificial Intelligence", "NLP", "Machine Learning"],
                "review": "Alan's workshop on LLMs was mind-blowing!",
                "avatar_url": available_avatars[1],  # Random avatar
                "availability": "Weekends and evenings"
            },
            {
                "email": "expert_cyber@gmail.com",
                "name": "Emily Secure",
                "title": "Head of Security",
                "bio": "Expert in penetration testing and network security.",
                "tags": ["Cybersecurity", "Network Security", "Ethical Hacking"],
                "review": "Emily helped us secure our infrastructure.",
                "avatar_url": available_avatars[2],  # Random avatar
                "availability": "Monday to Friday, 10am-5pm"
            }
        ]

        for data in experts_data:
            user = db.query(User).filter(User.email == data["email"]).first()
            if not user:
                user = User(
                    email=data["email"],
                    password=get_password_hash("password123"),
                    is_verified=True,
                    status=UserStatus.active,
                    referral_code=str(uuid.uuid4())[:8]
                )
                user.roles.append(expert_role)
                db.add(user)
                db.flush() # Get ID
                
                # Check/Create Tags
                profile_tags = []
                for tag_name in data["tags"]:
                    tag = db.query(Tag).filter(Tag.name == tag_name).first()
                    if not tag:
                        tag = Tag(name=tag_name)
                        db.add(tag)
                        db.flush()
                    profile_tags.append(tag)
                
                # Create Profile
                profile = Profile(
                    user_id=user.id,
                    full_name=data["name"],
                    title=data["title"],
                    bio=data["bio"],
                    avatar_url=data.get("avatar_url"),
                    availability=data.get("availability"),
                    visibility=ProfileVisibility.public,
                    is_onboarded=True
                )
                db.add(profile)
                db.flush()

                # Link Tags
                profile.tags.extend(profile_tags)
                
                # Create Review
                if student_user:
                    review = Review(
                        reviewer_id=student_user.id,
                        reviewee_id=user.id,
                        rating=5,
                        comment=data["review"]
                    )
                    db.add(review)

                db.commit() # Commit to save all relation changes

                # Generate/Upsert Embedding (After commit so relations exist if needed, but we pass source_text manually)
                source_text = f"{data['name']} {data['title']} {data['bio']} {' '.join(data['tags'])}"
                upsert_expert_embedding(db, user.id, source_text)
                
                logger.info(f"Created expert {data['name']} with tags and embedding.")
            else:
                profile = db.query(Profile).filter(Profile.user_id == user.id).first()
                if not profile:
                    profile_tags = []
                    for tag_name in data["tags"]:
                        tag = db.query(Tag).filter(Tag.name == tag_name).first()
                        if not tag:
                            tag = Tag(name=tag_name)
                            db.add(tag)
                            db.flush()
                        profile_tags.append(tag)
                    profile = Profile(
                        user_id=user.id,
                        full_name=data["name"],
                        title=data["title"],
                        bio=data["bio"],
                        avatar_url=data.get("avatar_url"),
                        availability=data.get("availability"),
                        visibility=ProfileVisibility.public,
                        is_onboarded=True
                    )
                    db.add(profile)
                    db.flush()
                    profile.tags.extend(profile_tags)
                else:
                    updated = False
                    if not profile.avatar_url and data.get("avatar_url"):
                        profile.avatar_url = data["avatar_url"]
                        updated = True
                    if not profile.full_name and data.get("name"):
                        profile.full_name = data["name"]
                        updated = True
                    if not profile.title and data.get("title"):
                        profile.title = data["title"]
                        updated = True
                    if not profile.bio and data.get("bio"):
                        profile.bio = data["bio"]
                        updated = True
                    if not profile.availability and data.get("availability"):
                        profile.availability = data["availability"]
                        updated = True
                    if updated:
                        db.add(profile)
                existing_review = None
                if student_user:
                    existing_review = db.query(Review).filter(
                        Review.reviewer_id == student_user.id,
                        Review.reviewee_id == user.id
                    ).first()
                if student_user and not existing_review:
                    review = Review(
                        reviewer_id=student_user.id,
                        reviewee_id=user.id,
                        rating=5,
                        comment=data["review"]
                    )
                    db.add(review)
                db.commit()
                source_text = f"{data['name']} {data['title']} {data['bio']} {' '.join(data['tags'])}"
                upsert_expert_embedding(db, user.id, source_text)
                logger.info(f"Updated expert {data['email']} profile and embedding.")

        logger.info("Extra experts seeded successfully.")

    except Exception as e:
        logger.error(f"Error seeding extra experts: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_extra_experts()
