from pathlib import Path
from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        extra="ignore",
    )

    DATABASE_URL: PostgresDsn
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    RESEND_API_KEY: str | None = None
    SENDER_EMAIL: str = "ATAS <onboarding@resend.dev>"
    
    FRONTEND_BASE_URL: str = "http://localhost:3000" # Defaults to localhost, override with env var in production
    
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None
    CLOUDINARY_CLOUD_NAME: str | None = None

    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # AI
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-latest"
    GEMINI_API_KEY: str | None = None

    # GetStream Chat
    GET_STREAM_API_KEY: str | None = None
    GET_STREAM_SECRET_KEY: str | None = None

settings = Settings()
