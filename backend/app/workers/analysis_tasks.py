"""
AI analysis tasks for processing contributions through Gemini.
"""

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.analysis_tasks.analyze_team")
def analyze_team(team_id: str):
    """
    Analyze all unprocessed contributions for a team:
    1. Fetch unanalyzed ContributionEvents
    2. For each event, call GeminiService
    3. Store AIAnalysis results
    4. Recompute ContributionScores

    This is a placeholder for the full implementation.
    """
    # TODO: Implement with synchronous DB access
    pass


@celery_app.task(name="app.workers.analysis_tasks.analyze_single_event")
def analyze_single_event(event_id: str):
    """Analyze a single contribution event with Gemini AI."""
    # TODO: Implement
    pass
