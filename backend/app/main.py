"""
EquiGrade FastAPI application factory.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, projects, integrations, scores, institutions

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered group project contribution evaluator",
        docs_url="/docs",
        redoc_url="/redoc",
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
    app.include_router(institutions.router, prefix="/api")
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
