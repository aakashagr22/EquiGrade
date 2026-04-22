"""
Synchronous SQLAlchemy engine for Celery workers.
Celery tasks are synchronous and cannot use async SQLAlchemy directly.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Convert async URL to sync URL (psycopg2 instead of asyncpg)
# e.g., "postgresql+asyncpg://..." → "postgresql+psycopg2://..."
sync_database_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")

sync_engine = create_engine(
    sync_database_url,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=5,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
)


def get_sync_db() -> Session:
    """Get a synchronous database session for Celery tasks."""
    session = SyncSessionLocal()
    try:
        return session
    finally:
        session.close()


def get_sync_db_context():
    """Context manager for synchronous database sessions."""
    session = SyncSessionLocal()
    try:
        yield session
    finally:
        session.close()
