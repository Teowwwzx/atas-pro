import os

from celery import Celery


celery_app = Celery(
    "atas",
    broker=os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL") or "redis://redis:6379/0",
    backend=os.getenv("CELERY_RESULT_BACKEND") or "redis://redis:6379/1",
    include=["app.tasks.ai_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

