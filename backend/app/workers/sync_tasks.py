"""
Data sync tasks for fetching contributions from GitHub and Google Workspace.
"""

from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.db_sync import SyncSessionLocal
from app.models.models import Integration, SyncJob, ContributionEvent, User, OAuthAccount
from app.services.github_service import GitHubService
from app.services.google_service import GoogleService
from app.utils.crypto import decrypt_token

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.sync_tasks.sync_integration", bind=True, max_retries=3)
def sync_integration(self, integration_id: str, job_id: str):
    """
    Sync a single integration: fetch latest commits/edits and store them.
    
    Steps:
    1. Load the integration config from DB
    2. Decrypt the OAuth token
    3. Call GitHubService or GoogleService
    4. Store ContributionEvent records
    5. Update SyncJob status
    """
    session = SyncSessionLocal()
    try:
        # Load integration and sync job
        integration = session.query(Integration).filter_by(id=UUID(integration_id)).first()
        job = session.query(SyncJob).filter_by(id=UUID(job_id)).first()
        
        if not integration or not job:
            logger.error(f"Integration {integration_id} or Job {job_id} not found")
            return
        
        # Update job status
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        session.commit()
        
        # Get OAuth token for the user who added this integration
        user = session.query(User).filter_by(id=integration.added_by).first()
        if not user:
            raise ValueError(f"User {integration.added_by} not found")
        
        # Determine provider and fetch latest events
        if integration.type == "github_repo":
            events = _sync_github_integration(session, integration, user)
        elif integration.type in ("google_doc", "google_sheet", "google_slide"):
            events = _sync_google_integration(session, integration, user)
        else:
            logger.warning(f"Unknown integration type: {integration.type}")
            events = []
        
        # Update job with results
        job.status = "success"
        job.finished_at = datetime.now(timezone.utc)
        job.events_fetched = len(events)
        session.commit()
        
        logger.info(f"Synced {len(events)} events from integration {integration_id}")
        return {"status": "success", "event_count": len(events)}
        
    except Exception as exc:
        logger.error(f"Error syncing integration {integration_id}: {str(exc)}")
        job.status = "failed"
        job.finished_at = datetime.now(timezone.utc)
        job.error_message = str(exc)
        session.commit()
        
        # Retry with exponential backoff
        self.retry(exc=exc, countdown=2 ** self.request.retries)
        
    finally:
        session.close()


def _sync_github_integration(session, integration: Integration, user: User):
    """Sync commits and PRs from a GitHub repository."""
    try:
        # Get GitHub OAuth token
        oauth_account = session.query(OAuthAccount).filter_by(
            user_id=user.id, provider="github"
        ).first()
        if not oauth_account or not oauth_account.access_token:
            logger.error(f"No GitHub token found for user {user.id}")
            return []
        
        access_token = decrypt_token(oauth_account.access_token)
        github_service = GitHubService(access_token=access_token)
        
        # Parse repo owner/name from external_id
        repo = integration.external_id  # e.g., "user/repo"
        
        # Get last sync time from most recent event
        last_event = session.query(ContributionEvent).filter_by(
            integration_id=integration.id
        ).order_by(ContributionEvent.occurred_at.desc()).first()
        
        since_timestamp = (
            last_event.occurred_at.isoformat() 
            if last_event 
            else None
        )
        
        # Fetch commits
        commits = github_service.get_commits(repo, since=since_timestamp)
        events = []
        
        for commit in commits:
            # Find user who made this commit
            commit_author = commit.get("author", {})
            author_name = commit_author.get("name")
            author_email = commit_author.get("email")
            
            # Try to match to a team member (by email or name)
            team_members = session.query(User).join(
                session.query(ContributionEvent).filter_by(
                    integration_id=integration.id
                ).with_entities(ContributionEvent.user_id)
            )
            
            matched_user = None
            for member in session.query(User).all():
                if member.email == author_email:
                    matched_user = member
                    break
            
            # Create contribution event
            event = ContributionEvent(
                integration_id=integration.id,
                user_id=matched_user.id if matched_user else None,
                event_type="commit",
                event_data={
                    "commit_hash": commit["sha"],
                    "message": commit["commit"]["message"],
                    "author": author_name,
                    "url": commit["html_url"],
                    "files_changed": commit["files"],
                    "additions": commit["stats"]["additions"],
                    "deletions": commit["stats"]["deletions"],
                },
                occurred_at=datetime.fromisoformat(
                    commit["commit"]["author"]["date"].replace("Z", "+00:00")
                ),
            )
            session.add(event)
            events.append(event)
        
        session.commit()
        return events
        
    except Exception as e:
        logger.error(f"Error syncing GitHub: {str(e)}")
        return []


def _sync_google_integration(session, integration: Integration, user: User):
    """Sync edits from a Google Workspace document."""
    try:
        # Get Google OAuth token
        oauth_account = session.query(OAuthAccount).filter_by(
            user_id=user.id, provider="google"
        ).first()
        if not oauth_account or not oauth_account.access_token:
            logger.error(f"No Google token found for user {user.id}")
            return []
        
        access_token = decrypt_token(oauth_account.access_token)
        google_service = GoogleService(access_token=access_token)
        
        # Get document activity (edit history)
        file_id = integration.external_id
        activity = google_service.get_doc_activity(file_id)
        
        events = []
        for edit in activity:
            event = ContributionEvent(
                integration_id=integration.id,
                user_id=None,  # Will be matched by email
                event_type="doc_edit",
                event_data={
                    "actor": edit.get("actor"),
                    "target": edit.get("target"),
                    "time": edit.get("time"),
                    "detail": edit.get("detail"),
                },
                occurred_at=datetime.fromisoformat(
                    edit["time"].replace("Z", "+00:00")
                ),
            )
            session.add(event)
            events.append(event)
        
        session.commit()
        return events
        
    except Exception as e:
        logger.error(f"Error syncing Google: {str(e)}")
        return []


@celery_app.task(name="app.workers.sync_tasks.sync_all_integrations")
def sync_all_integrations():
    """
    Periodic task: sync all active integrations.
    Dispatches individual sync_integration tasks for each integration.
    """
    session = SyncSessionLocal()
    try:
        integrations = session.query(Integration).all()
        
        for integration in integrations:
            # Create or get pending sync job
            job = session.query(SyncJob).filter_by(
                integration_id=integration.id,
                status="pending"
            ).first()
            
            if not job:
                job = SyncJob(integration_id=integration.id, status="pending")
                session.add(job)
                session.commit()
            
            # Dispatch sync task
            sync_integration.delay(str(integration.id), str(job.id))
        
        logger.info(f"Dispatched sync tasks for {len(integrations)} integrations")
        return {"status": "success", "integration_count": len(integrations)}
        
    except Exception as e:
        logger.error(f"Error in sync_all_integrations: {str(e)}")
        return {"status": "error", "error": str(e)}
        
    finally:
        session.close()
