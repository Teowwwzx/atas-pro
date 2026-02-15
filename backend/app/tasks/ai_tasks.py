from app.core.celery_app import celery_app
from app.database.database import SessionLocal
from app.services.ai_service import upsert_expert_embedding
from app.models.profile_model import Profile
import uuid
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def process_expert_embedding(user_id_str: str, source_text: str = None):
    """
    Background task to generate and upsert expert embedding.
    If source_text is not provided, it fetches the profile from DB and constructs it.
    """
    logger.info(f"🚀 [Celery] Starting embedding generation for user {user_id_str}")
    db = SessionLocal()
    try:
        user_id = uuid.UUID(user_id_str)
        
        if not source_text:
            # Fetch profile to construct text
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if not profile:
                logger.warning(f"⚠️ [Celery] Profile not found for user {user_id_str}, skipping embedding.")
                return

            # Construct rich context
            skills_str = ", ".join([s.name for s in profile.skills])
            tags_str = ", ".join([t.name for t in profile.tags])
            
            source_text = f"""
            Name: {profile.full_name}
            Title: {profile.title or 'N/A'}
            Bio: {profile.bio or 'N/A'}
            Skills: {skills_str}
            Tags: {tags_str}
            Availability: {profile.availability or 'N/A'}
            """
            logger.info(f"ℹ️ [Celery] Constructed source text for user {user_id_str}")

        success = upsert_expert_embedding(db, user_id, source_text)
        if success:
            db.commit()
            logger.info(f"✅ [Celery] Successfully updated embedding for user {user_id_str}")
        else:
            logger.warning(f"⚠️ [Celery] Failed to update embedding for user {user_id_str}")
    except Exception as e:
        logger.error(f"❌ [Celery] Error processing embedding task: {e}")
    finally:
        db.close()
