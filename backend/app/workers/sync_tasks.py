"""
Data sync tasks for fetching contributions from GitHub and Google Workspace.
"""

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.sync_tasks.sync_integration")
def sync_integration(integration_id: str, job_id: str):
    """
    Sync a single integration: fetch latest commits/edits and store them.

    This is a placeholder for the full implementation which would:
    1. Load the integration config from DB
    2. Decrypt the OAuth token
    3. Call GitHubService or GoogleService
    4. Store ContributionEvent records
    5. Update SyncJob status
    """
    # TODO: Implement with synchronous DB access (Celery doesn't support async natively)
    # Use sqlalchemy sync engine or run_sync pattern
    pass


@celery_app.task(name="app.workers.sync_tasks.sync_all_integrations")
def sync_all_integrations():
    """
    Periodic task: sync all active integrations.
    Dispatches individual sync_integration tasks.
    """
    # TODO: Query all integrations and dispatch individual tasks
    pass
