"""
Projects and Teams router.
CRUD for projects, teams, and team members.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Project, Team, TeamMember, User
from app.schemas.project import (
    ProjectCreate, ProjectResponse,
    TeamCreate, TeamResponse, TeamMemberAdd, TeamMemberResponse,
)
from app.middleware.auth_middleware import get_current_user, get_educator_user

router = APIRouter(tags=["Projects & Teams"])


# ── Projects ────────────────────────────────────────────────

@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List projects the current user has access to."""
    if user.role in ("educator", "admin"):
        # Educators see projects they created
        result = await db.execute(
            select(Project).where(Project.created_by == user.id).order_by(Project.created_at.desc())
        )
    else:
        # Students see projects where they're a team member
        result = await db.execute(
            select(Project)
            .join(Team, Team.project_id == Project.id)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.user_id == user.id)
            .distinct()
            .order_by(Project.created_at.desc())
        )
    projects = result.scalars().all()

    # Enrich with team count
    responses = []
    for p in projects:
        count_result = await db.execute(
            select(func.count()).select_from(Team).where(Team.project_id == p.id)
        )
        team_count = count_result.scalar() or 0
        resp = ProjectResponse.model_validate(p)
        resp.team_count = team_count
        responses.append(resp)

    return responses


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(get_educator_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project (educator/admin only)."""
    project = Project(
        name=data.name,
        description=data.description,
        institution_id=data.institution_id,
        created_by=user.id,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    resp = ProjectResponse.model_validate(project)
    resp.team_count = 0
    return resp


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    count_result = await db.execute(
        select(func.count()).select_from(Team).where(Team.project_id == project.id)
    )
    resp = ProjectResponse.model_validate(project)
    resp.team_count = count_result.scalar() or 0
    return resp


# ── Teams ───────────────────────────────────────────────────

@router.get("/projects/{project_id}/teams", response_model=list[TeamResponse])
async def list_teams(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all teams in a project."""
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.project_id == project_id)
    )
    teams = result.scalars().unique().all()

    responses = []
    for team in teams:
        members = [
            TeamMemberResponse(
                user_id=m.user_id,
                name=m.user.name if m.user else None,
                email=m.user.email if m.user else "",
                avatar_url=m.user.avatar_url if m.user else None,
                joined_at=m.joined_at,
            )
            for m in team.members
        ]
        responses.append(TeamResponse(
            id=team.id,
            name=team.name,
            project_id=team.project_id,
            members=members,
        ))
    return responses


@router.post("/projects/{project_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    project_id: UUID,
    data: TeamCreate,
    user: User = Depends(get_educator_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a team within a project (educator/admin only)."""
    # Verify project exists
    proj = await db.execute(select(Project).where(Project.id == project_id))
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    team = Team(project_id=project_id, name=data.name)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return TeamResponse(id=team.id, name=team.name, project_id=team.project_id, members=[])


@router.post("/teams/{team_id}/members", status_code=201)
async def add_team_member(
    team_id: UUID,
    data: TeamMemberAdd,
    user: User = Depends(get_educator_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to a team."""
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    if not team_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify user exists
    user_result = await db.execute(select(User).where(User.id == data.user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a team member")

    member = TeamMember(team_id=team_id, user_id=data.user_id)
    db.add(member)
    await db.commit()
    return {"message": "Member added successfully"}


@router.delete("/teams/{team_id}/members/{user_id}", status_code=204)
async def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    user: User = Depends(get_educator_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a team."""
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    await db.delete(member)
    await db.commit()
