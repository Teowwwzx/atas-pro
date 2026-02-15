import json
import uuid

import pytest

from app.services import profile_service
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}
        self.setex_calls: list[tuple[str, int, str]] = []
        self.delete_calls: list[str] = []
        self.raise_on_get: Exception | None = None
        self.raise_on_setex: Exception | None = None
        self.raise_on_delete: Exception | None = None

    def get(self, key: str):
        if self.raise_on_get:
            raise self.raise_on_get
        return self.store.get(key)

    def setex(self, key: str, ttl: int, value: str):
        if self.raise_on_setex:
            raise self.raise_on_setex
        self.store[key] = value
        self.setex_calls.append((key, ttl, value))

    def delete(self, key: str):
        if self.raise_on_delete:
            raise self.raise_on_delete
        self.store.pop(key, None)
        self.delete_calls.append(key)


@pytest.fixture()
def seeded_user_profile(db):
    user_id = uuid.uuid4()
    u = User(
        id=user_id,
        email=f"u_{user_id.hex[:8]}@example.com",
        password="x",
        referral_code=uuid.uuid4().hex[:8],
        status=UserStatus.active,
        is_verified=True,
    )
    db.add(u)
    p = Profile(user_id=user_id, full_name="Alice")
    db.add(p)
    db.commit()
    db.refresh(p)
    return u, p


def test_cache_hit_returns_without_db(monkeypatch, db, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    cache_key = f"profile:user:{user.id}"
    fake_redis.store[cache_key] = json.dumps({
        "id": str(profile.id),
        "user_id": str(user.id),
        "full_name": "Cached Alice",
        "bio": None,
        "title": None,
        "availability": None,
        "avatar_url": None,
        "cover_url": None,
        "linkedin_url": None,
        "github_url": None,
        "instagram_url": None,
        "twitter_url": None,
        "website_url": None,
        "can_be_speaker": False,
        "visibility": "public",
        "tags": [],
        "skills": [],
        "educations": [],
        "job_experiences": [],
        "average_rating": 0.0,
        "reviews_count": 0,
        "is_onboarded": False,
        "country": None,
        "city": None,
        "origin_country": None,
        "intents": None,
        "today_status": None,
        "email": None,
        "roles": [],
        "distance": None,
        "followers_count": 0,
        "following_count": 0,
        "sponsor_tier": None,
    })

    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    def _no_db(*args, **kwargs):
        raise AssertionError("DB should not be queried on cache hit")

    monkeypatch.setattr(profile_service.ProfileService, "get_profile_from_db", staticmethod(_no_db))

    res = profile_service.get_profile_response_cached(db, user_id=user.id)
    assert res is not None
    assert res.full_name == "Cached Alice"


def test_cache_miss_queries_db_and_sets_cache(monkeypatch, db, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    res = profile_service.get_profile_response_cached(db, user_id=user.id)
    assert res is not None
    assert res.full_name == "Alice"

    assert len(fake_redis.setex_calls) == 1
    key, ttl, value = fake_redis.setex_calls[0]
    assert key == f"profile:user:{user.id}"
    assert ttl == 300
    assert isinstance(value, str)


def test_redis_get_error_degrades_to_db(monkeypatch, db, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    fake_redis.raise_on_get = RuntimeError("redis down")
    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    res = profile_service.get_profile_response_cached(db, user_id=user.id)
    assert res is not None
    assert res.user_id == user.id


def test_invalidate_profile_cache_deletes_key(monkeypatch, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    profile_service.ProfileService.invalidate_profile_cache(user.id)
    assert fake_redis.delete_calls == [f"profile:user:{user.id}"]


def test_redis_set_error_returns_db_schema(monkeypatch, db, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    fake_redis.raise_on_setex = RuntimeError("redis write fail")
    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    res = profile_service.get_profile_response_cached(db, user_id=user.id)
    assert res is not None
    assert res.full_name == "Alice"
