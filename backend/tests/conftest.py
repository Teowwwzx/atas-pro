import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set env vars BEFORE importing from app
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/testdb" # Dummy for validation
os.environ["TESTING"] = "1"

from app.database.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models.user_model import User, Role, UserStatus

# Use in-memory SQLite for speed and isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}

@pytest.fixture(scope="function")
def admin_token_headers(client, db):
    # Create Admin Role
    admin_role = Role(name="admin")
    db.add(admin_role)
    db.commit()
    
    # Create Admin User
    password = "password123"
    hashed = get_password_hash(password)
    user = User(
        email="admin@test.com",
        password=hashed,
        is_verified=True,
        status=UserStatus.active,
        full_name="Test Admin"
    )
    user.roles.append(admin_role)
    db.add(user)
    db.commit()
    
    # Login
    login_data = {"username": "admin@test.com", "password": password}
    r = client.post("/api/v1/auth/login", data=login_data)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture(scope="function")
def student_token_headers(client, db):
    # Ensure role exists (check if already added by other fixture or just add safe)
    if not db.query(Role).filter_by(name="student").first():
        db.add(Role(name="student"))
        db.commit()
        
    student_role = db.query(Role).filter_by(name="student").first()

    password = "password123"
    hashed = get_password_hash(password)
    user = User(
        email="student@test.com",
        password=hashed,
        is_verified=True,
        status=UserStatus.active,
        full_name="Test Student"
    )
    user.roles.append(student_role)
    db.add(user)
    db.commit()
    
    login_data = {"username": "student@test.com", "password": password}
    r = client.post("/api/v1/auth/login", data=login_data)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}
