"""
Integrations router.
Connect GitHub repos and Google Workspace documents to teams.
Includes inline sync endpoints that bypass Celery for immediate results.
"""

from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import (
    Integration, Team, SyncJob, User, OAuthAccount,
    ContributionEvent, AIAnalysis, ContributionScore, TeamMember,
)
from app.schemas.project import IntegrationCreate, IntegrationResponse
from app.middleware.auth_middleware import get_current_user, get_educator_user
from app.utils.crypto import decrypt_token
from app.services.github_service import GitHubService
from app.services.scoring_service import compute_team_scores

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
async def trigger_sync(
    integration_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Inline sync: immediately fetches data from GitHub/Google and stores
    ContributionEvent records. No Celery dependency needed.
    """
    result = await db.execute(select(Integration).where(Integration.id == integration_id))
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    # Create sync job record
    job = SyncJob(integration_id=integration_id, status="running", started_at=datetime.now(timezone.utc))
    db.add(job)
    await db.commit()
    await db.refresh(job)

    events_count = 0
    try:
        if integration.type == "github_repo":
            events_count = await _sync_github_repo(integration, user, db)
        # TODO: google_doc, google_sheet, google_slide

        job.status = "success"
        job.events_fetched = events_count
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]

    job.finished_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "message": f"Sync complete: {events_count} events fetched",
        "job_id": str(job.id),
        "status": job.status,
        "events_fetched": events_count,
    }


async def _sync_github_repo(integration: Integration, user: User, db: AsyncSession) -> int:
    """Fetch commits from a GitHub repo and store as ContributionEvents."""
    # Get user's GitHub OAuth token
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == "github",
        )
    )
    oauth = oauth_result.scalar_one_or_none()
    if not oauth or not oauth.access_token:
        raise HTTPException(status_code=400, detail="No GitHub OAuth token found. Please re-login with GitHub.")

    access_token = decrypt_token(oauth.access_token)
    github = GitHubService(access_token)
    owner, repo = GitHubService.parse_repo_url(integration.external_id)

    # Fetch commits
    commits = await github.get_commits(owner, repo, per_page=100)

    # Get team members to map GitHub users to our users
    team_members_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == integration.team_id)
    )
    team_member_ids = [tm.user_id for tm in team_members_result.scalars().all()]

    # Build a map of email -> user_id for team members
    user_email_map = {}
    for uid in team_member_ids:
        u_result = await db.execute(select(User).where(User.id == uid))
        u = u_result.scalar_one_or_none()
        if u:
            user_email_map[u.email.lower()] = u.id

    # Also map GitHub usernames via OAuthAccount
    gh_username_map = {}
    for uid in team_member_ids:
        oa_result = await db.execute(
            select(OAuthAccount).where(OAuthAccount.user_id == uid, OAuthAccount.provider == "github")
        )
        oa = oa_result.scalar_one_or_none()
        if oa:
            gh_username_map[oa.provider_user_id] = uid

    events_added = 0
    for commit in commits:
        sha = commit.get("sha", "")
        commit_data = commit.get("commit", {})
        author_info = commit.get("author") or {}
        commit_author = commit_data.get("author", {})

        # Try to map to a team member
        matched_user_id = None
        # By GitHub user id
        gh_id = str(author_info.get("id", ""))
        if gh_id in gh_username_map:
            matched_user_id = gh_username_map[gh_id]
        # By email
        if not matched_user_id:
            email = (commit_author.get("email", "") or "").lower()
            if email in user_email_map:
                matched_user_id = user_email_map[email]

        # Check if event already exists (by SHA in event_data)
        existing = await db.execute(
            select(ContributionEvent).where(
                ContributionEvent.integration_id == integration.id,
                ContributionEvent.event_type == "commit",
                ContributionEvent.event_data["sha"].astext == sha,
            )
        )
        if existing.scalar_one_or_none():
            continue

        occurred_at = commit_author.get("date")
        if occurred_at:
            try:
                occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                occurred_at = datetime.now(timezone.utc)
        else:
            occurred_at = datetime.now(timezone.utc)

        stats = commit.get("stats", {})
        event = ContributionEvent(
            integration_id=integration.id,
            user_id=matched_user_id,
            event_type="commit",
            event_data={
                "sha": sha,
                "message": commit_data.get("message", ""),
                "author_name": commit_author.get("name", ""),
                "author_email": commit_author.get("email", ""),
                "additions": stats.get("additions", 0),
                "deletions": stats.get("deletions", 0),
                "files_changed": len(commit.get("files", [])),
                "github_url": commit.get("html_url", ""),
            },
            occurred_at=occurred_at,
        )
        db.add(event)
        events_added += 1

    # Also fetch PRs
    try:
        prs = await github.get_pull_requests(owner, repo, state="all", per_page=50)
        for pr in prs:
            pr_user = pr.get("user", {})
            gh_pr_id = str(pr_user.get("id", ""))
            matched_pr_user = gh_username_map.get(gh_pr_id)

            existing_pr = await db.execute(
                select(ContributionEvent).where(
                    ContributionEvent.integration_id == integration.id,
                    ContributionEvent.event_type == "pull_request",
                    ContributionEvent.event_data["pr_number"].astext == str(pr.get("number")),
                )
            )
            if existing_pr.scalar_one_or_none():
                continue

            pr_created = pr.get("created_at", "")
            try:
                pr_date = datetime.fromisoformat(pr_created.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pr_date = datetime.now(timezone.utc)

            event = ContributionEvent(
                integration_id=integration.id,
                user_id=matched_pr_user,
                event_type="pull_request",
                event_data={
                    "pr_number": pr.get("number"),
                    "title": pr.get("title", ""),
                    "state": pr.get("state", ""),
                    "author": pr_user.get("login", ""),
                    "github_url": pr.get("html_url", ""),
                },
                occurred_at=pr_date,
            )
            db.add(event)
            events_added += 1
    except Exception:
        pass  # PR fetch is best-effort

    await db.commit()
    return events_added


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
