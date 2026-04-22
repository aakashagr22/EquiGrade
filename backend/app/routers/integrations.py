"""
Integrations router.
Connect GitHub repos and Google Workspace documents to teams.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Integration, Team, SyncJob, User
from app.schemas.project import IntegrationCreate, IntegrationResponse
from app.middleware.auth_middleware import get_current_user, get_educator_user

router = APIRouter(tags=["Integrations"])


@router.get("/teams/{team_id}/integrations", response_model=list[IntegrationResponse])
async def list_integrations(team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).where(Integration.team_id == team_id))
    return [IntegrationResponse.model_validate(i) for i in result.scalars().all()]


@router.post("/teams/{team_id}/integrations", response_model=IntegrationResponse, status_code=201)
async def add_integration(team_id: UUID, data: IntegrationCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    if not team_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Team not found")
    integration = Integration(team_id=team_id, type=data.type, external_id=data.external_id, config=data.config, added_by=user.id)
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return IntegrationResponse.model_validate(integration)


@router.delete("/integrations/{integration_id}", status_code=204)
async def remove_integration(integration_id: UUID, user: User = Depends(get_educator_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).where(Integration.id == integration_id))
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    await db.delete(integration)
    await db.commit()


@router.post("/integrations/{integration_id}/sync")
async def trigger_sync(integration_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).where(Integration.id == integration_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Integration not found")
    job = SyncJob(integration_id=integration_id, status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"message": "Sync job queued", "job_id": str(job.id), "status": "pending"}


@router.get("/integrations/{integration_id}/sync-status")
async def get_sync_status(integration_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SyncJob).where(SyncJob.integration_id == integration_id).order_by(SyncJob.started_at.desc().nullsfirst()).limit(1)
    )
    job = result.scalar_one_or_none()
    if not job:
        return {"status": "never_synced"}
    return {
        "job_id": str(job.id), "status": job.status,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "events_fetched": int(job.events_fetched) if job.events_fetched else 0,
    }
