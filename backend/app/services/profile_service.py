from sqlalchemy.orm import Session
from fastapi import UploadFile
import uuid
import json
import logging
from app.models.profile_model import Profile, ProfileVisibility
from app.schemas.profile_schema import ProfileResponse, ProfileCreate, ProfileUpdate
from app.core.redis import redis_client
from app.services import cloudinary_service

logger = logging.getLogger(__name__)

class ProfileService:

    @staticmethod
    def get_profile_from_db(db: Session, user_id: uuid.UUID) -> Profile | None:
        """ 直接查库，用于 Update 等内部逻辑，返回 ORM 对象 """
        return db.query(Profile).filter(Profile.user_id == user_id).first()

    @staticmethod
    def invalidate_profile_cache(user_id: uuid.UUID):
        """ 缓存失效策略：直接删除 Key """
        cache_key = f"profile:user:{user_id}"
        try:
            redis_client.delete(cache_key)
            logger.info(f"🗑️ Invalidated cache for user: {user_id}")
        except Exception as e:
            logger.error(f"Failed to invalidate cache: {e}")

    @staticmethod
    def get_profile_response_cached(db: Session, user_id: uuid.UUID) -> ProfileResponse | None:
        """ 
        核心读取逻辑：Cache-Aside Pattern 
        Returns: Pydantic Schema (ProfileResponse) 
        """
        cache_key = f"profile:user:{user_id}"

        # 1. Try Redis
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"🚀 Redis Cache Hit for User: {user_id}")
                # 反序列化: JSON String -> Dict -> Pydantic Schema
                profile_dict = json.loads(cached_data) 
                return ProfileResponse(**profile_dict) # 转换回对象返回
        except Exception as e:
            # 容错降级：Redis 挂了不影响主流程
            logger.error(f"Redis error: {e}")

        # 2. Fallback to DB
        logger.info(f"🐢 Cache Miss. Querying DB for User: {user_id}")
        profile = ProfileService.get_profile_from_db(db, user_id)
        
        if not profile:
            return None

        # 3. Write back to Redis
        # 注意：这里需要把 ORM 对象转为 Pydantic 才能序列化
        try:
            profile_schema = ProfileResponse.model_validate(profile)
            redis_client.setex(
                cache_key,
                300, # TTL 5 分钟 (对于 follower count 来说，这个延迟是可以接受的)
                profile_schema.model_dump_json() # 转成 JSON 字符串
            )
        except Exception as e:
            logger.error(f"Failed to set cache: {e}")
            #如果 Redis 存失败了，至少把刚才从 DB 拿到的数据返回去
            return ProfileResponse.model_validate(profile)
        # 这里返回转换好的 Schema，方便 Router 直接使用
        return profile_schema

    @staticmethod
    def create_profile(db: Session, profile: ProfileCreate, user_id: uuid.UUID) -> ProfileResponse:
        # 创建时通常不需要查缓存，但为了保险可以清理一下
        db_profile = Profile(**profile.model_dump(), user_id=user_id)
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        # 理论上新建的 Profile 之前缓存里肯定没有，但Invalidate一下是好习惯
        ProfileService.invalidate_profile_cache(user_id)
        return ProfileResponse.model_validate(db_profile)

    @staticmethod
    def update_profile(
        db: Session,
        user_id: uuid.UUID,
        profile: ProfileUpdate,
        avatar: UploadFile | None = None,
        cover_picture: UploadFile | None = None,
    ) -> ProfileResponse | None:

        db_profile = ProfileService.get_profile_from_db(db, user_id)
        if not db_profile:
            return None

        update_data = profile.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            setattr(db_profile, key, value)

        if avatar:
            avatar_url = cloudinary_service.upload_file(avatar, "avatars")
            db_profile.avatar_url = avatar_url

        if cover_picture:
            cover_url = cloudinary_service.upload_file(cover_picture, "covers")
            db_profile.cover_url = cover_url

        db.commit()
        db.refresh(db_profile)

        # 关键：修改后必须删除缓存
        ProfileService.invalidate_profile_cache(user_id)

        # 统一返回 Schema
        return ProfileResponse.model_validate(db_profile)

    @staticmethod
    def list_profiles(db: Session, visibility: str | None = None):
        query = db.query(Profile)
        if visibility is not None:
            try:
                vis_enum = ProfileVisibility(visibility)
                query = query.filter(Profile.visibility == vis_enum)
            except ValueError:
                return []
        return query.all()

    @staticmethod
    def update_avatar(db: Session, user_id: uuid.UUID, avatar: UploadFile) -> ProfileResponse | None:
        db_profile = ProfileService.get_profile_from_db(db, user_id)
        if not db_profile:
            return None
        avatar_url = cloudinary_service.upload_file(avatar, "avatars")
        db_profile.avatar_url = avatar_url
        db.commit()
        db.refresh(db_profile)

        ProfileService.invalidate_profile_cache(user_id)
        
        # 统一返回 Schema
        return ProfileResponse.model_validate(db_profile)

    @staticmethod
    def update_cover_picture(db: Session, user_id: uuid.UUID, cover_picture: UploadFile):
        db_profile = ProfileService.get_profile_from_db(db, user_id)
        if not db_profile:
            return None
        cover_url = cloudinary_service.upload_file(cover_picture, "covers")
        db_profile.cover_url = cover_url
        db.commit()
        db.refresh(db_profile)
        
        ProfileService.invalidate_profile_cache(user_id)
        # 统一返回 Schema
        return ProfileResponse.model_validate(db_profile)


def get_profile_from_db(db: Session, user_id: uuid.UUID):
    return ProfileService.get_profile_from_db(db, user_id)


def get_profile_response_cached(db: Session, user_id: uuid.UUID):
    return ProfileService.get_profile_response_cached(db, user_id)


def create_profile(db: Session, profile: ProfileCreate, user_id: uuid.UUID):
    return ProfileService.create_profile(db, profile, user_id)


def update_profile(
    db: Session,
    user_id: uuid.UUID,
    profile: ProfileUpdate,
    avatar: UploadFile | None = None,
    cover_picture: UploadFile | None = None,
):
    return ProfileService.update_profile(
        db,
        user_id=user_id,
        profile=profile,
        avatar=avatar,
        cover_picture=cover_picture,
    )
