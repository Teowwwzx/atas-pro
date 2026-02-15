# profile_router.py


from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
import uuid
from app.database.database import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileResponse, ProfileUpdate, OnboardingUpdate
from app.models.user_model import User, UserStatus
from app.services import profile_service, user_service
from app.dependencies import get_current_user, get_current_user_optional, require_roles
from typing import List
from fastapi import File, UploadFile
from sqlalchemy import or_, text, select, insert, update
from app.services.ai_service import generate_text_embedding, _vec_to_pg, search_similar_experts
from app.tasks.ai_tasks import process_expert_embedding
from sqlalchemy.sql import func
from app.models.profile_model import Profile, ProfileVisibility, Tag, profile_tags, Education, JobExperience
from app.schemas.profile_schema import (
    ProfileCreate, ProfileResponse, ProfileUpdate, OnboardingUpdate,
    EducationCreate, EducationResponse,
    JobExperienceCreate, JobExperienceResponse
)
from app.models.skill_model import Skill
from app.models.profile_model import profile_skills
from app.models.user_model import User as UserModel
from app.dependencies import require_roles
from app.models.notification_model import Notification, NotificationType
from app.models.user_model import Role, user_roles
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.models.review_model import Review
from app.models.follows_model import Follow
from app.models.event_model import EventParticipant, EventParticipantRole, EventParticipantStatus

from fastapi import Request
from fastapi_limiter.depends import RateLimiter

router = APIRouter()

# Simple in-memory onboarding settings. Replace with DB storage as needed.
ONBOARDING_SETTINGS: dict = {
    "enabled_fields": ["full_name", "role"],
    "required_fields": ["full_name", "role"],
}

import logging
print(f"LOADED PROFILE_ROUTER FROM: {__file__}")
logger = logging.getLogger(__name__)

from app.core.config import settings

def calculate_sponsor_tier(db: Session, user_id: uuid.UUID) -> str | None:
    count = (
        db.query(func.count(EventParticipant.id))
        .filter(
            EventParticipant.user_id == user_id,
            EventParticipant.role == EventParticipantRole.sponsor,
            EventParticipant.status == EventParticipantStatus.accepted
        )
        .scalar()
    ) or 0
    
    if count >= 10:
        return "Gold"
    elif count >= 5:
        return "Silver"
    elif count >= 1:
        return "Bronze"
    return None

import json
import hashlib
from app.core.redis import redis_client

@router.get("/discover", response_model=List[ProfileResponse])
def discover_profiles(
    name: str | None = "",
    role: str | None = None,
    skill: str | None = None,
    tag_ids: List[uuid.UUID] | None = Query(None),
    skill_ids: List[uuid.UUID] | None = Query(None),
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    # --- Cache-Aside Implementation ---
    try:
        # Construct a stable cache key based on query parameters
        params_dict = {
            "name": name,
            "role": role,
            "skill": skill,
            "tag_ids": sorted([str(uid) for uid in tag_ids]) if tag_ids else None,
            "skill_ids": sorted([str(uid) for uid in skill_ids]) if skill_ids else None,
            "page": page,
            "page_size": page_size,
            # Include user_id in cache key if personalized results depend on it (e.g. exclude self)
            "user_id": str(current_user.id) if current_user else "anon"
        }
        params_str = json.dumps(params_dict, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        cache_key = f"profiles:discover:{params_hash}"

        cached_data = redis_client.get(cache_key)
        if cached_data:
            # logger.info(f"🚀 Cache Hit for discover: {cache_key}")
            data = json.loads(cached_data)
            return [ProfileResponse(**item) for item in data]
    except Exception as e:
        logger.error(f"Redis cache read error: {e}")
    # ----------------------------------

    q = db.query(Profile)
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
    
    q = q.join(User, User.id == Profile.user_id)

    # Filter only active users
    q = q.filter(User.status == UserStatus.active)
    
    # Exclude current user if logged in
    if current_user:
        q = q.filter(Profile.user_id != current_user.id)

    # Exclude admins from public discovery
    admin_subquery = select(user_roles.c.user_id).join(Role, Role.id == user_roles.c.role_id).where(Role.name == "admin")
    q = q.filter(Profile.user_id.notin_(admin_subquery))

    if role:
        q = q.join(user_roles, user_roles.c.user_id == User.id)\
             .join(Role, Role.id == user_roles.c.role_id)\
             .filter(Role.name.ilike(f"%{role}%"))
    else:
        # Default behavior: If no role is specified, prioritize verified experts?
        # For now, let's keep it broad, but we can default to 'expert' if desired by frontend.
        # User requested: "I think default is showing expert role unless user want to search classmate"
        # However, it's safer to control this default on the Frontend to avoid confusing API behavior.
        # But, we MUST ensure we show verified users if looking for experts.
        pass

    q = q.filter(Profile.visibility == ProfileVisibility.public)
    
    # Filter by tags if needed (handled below)

    # Sort by rating (Top Voices)
    q = q.order_by(Profile.average_rating.desc().nullslast())

    if tag_ids:
        q = q.join(profile_tags, profile_tags.c.profile_id == Profile.id)
        q = q.filter(profile_tags.c.tag_id.in_(tag_ids))
        
    if skill_ids:
        q = q.join(profile_skills, profile_skills.c.profile_id == Profile.id)
        q = q.filter(profile_skills.c.skill_id.in_(skill_ids))

    if skill:
         q = q.outerjoin(profile_skills, profile_skills.c.profile_id == Profile.id)\
             .outerjoin(Skill, Skill.id == profile_skills.c.skill_id)\
             .outerjoin(profile_tags, profile_tags.c.profile_id == Profile.id)\
             .outerjoin(Tag, Tag.id == profile_tags.c.tag_id)\
             .filter(or_(Skill.name.ilike(f"%{skill}%"), Tag.name.ilike(f"%{skill}%")))
    
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    
    # Use subquery to get distinct profile IDs with ordering, then fetch full profiles
    subq = q.with_entities(Profile.id, Profile.average_rating, Profile.full_name).distinct()
    subq = subq.order_by(Profile.average_rating.desc(), Profile.full_name.asc())
    subq = subq.offset((page - 1) * page_size).limit(page_size).subquery()
    
    # Fetch full profiles based on the IDs from subquery
    items = (
        db.query(Profile)
        .filter(Profile.id.in_(db.query(subq.c.id)))
        .order_by(Profile.average_rating.desc(), Profile.full_name.asc())
        .all()
    )
    
    result: List[ProfileResponse] = []
    for p in items:
        avg = (
            db.query(func.coalesce(func.avg(Review.rating), 0.0))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0.0
        )
        cnt = (
            db.query(func.count(Review.id))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0
        )
        pr = ProfileResponse.model_validate({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "bio": p.bio,
            "title": p.title,
            "availability": p.availability,
            "avatar_url": p.avatar_url,
            "cover_url": p.cover_url,
            "linkedin_url": p.linkedin_url,
            "github_url": p.github_url,
            "instagram_url": p.instagram_url,
            "twitter_url": p.twitter_url,
            "website_url": p.website_url,
            "visibility": p.visibility,
            "tags": p.tags,
            "skills": p.skills,
            "educations": p.educations,
            "job_experiences": p.job_experiences,
            "average_rating": float(avg),
            "reviews_count": int(cnt),
            
            # Missing fields
            "country": p.country,
            "city": p.city,
            "origin_country": p.origin_country,
            "can_be_speaker": p.can_be_speaker,
            "email": p.user.email if p.user else None,
            "intents": p.intents,
            "today_status": p.today_status,
            "sponsor_tier": calculate_sponsor_tier(db, p.user_id),
        })
        result.append(pr)
    
    # --- Cache Write ---
    try:
        # cache_key is defined in the try block at the beginning of the function
        if 'cache_key' in locals() and cache_key and result:
            redis_client.setex(
                cache_key,
                300,
                json.dumps([p.model_dump(mode='json') for p in result])
            )
    except Exception as e:
        logger.error(f"Redis cache write error: {e}")
    # -------------------
    return result

@router.get("/discover/count")
def discover_profiles_count(
    name: str | None = "",
    role: str | None = None,
    skill: str | None = None,
    tag_ids: List[uuid.UUID] | None = Query(None),
    skill_ids: List[uuid.UUID] | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Profile)
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
        
    q = q.join(User, User.id == Profile.user_id)

    # Filter only active users
    q = q.filter(User.status == UserStatus.active)
    
    # Exclude admins from public discovery
    admin_subquery = select(user_roles.c.user_id).join(Role, Role.id == user_roles.c.role_id).where(Role.name == "admin")
    q = q.filter(Profile.user_id.notin_(admin_subquery))

    if role:
        q = q.join(user_roles, user_roles.c.user_id == User.id)\
             .join(Role, Role.id == user_roles.c.role_id)\
             .filter(Role.name.ilike(f"%{role}%"))
             
    q = q.filter(Profile.visibility == ProfileVisibility.public)
    
    if tag_ids:
        q = q.join(profile_tags, profile_tags.c.profile_id == Profile.id)
        q = q.filter(profile_tags.c.tag_id.in_(tag_ids))
    if skill_ids:
        q = q.join(profile_skills, profile_skills.c.profile_id == Profile.id)
        q = q.filter(profile_skills.c.skill_id.in_(skill_ids))
        
    if skill:
         q = q.outerjoin(profile_skills, profile_skills.c.profile_id == Profile.id)\
             .outerjoin(Skill, Skill.id == profile_skills.c.skill_id)\
             .outerjoin(profile_tags, profile_tags.c.profile_id == Profile.id)\
             .outerjoin(Tag, Tag.id == profile_tags.c.tag_id)\
             .filter(or_(Skill.name.ilike(f"%{skill}%"), Tag.name.ilike(f"%{skill}%")))

    # Use subquery to avoid JSON column issues with DISTINCT
    subq = q.with_entities(Profile.id).distinct().subquery()
    total = db.query(subq.c.id).count()
    return {"total_count": total}

@router.get("/semantic-search", response_model=List[ProfileResponse], dependencies=[Depends(RateLimiter(times=30, seconds=3600))])
def semantic_search_profiles(
    request: Request,
    embedding: str | None = None,
    q_text: str | None = None,
    role: str | None = None,
    top_k: int = 20,
    skip_rerank: bool = False,  # New parameter to skip LLM validation for speed
    db: Session = Depends(get_db),
):
    # --- Cache-Aside Implementation ---
    cache_key = None
    try:
        if q_text:
            params_dict = {
                "q_text": q_text,
                "role": role,
                "top_k": top_k,
                "skip_rerank": skip_rerank,
                "type": "semantic_search"
            }
            params_str = json.dumps(params_dict, sort_keys=True)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            cache_key = f"profiles:semantic:{params_hash}"

            cached_data = redis_client.get(cache_key)
            if cached_data:
                # logger.info(f"🚀 Cache Hit for semantic search: {cache_key}")
                data = json.loads(cached_data)
                return [ProfileResponse(**item) for item in data]
    except Exception as e:
        logger.error(f"Redis cache read error: {e}")
    # ----------------------------------

    print("DEBUG: semantic_search_profiles called")
    user_ids: list[uuid.UUID] = []
    import math

    dists = {} # Initialize dists
    if embedding:
        # ... existing embedding logic ...
        pass
    elif q_text:
        try:
            logger.info(f"DEBUG: Semantic search for '{q_text}'")
            
            # Use DB-side vector search via service
            # Returns list of (user_id, distance) tuples
            candidates = search_similar_experts(db, q_text, top_k=top_k)
            
            # Filter by threshold (e.g. 1.1)
            # 1.05-1.06 is typical for relevant queries
            # 1.2 is irrelevant
            threshold = 1.1
            final_candidates = [c for c in candidates if c[1] < threshold]
            
            user_ids = [c[0] for c in final_candidates]
            dists = {c[0]: c[1] for c in final_candidates}
            
            logger.info(f"DEBUG: Found {len(user_ids)} users via semantic search")
                
        except Exception as e:
            logger.error(f"DEBUG: Semantic search error: {e}")
            db.rollback()
            user_ids = []

    profiles_q = db.query(Profile)
    profiles_q = profiles_q.join(User, User.id == Profile.user_id)
    
    # Filter only active users
    profiles_q = profiles_q.filter(User.status == UserStatus.active)
    
    # profiles_q = profiles_q.join(user_roles, user_roles.c.user_id == User.id)
    # profiles_q = profiles_q.join(Role, Role.id == user_roles.c.role_id)
    
    # Dynamic Role Filter
    if role:
        profiles_q = profiles_q.join(user_roles, user_roles.c.user_id == User.id)\
                               .join(Role, Role.id == user_roles.c.role_id)\
                               .filter(Role.name.ilike(f"%{role}%"))
    
    profiles_q = profiles_q.filter(Profile.visibility == ProfileVisibility.public)
    
    if user_ids:
        # If we have vector matches, filter by them
        items = profiles_q.filter(Profile.user_id.in_(user_ids)).all()
        
        # Sort by vector similarity order
        order = {uid: idx for idx, uid in enumerate(user_ids)}
        items.sort(key=lambda p: order.get(p.user_id, 10**9))
        
        # --- SMART RERANKING: Only use LLM for time-specific queries ---
        # Detect if query mentions time/schedule
        time_keywords = ['am', 'pm', 'morning', 'afternoon', 'evening', 'night', 
                        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                        '星期', '周', '上午', '下午', '晚上', '早上', '时间']
        
        needs_reranking = False
        if q_text:
            q_lower = q_text.lower()
            needs_reranking = any(keyword in q_lower for keyword in time_keywords)
        
        # Override if skip_rerank is explicitly set
        if skip_rerank:
            needs_reranking = False
        
        logger.info(f"DEBUG: Query='{q_text}', Needs time validation={needs_reranking}")
        
        # --- LLM AGENTIC RERANKING (Reasoning Step) ---
        # This step uses Gemini to strictly validate if the profile matches the specific constraints (e.g. time, date)
        # which vector search might miss (e.g. 1pm vs 7pm).
        
        # Only rerank if we have a text query, results, and need it for time-specific queries
        if q_text and items and needs_reranking:
            import google.generativeai as genai
            import concurrent.futures
            
            api_key = settings.GEMINI_API_KEY
            if api_key:
                try:
                    genai.configure(api_key=api_key)
                    # Use 'gemini-flash-latest' as verified in tests
                    model = genai.GenerativeModel('gemini-flash-latest')
                    
                    logger.info(f"DEBUG: Starting LLM Reranking for {len(items)} candidates...")
                    
                    def validate_candidate(p):
                        """Validate a single candidate profile"""
                        try:
                            # Construct a rich context for the LLM
                            profile_context = f"""
                            Name: {p.full_name}
                            Title: {p.title}
                            Bio: {p.bio}
                            Availability: {p.availability}
                            """
                            
                            prompt = f"""
                            You are a strict search result validator for an expert marketplace.
                            
                            User Query: "{q_text}"
                            
                            Candidate Profile:
                            {profile_context}
                            
                            Task: Does this candidate REASONABLY satisfy the user's query? 
                            - If the query specifies a time (e.g. "after 7pm"), REJECT candidates who are only available at conflicting times (e.g. "1pm").
                            - If the query is broad (e.g. "Python expert"), accept relevant matches.
                            - Be strict on constraints, lenient on broad topics.
                            
                            Answer only "YES" or "NO".
                            """
                            
                            # Generate response
                            response = model.generate_content(prompt)
                            decision = response.text.strip().upper()
                            logger.info(f"DEBUG: LLM Decision for {p.full_name}: {decision}")
                            
                            if "YES" in decision:
                                return (p, True)
                            else:
                                logger.info(f"DEBUG: Filtered out {p.full_name} due to LLM decision")
                                return (p, False)
                        except Exception as e:
                            logger.error(f"DEBUG: LLM Rerank Error for {p.full_name}: {e}")
                            # Fallback: keep item if LLM fails (don't punish network errors)
                            return (p, True)
                    
                    # Use ThreadPoolExecutor for concurrent API calls
                    # Max 5 workers to avoid rate limiting
                    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                        results = list(executor.map(validate_candidate, items))
                    
                    # Filter to only validated items
                    valid_items = [p for p, is_valid in results if is_valid]
                    
                    # Update items to only include validated ones
                    items = valid_items
                    logger.info(f"DEBUG: Reranking complete. Kept {len(items)} candidates.")
                    
                except Exception as e:
                    logger.error(f"DEBUG: Global LLM Reranking Error: {e}")
            else:
                logger.warning("DEBUG: Skipping LLM Reranking (No API Key)")
        
        result: List[ProfileResponse] = []
        from app.models.review_model import Review
        for p in items[:top_k]:
            avg = (
                db.query(func.coalesce(func.avg(Review.rating), 0.0))
                .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
                .scalar()
                or 0.0
            )
            cnt = (
                db.query(func.count(Review.id))
                .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
                .scalar()
                or 0
            )
            pr = ProfileResponse.model_validate({
                "id": p.id,
                "user_id": p.user_id,
                "full_name": p.full_name,
                "bio": p.bio,
                "title": p.title,
                "availability": p.availability,
                "avatar_url": p.avatar_url,
                "cover_url": p.cover_url,
                "linkedin_url": p.linkedin_url,
                "github_url": p.github_url,
                "instagram_url": p.instagram_url,
                "twitter_url": p.twitter_url,
                "website_url": p.website_url,
                "visibility": p.visibility,
                "can_be_speaker": p.can_be_speaker,
                "tags": p.tags,
                "skills": p.skills,
                "educations": p.educations,
                "job_experiences": p.job_experiences,
                "average_rating": float(avg),
                "reviews_count": int(cnt),
                
                # Missing fields
                "country": p.country,
                "city": p.city,
                "origin_country": p.origin_country,
                "can_be_speaker": p.can_be_speaker,
                "intents": p.intents,
                "today_status": p.today_status,
                "distance": dists.get(p.user_id) if dists else None,
                "sponsor_tier": calculate_sponsor_tier(db, p.user_id),
            })
            result.append(pr)
        
        # --- Cache Write ---
        try:
            if cache_key and result:
                redis_client.setex(
                    cache_key,
                    3600,
                    json.dumps([p.model_dump(mode='json') for p in result])
                )
        except Exception as e:
            logger.error(f"Redis cache write error: {e}")
        # -------------------
        return result
    
    elif q_text:
        # Fallback to ILIKE if no embeddings found or not using embeddings
        profiles_q = profiles_q.filter(or_(
            Profile.full_name.ilike(f"%{q_text}%"),
            Profile.title.ilike(f"%{q_text}%"),
            Profile.bio.ilike(f"%{q_text}%"),
            Profile.availability.ilike(f"%{q_text}%")
        ))
    
    profiles = profiles_q.limit(top_k).all()
    result: List[ProfileResponse] = []
    from app.models.review_model import Review
    for p in profiles:
        avg = (
            db.query(func.coalesce(func.avg(Review.rating), 0.0))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0.0
        )
        cnt = (
            db.query(func.count(Review.id))
            .filter(Review.reviewee_id == p.user_id, Review.deleted_at.is_(None))
            .scalar()
            or 0
        )
        pr = ProfileResponse.model_validate({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "bio": p.bio,
            "title": p.title,
            "availability": p.availability,
            "avatar_url": p.avatar_url,
            "cover_url": p.cover_url,
            "linkedin_url": p.linkedin_url,
            "github_url": p.github_url,
            "instagram_url": p.instagram_url,
            "twitter_url": p.twitter_url,
            "website_url": p.website_url,
            "visibility": p.visibility,
            "can_be_speaker": p.can_be_speaker,
            "tags": p.tags,
            "skills": p.skills,
            "educations": p.educations,
            "job_experiences": p.job_experiences,
            "average_rating": float(avg),
            "reviews_count": int(cnt),
            
            # Missing fields
            "country": p.country,
            "city": p.city,
            "origin_country": p.origin_country,
            "can_be_speaker": p.can_be_speaker,
            "intents": p.intents,
            "today_status": p.today_status,
            "sponsor_tier": calculate_sponsor_tier(db, p.user_id),
        })
        result.append(pr)
    
    # --- Cache Write ---
    try:
        if cache_key and result:
            redis_client.setex(
                cache_key,
                3600,
                json.dumps([p.model_dump(mode='json') for p in result])
            )
    except Exception as e:
        logger.error(f"Redis cache write error: {e}")
    # -------------------
    return result

@router.get("/semantic/profiles", response_model=List[ProfileResponse])
def semantic_search_profiles_alias(
    embedding: str | None = None,
    q_text: str | None = None,
    role: str | None = None,
    top_k: int = 20,
    db: Session = Depends(get_db),
):
    return semantic_search_profiles(embedding=embedding, q_text=q_text, role=role, top_k=top_k, db=db)
    
@router.get("/find", response_model=List[ProfileResponse])
def search_profiles(
    email: str = "",
    name: str = "",
    skill: str = "",
    role: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(Profile).filter(Profile.visibility == ProfileVisibility.public)
    
    # Exclude admins
    admin_subquery = select(user_roles.c.user_id).join(Role, Role.id == user_roles.c.role_id).where(Role.name == "admin")
    q = q.filter(Profile.user_id.notin_(admin_subquery))

    if email:
        from sqlalchemy.sql import func as sa_func
        q = q.join(User, User.id == Profile.user_id).filter(sa_func.lower(User.email).like(f"%{email.lower()}%"))
    
    if name:
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))

    if skill:
        q = q.outerjoin(profile_skills, profile_skills.c.profile_id == Profile.id)\
             .outerjoin(Skill, Skill.id == profile_skills.c.skill_id)\
             .outerjoin(profile_tags, profile_tags.c.profile_id == Profile.id)\
             .outerjoin(Tag, Tag.id == profile_tags.c.tag_id)\
             .filter(or_(Skill.name.ilike(f"%{skill}%"), Tag.name.ilike(f"%{skill}%")))

    if role:
        q = q.join(user_roles, user_roles.c.user_id == User.id)\
             .join(Role, Role.id == user_roles.c.role_id)\
             .filter(Role.name.ilike(f"%{role}%"))

    # Use distinct to avoid duplicates if multiple roles match
    # Fetch IDs first to avoid complex subquery SQL generation issues
    q_ids = q.with_entities(Profile.id).distinct().limit(50)
    profile_ids = [r[0] for r in q_ids.all()]
    
    if not profile_ids:
        return []

    # Fetch full profiles
    results = db.query(Profile).filter(Profile.id.in_(profile_ids)).all()
    
    return results

@router.put("/me/onboarding", response_model=ProfileResponse)
def complete_onboarding(onboarding_data: OnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_update = ProfileUpdate(
        full_name=onboarding_data.full_name,
        bio=onboarding_data.bio,
        linkedin_url=onboarding_data.linkedin_url,
        github_url=onboarding_data.github_url,
        instagram_url=onboarding_data.instagram_url,
        twitter_url=onboarding_data.twitter_url,
        website_url=onboarding_data.website_url,
        # New Fields
        country=onboarding_data.country,
        city=onboarding_data.city,
        origin_country=onboarding_data.origin_country,
        can_be_speaker=onboarding_data.can_be_speaker,
        intents=onboarding_data.intents, 
        title=onboarding_data.specialist if onboarding_data.role in ("expert", "sponsor") else None,
        availability=onboarding_data.availability,
    )
    db_profile = profile_service.update_profile(db, user_id=current_user.id, profile=profile_update)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Set is_onboarded = True explicitly
    db_profile.is_onboarded = True
    db.add(db_profile) # Ensure marked as modified

    # --- Update UserOnboarding Table (Audit Trail) ---
    user_onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    if not user_onboarding:
        user_onboarding = UserOnboarding(user_id=current_user.id)
        db.add(user_onboarding)
    
    user_onboarding.status = OnboardingStatus.completed
    user_onboarding.profile_completed = True
    user_onboarding.completed_at = func.now()
    user_onboarding.onboarding_data = jsonable_encoder(onboarding_data)
    # -----------------------------------------------

    desired_role = onboarding_data.role

    # --- AI Embedding Logic (Merged) ---
    # Only create embeddings when the selected role is 'expert'
    if desired_role == 'expert':
        try:
            from app.services.ai_service import generate_text_embedding, _vec_to_pg
            src = f"{db_profile.full_name}\n{db_profile.bio or ''}\navailability:{db_profile.availability or ''}"
            vec = generate_text_embedding(src)
            if vec:
                emb = _vec_to_pg(vec)
                up = text(
                    """
                    INSERT INTO expert_embeddings(user_id, embedding, source_text)
                    VALUES (:uid, CAST(:emb AS vector), :src)
                    ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
                    """
                )
                db.execute(up, {"uid": current_user.id, "emb": emb, "src": src})
        except Exception as e:
            print(f"Embedding failed: {e}")
            db.rollback()
    # -----------------------------------------------

    # --- Welcome Notification ---
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification_model import NotificationType
        
        NotificationService.create_notification(
            db=db,
            recipient_id=current_user.id,
            actor_id=current_user.id, # System action essentially, or self-actor
            type=NotificationType.system,
            content=f"Welcome to ATAS! Your profile setup as {desired_role.capitalize()} is complete.",
            link_url="/profile/me"
        )
    except Exception as e:
        print(f"Notification failed: {e}")
    # ----------------------------

    if desired_role in ("expert", "sponsor"):
        pending_role = f"{desired_role}_pending"
        user_service.assign_role_to_user(db, user=current_user, role_name=pending_role)
        admin_users = (
            db.query(User)
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .filter(func.lower(Role.name) == func.lower("admin"))
            .all()
        )
        for admin in admin_users:
            db.add(Notification(
                recipient_id=admin.id,
                actor_id=current_user.id,
                type=NotificationType.system,
                content=f"{desired_role.capitalize()} verification requested by {current_user.email}",
                link_url=f"/admin/users/{current_user.id}"
            ))
        db.commit() # Commit admin notifications and role
    else:
        user_service.assign_role_to_user(db, user=current_user, role_name=desired_role)
        
        # Welcome Notification for Standard Users (automatically approved roles)
        db.add(Notification(
            recipient_id=current_user.id,
            actor_id=current_user.id, # from themselves or system? System usually, but current_user.id is fine for now or maybe NULL actor if system? Model requires actor_id? Let's check model.
            # Checking notification_model.py... Actor ID is usually mandatory foreign key. 
            # I'll use current_user.id as actor for "system" messages if no system user exists, or maybe make it nullable? 
            # Existing code uses current_user.id. I will stick to that.
            type=NotificationType.system,
            content="Welcome to ATAS! Your profile is now set up.",
            link_url="/dashboard"
        ))
        db.commit()

    # Handle Education (Student)
    if onboarding_data.education:
        # Check if education already created to avoid dupes on re-submission? 
        # For now assume clean slate or just add.
        edu = Education(**onboarding_data.education.model_dump(), user_id=current_user.id)
        # If specialist provided, map to field_of_study if not already in education object
        if onboarding_data.specialist and not edu.field_of_study:
            edu.field_of_study = onboarding_data.specialist
        db.add(edu)
        db.commit()

    # Handle Tags (Expert)
    if onboarding_data.tag_ids:
        for tid in onboarding_data.tag_ids:
            # Check existence
            exists = db.execute(profile_tags.select().where(
                profile_tags.c.profile_id == db_profile.id,
                profile_tags.c.tag_id == tid
            )).fetchone()
            if not exists:
                db.execute(profile_tags.insert().values(profile_id=db_profile.id, tag_id=tid))
        db.commit()

    db.refresh(db_profile)
    return db_profile

@router.get("/me", response_model=ProfileResponse)
def read_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile_response_cached(db, user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.email = current_user.email
    
    # Calculate counts
    followers = db.query(func.count(Follow.id)).filter(Follow.followee_id == current_user.id).scalar()
    following = db.query(func.count(Follow.id)).filter(Follow.follower_id == current_user.id).scalar()

    profile.followers_count = followers
    profile.following_count = following
    profile.sponsor_tier = calculate_sponsor_tier(db, current_user.id)

    return profile

@router.get("/{user_id}", response_model=ProfileResponse)
def read_profile(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    profile = profile_service.get_profile_response_cached(db, user_id=user_id)
    if profile is None:
        if current_user is not None and current_user.id == user_id:
            profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=user_id)
            profile = profile_service.get_profile_response_cached(db, user_id=user_id)
            if profile is None:
                raise HTTPException(status_code=500, detail="Failed to create profile")
        else:
            raise HTTPException(status_code=404, detail="Profile not found")
    # Enforce visibility for private profiles
    if profile.visibility.value == "private":
        if current_user is None or current_user.id != user_id:
            raise HTTPException(status_code=403, detail="This profile is private")

    email = db.query(User.email).filter(User.id == user_id).scalar()
    if email:
        profile.email = email
        
    # Calculate counts
    followers = db.query(func.count(Follow.id)).filter(Follow.followee_id == user_id).scalar()
    following = db.query(func.count(Follow.id)).filter(Follow.follower_id == user_id).scalar()

    profile.followers_count = followers
    profile.following_count = following
    profile.sponsor_tier = calculate_sponsor_tier(db, user_id)

    return profile

@router.post("/backfill")
def backfill_profiles(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    users = db.query(UserModel).all()
    created = 0
    for u in users:
        p = profile_service.get_profile_from_db(db, user_id=u.id)
        if p is None:
            profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=u.id)
            created += 1
    return {"created": created}

@router.get("", response_model=List[ProfileResponse])
def list_public_profiles(db: Session = Depends(get_db)):
    profiles = profile_service.list_profiles(db, visibility="public")
    return profiles

@router.put("/me", response_model=ProfileResponse)
def update_current_user_profile(
    profile: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    db_profile = profile_service.update_profile(
        db, user_id=user_id, profile=profile
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Trigger async embedding update
    try:
        process_expert_embedding.delay(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to trigger async embedding update: {e}")

    return db_profile

@router.put("/me/avatar", response_model=ProfileResponse)
def update_my_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_avatar(db, user_id=current_user.id, avatar=avatar)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile


@router.put("/me/cover_picture", response_model=ProfileResponse)
def update_my_cover_picture(
    cover_picture: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_cover_picture(
        db, user_id=current_user.id, cover_picture=cover_picture
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.post("/{user_id}", response_model=ProfileResponse)
def create_profile_for_user(user_id: uuid.UUID, body: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only create your own profile")
    existing = profile_service.get_profile_from_db(db, user_id=user_id)
    if existing is not None:
        return existing
    created = profile_service.create_profile(db, profile=body, user_id=user_id)
    return created

@router.post("/me/tags")
def attach_tag_to_my_profile(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile_from_db(db, user_id=current_user.id)
    if profile is None:
        profile = profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=current_user.id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    existing = db.execute(profile_tags.select().where(
        profile_tags.c.profile_id == profile.id,
        profile_tags.c.tag_id == tag.id,
    )).fetchone()
    if existing is None:
        db.execute(profile_tags.insert().values(profile_id=profile.id, tag_id=tag.id))
        db.commit()
    return {"detail": "ok"}

@router.delete("/me/tags/{tag_id}", status_code=204)
def detach_tag_from_my_profile(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile_from_db(db, user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.execute(profile_tags.delete().where(
        profile_tags.c.profile_id == profile.id,
        profile_tags.c.tag_id == tag_id,
    ))
    db.commit()
    return

@router.post("/me/skills")
def attach_skill_to_my_profile(skill_id: uuid.UUID, level: int = 1, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile_from_db(db, user_id=current_user.id)
    if profile is None:
        profile = profile_service.create_profile(db, profile=ProfileCreate(full_name=""), user_id=current_user.id)
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    if level < 1 or level > 5:
        raise HTTPException(status_code=400, detail="level must be between 1 and 5")
    existing = db.execute(profile_skills.select().where(
        profile_skills.c.profile_id == profile.id,
        profile_skills.c.skill_id == skill.id,
    )).fetchone()
    if existing is None:
        db.execute(profile_skills.insert().values(profile_id=profile.id, skill_id=skill.id, level=level))
    else:
        db.execute(profile_skills.update().where(
            profile_skills.c.profile_id == profile.id,
            profile_skills.c.skill_id == skill.id,
        ).values(level=level))
    db.commit()
    return {"detail": "ok"}

@router.delete("/me/skills/{skill_id}", status_code=204)
def detach_skill_from_my_profile(skill_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = profile_service.get_profile_from_db(db, user_id=current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.execute(profile_skills.delete().where(
        profile_skills.c.profile_id == profile.id,
        profile_skills.c.skill_id == skill_id,
    ))
    db.commit()
    return
@router.get("/onboarding/settings")
def get_onboarding_settings():
    return ONBOARDING_SETTINGS

@router.put("/onboarding/settings")
def update_onboarding_settings(payload: dict, current_user: User = Depends(require_roles(["admin"]))):
    allowed = {
        "full_name",
        "role",
        "bio",
        "linkedin_url",
        "github_url",
        "instagram_url",
        "twitter_url",
        "website_url",
    }
    enabled = payload.get("enabled_fields") or []
    required = payload.get("required_fields") or []
    if not isinstance(enabled, list) or not isinstance(required, list):
        raise HTTPException(status_code=400, detail="enabled_fields and required_fields must be arrays")
    if not set(enabled).issubset(allowed) or not set(required).issubset(allowed):
        raise HTTPException(status_code=400, detail="Unknown field in settings")
    ONBOARDING_SETTINGS["enabled_fields"] = list(enabled)
    ONBOARDING_SETTINGS["required_fields"] = list(required)
    return ONBOARDING_SETTINGS

# --- Education ---

@router.post("/me/educations", response_model=EducationResponse)
def add_my_education(body: EducationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Education(**body.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)

    # Trigger async embedding update
    try:
        process_expert_embedding.delay(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to trigger async embedding update: {e}")

    return item

@router.delete("/me/educations/{edu_id}", status_code=204)
def delete_my_education(edu_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Education).filter(Education.id == edu_id, Education.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Education not found")
    db.delete(item)
    db.commit()
    return

# --- Job Experience ---

from app.models.organization_model import organization_members, OrganizationRole

@router.post("/me/job_experiences", response_model=JobExperienceResponse)
def add_my_job_experience(body: JobExperienceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = JobExperience(**body.model_dump(), user_id=current_user.id)
    db.add(item)
    
    # Auto-follow logic: If org_id is present, add user as member if not already
    if body.org_id:
        existing_member = db.execute(
            select(organization_members).where(
                organization_members.c.org_id == body.org_id,
                organization_members.c.user_id == current_user.id
            )
        ).first()
        
        if not existing_member:
            db.execute(insert(organization_members).values(
                org_id=body.org_id,
                user_id=current_user.id,
                role=OrganizationRole.member
            ))

    db.commit()
    db.refresh(item)
    return item

@router.delete("/me/job_experiences/{job_id}", status_code=204)
def delete_my_job_experience(job_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(JobExperience).filter(JobExperience.id == job_id, JobExperience.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Job Experience not found")
    db.delete(item)
    db.commit()
    return
