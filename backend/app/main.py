"""
EquiGrade FastAPI application factory.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine
from app.models.models import Base
from app.routers import auth, projects, integrations, scores

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered group project contribution evaluator",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth.router, prefix="/api")
    app.include_router(projects.router, prefix="/api")
    app.include_router(integrations.router, prefix="/api")
    app.include_router(scores.router, prefix="/api")

    @app.get("/")
    async def root():
        return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
