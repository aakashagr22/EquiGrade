"""
Contributions and Scores router.
Endpoints for viewing contributions, scores, timelines, and flags.
"""

from uuid import UUID
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import (
    ContributionEvent, AIAnalysis, ContributionScore,
    Team, TeamMember, Integration, Project, User,
)
from app.schemas.score import (
    ContributionEventResponse, ScoreResponse, TeamScoresResponse,
    FlagItem, FlagsResponse, TimelinePoint, UserTimeline, DashboardResponse,
)
from app.middleware.auth_middleware import get_current_user, get_educator_user
from app.services.scoring_service import compute_team_scores

router = APIRouter(tags=["Contributions & Scores"])


@router.get("/teams/{team_id}/contributions", response_model=list[ContributionEventResponse])
async def get_contributions(team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContributionEvent)
        .join(Integration, ContributionEvent.integration_id == Integration.id)
        .where(Integration.team_id == team_id)
        .order_by(ContributionEvent.occurred_at.desc())
        .limit(500)
    )
    return [ContributionEventResponse.model_validate(e) for e in result.scalars().all()]


@router.get("/teams/{team_id}/scores", response_model=list[ScoreResponse])
async def get_scores(team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContributionScore)
        .options(selectinload(ContributionScore.user))
        .where(ContributionScore.team_id == team_id)
        .order_by(ContributionScore.final_score.desc())
    )
    scores = result.scalars().all()
    return [
        ScoreResponse(
            user_id=s.user_id,
            user_name=s.user.name if s.user else None,
            user_email=s.user.email if s.user else None,
            avatar_url=s.user.avatar_url if s.user else None,
            quantity_score=float(s.quantity_score or 0),
            quality_score=float(s.quality_score or 0),
            consistency_score=float(s.consistency_score or 0),
            final_score=float(s.final_score or 0),
            contribution_pct=float(s.contribution_pct or 0),
            role_label=s.role_label or "contributor",
            computed_at=s.computed_at,
        )
        for s in scores
    ]


@router.post("/teams/{team_id}/analyze")
async def trigger_analysis(team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Inline analysis: compute scores for all team members based on their
    ContributionEvents. Uses AI analysis scores if available, otherwise
    assigns a default quality score based on event count.
    """
    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get the project for date range
    from app.models.models import Project
    proj_result = await db.execute(select(Project).where(Project.id == team.project_id))
    project = proj_result.scalar_one_or_none()

    project_start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    project_end = datetime.now(timezone.utc)
    if project:
        if project.start_date:
            project_start = datetime.combine(project.start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        if project.end_date:
            project_end = datetime.combine(project.end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

    # Get team members
    members_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id)
    )
    member_user_ids = [m.user_id for m in members_result.scalars().all()]

    if not member_user_ids:
        return {"message": "No team members found", "team_id": str(team_id)}

    # Get all contribution events for this team
    events_result = await db.execute(
        select(ContributionEvent)
        .join(Integration, ContributionEvent.integration_id == Integration.id)
        .where(Integration.team_id == team_id)
    )
    all_events = events_result.scalars().all()

    # Build member_data for scoring
    member_data: dict[str, dict] = {}
    for uid in member_user_ids:
        user_events = [e for e in all_events if e.user_id == uid]
        # Get AI scores if they exist
        ai_scores = []
        for evt in user_events:
            ai_result = await db.execute(
                select(AIAnalysis).where(AIAnalysis.contribution_event_id == evt.id)
            )
            ai = ai_result.scalar_one_or_none()
            if ai and ai.quality_score:
                ai_scores.append(float(ai.quality_score))

        # If no AI scores, assign a default based on commit quality heuristics
        if not ai_scores and user_events:
            for evt in user_events:
                # Simple heuristic: score based on event data
                data = evt.event_data or {}
                additions = data.get("additions", 0)
                deletions = data.get("deletions", 0)
                if additions + deletions > 100:
                    ai_scores.append(75.0)
                elif additions + deletions > 20:
                    ai_scores.append(60.0)
                else:
                    ai_scores.append(40.0)

        member_data[str(uid)] = {
            "event_count": len(user_events),
            "ai_scores": ai_scores,
            "event_dates": [e.occurred_at for e in user_events if e.occurred_at],
        }

    # Compute scores
    scores = compute_team_scores(member_data, project_start, project_end)

    # Persist scores (upsert)
    for s in scores:
        uid = UUID(s.user_id)
        existing = await db.execute(
            select(ContributionScore).where(
                ContributionScore.team_id == team_id,
                ContributionScore.user_id == uid,
            )
        )
        cs = existing.scalar_one_or_none()
        if cs:
            cs.quantity_score = s.quantity_score
            cs.quality_score = s.quality_score
            cs.consistency_score = s.consistency_score
            cs.final_score = s.final_score
            cs.contribution_pct = s.contribution_pct
            cs.role_label = s.role_label
            cs.computed_at = datetime.now(timezone.utc)
        else:
            cs = ContributionScore(
                team_id=team_id,
                user_id=uid,
                quantity_score=s.quantity_score,
                quality_score=s.quality_score,
                consistency_score=s.consistency_score,
                final_score=s.final_score,
                contribution_pct=s.contribution_pct,
                role_label=s.role_label,
            )
            db.add(cs)

    await db.commit()
    return {"message": f"Analysis complete: {len(scores)} members scored", "team_id": str(team_id)}



@router.get("/users/{user_id}/contribution-timeline", response_model=UserTimeline)
async def get_user_timeline(user_id: UUID, team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContributionEvent)
        .join(Integration, ContributionEvent.integration_id == Integration.id)
        .where(Integration.team_id == team_id, ContributionEvent.user_id == user_id)
        .order_by(ContributionEvent.occurred_at)
    )
    events = result.scalars().all()

    daily = defaultdict(lambda: {"commits": 0, "doc_edits": 0, "pr_reviews": 0, "total": 0})
    for e in events:
        day = e.occurred_at.strftime("%Y-%m-%d")
        daily[day]["total"] += 1
        if e.event_type == "commit":
            daily[day]["commits"] += 1
        elif e.event_type == "doc_edit":
            daily[day]["doc_edits"] += 1
        elif e.event_type == "pr_review":
            daily[day]["pr_reviews"] += 1

    target_user = await db.execute(select(User).where(User.id == user_id))
    u = target_user.scalar_one_or_none()

    return UserTimeline(
        user_id=user_id,
        user_name=u.name if u else None,
        data=[TimelinePoint(date=d, **v) for d, v in sorted(daily.items())],
    )


@router.get("/teams/{team_id}/flags", response_model=FlagsResponse)
async def get_flags(team_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIAnalysis)
        .join(ContributionEvent, AIAnalysis.contribution_event_id == ContributionEvent.id)
        .join(Integration, ContributionEvent.integration_id == Integration.id)
        .options(selectinload(AIAnalysis.event).selectinload(ContributionEvent.user))
        .where(Integration.team_id == team_id)
    )
    analyses = result.scalars().all()

    flags = []
    for a in analyses:
        if not a.flags:
            continue
        event = a.event
        for flag_type, flagged in a.flags.items():
            if flagged:
                flags.append(FlagItem(
                    user_id=event.user_id,
                    user_name=event.user.name if event.user else None,
                    flag_type=flag_type,
                    detail=a.summary or "",
                    severity="high" if flag_type == "copy_paste" else "medium",
                    event_ids=[event.id],
                ))

    return FlagsResponse(team_id=team_id, flags=flags)


@router.get("/projects/{project_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(project_id: UUID, user: User = Depends(get_educator_user), db: AsyncSession = Depends(get_db)):
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    teams_result = await db.execute(
        select(Team).options(selectinload(Team.scores).selectinload(ContributionScore.user)).where(Team.project_id == project_id)
    )
    teams = teams_result.scalars().unique().all()

    members_count = 0
    team_scores_list = []
    flags_count = 0

    for team in teams:
        members_result = await db.execute(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id))
        members_count += members_result.scalar() or 0

        scores = [
            ScoreResponse(
                user_id=s.user_id, user_name=s.user.name if s.user else None,
                user_email=s.user.email if s.user else None, avatar_url=s.user.avatar_url if s.user else None,
                quantity_score=float(s.quantity_score or 0), quality_score=float(s.quality_score or 0),
                consistency_score=float(s.consistency_score or 0), final_score=float(s.final_score or 0),
                contribution_pct=float(s.contribution_pct or 0), role_label=s.role_label or "contributor",
                computed_at=s.computed_at,
            ) for s in team.scores
        ]
        team_scores_list.append(TeamScoresResponse(team_id=team.id, team_name=team.name, scores=scores))

    return DashboardResponse(
        project_id=project.id, project_name=project.name,
        total_teams=len(teams), total_members=members_count,
        teams=team_scores_list, flags_count=flags_count,
    )
