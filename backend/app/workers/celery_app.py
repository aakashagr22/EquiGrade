"""
Celery application factory.
Configures Celery with Redis broker for background task processing.
"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "equigrade",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.sync_tasks",
        "app.workers.analysis_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Beat schedule for periodic sync
    beat_schedule={
        "periodic-sync": {
            "task": "app.workers.sync_tasks.sync_all_integrations",
            "schedule": 3600.0,  # Every hour
        },
    },
)
