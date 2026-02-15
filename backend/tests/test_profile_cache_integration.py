import uuid

import pytest

from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile
from app.services import profile_service


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}
        self.setex_calls: list[tuple[str, int, str]] = []

    def get(self, key: str):
        return self.store.get(key)

    def setex(self, key: str, ttl: int, value: str):
        self.store[key] = value
        self.setex_calls.append((key, ttl, value))

    def delete(self, key: str):
        self.store.pop(key, None)


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
    p = Profile(user_id=user_id, full_name="Bob")
    db.add(p)
    db.commit()
    return u, p


def test_read_profile_uses_cache_on_second_call(monkeypatch, client, db, seeded_user_profile):
    user, profile = seeded_user_profile
    fake_redis = FakeRedis()
    monkeypatch.setattr(profile_service, "redis_client", fake_redis)

    calls = {"db": 0}
    original = profile_service.ProfileService.get_profile_from_db

    def wrapped(db_sess, user_id):
        calls["db"] += 1
        return original(db_sess, user_id)

    monkeypatch.setattr(profile_service.ProfileService, "get_profile_from_db", staticmethod(wrapped))

    r1 = client.get(f"/api/v1/profiles/{user.id}")
    assert r1.status_code == 200
    assert calls["db"] == 1
    assert len(fake_redis.setex_calls) == 1

    r2 = client.get(f"/api/v1/profiles/{user.id}")
    assert r2.status_code == 200
    assert calls["db"] == 1
