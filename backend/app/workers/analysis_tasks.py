"""
AI analysis tasks for processing contributions through Gemini.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import and_, select
from app.workers.celery_app import celery_app
from app.db_sync import SyncSessionLocal
from app.models.models import (
    ContributionEvent, AIAnalysis, Team, Integration, 
    ContributionScore, TeamMember, User
)
from app.services.gemini_service import GeminiService
from app.services.scoring_service import ScoringService
import asyncio

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.analysis_tasks.analyze_team", bind=True, max_retries=2)
def analyze_team(self, team_id: str):
    """
    Analyze all unprocessed contributions for a team:
    1. Fetch unanalyzed ContributionEvents
    2. For each event, call GeminiService
    3. Store AIAnalysis results
    4. Recompute ContributionScores

    This task should be called after sync_integration completes.
    """
    session = SyncSessionLocal()
    try:
        team_uuid = UUID(team_id)
        
        # Get all integrations for this team
        integrations = session.query(Integration).filter_by(
            team_id=team_uuid
        ).all()
        
        if not integrations:
            logger.info(f"No integrations found for team {team_id}")
            return {"status": "success", "analyzed_count": 0}
        
        integration_ids = [i.id for i in integrations]
        
        # Get unanalyzed events
        unanalyzed_events = session.query(ContributionEvent).filter(
            and_(
                ContributionEvent.integration_id.in_(integration_ids),
                ~ContributionEvent.ai_analysis.any()
            )
        ).all()
        
        logger.info(f"Found {len(unanalyzed_events)} unanalyzed events for team {team_id}")
        
        analyzed_count = 0
        gemini_service = GeminiService()
        
        for event in unanalyzed_events:
            try:
                analysis_result = _analyze_single_event_sync(
                    session, event, gemini_service
                )
                
                if analysis_result:
                    analyzed_count += 1
                    
            except Exception as e:
                logger.error(f"Error analyzing event {event.id}: {str(e)}")
                continue
        
        # Recompute scores for this team
        _recompute_team_scores(session, team_uuid)
        
        logger.info(f"Analyzed {analyzed_count} events for team {team_id}")
        return {"status": "success", "analyzed_count": analyzed_count}
        
    except Exception as exc:
        logger.error(f"Error in analyze_team for {team_id}: {str(exc)}")
        # Retry with backoff
        self.retry(exc=exc, countdown=5)
        
    finally:
        session.close()


def _analyze_single_event_sync(session, event: ContributionEvent, gemini_service: GeminiService):
    """
    Synchronously analyze a single contribution event.
    We need to run async code in sync context using asyncio.run()
    """
    try:
        # Get the event data
        event_data = event.event_data or {}
        
        if event.event_type == "commit":
            # Analyze commit
            analysis = asyncio.run(gemini_service.analyze_commit(
                author=event_data.get("author", "Unknown"),
                message=event_data.get("message", ""),
                diff=event_data.get("diff", ""),
                files_changed=len(event_data.get("files", [])),
                additions=event_data.get("additions", 0),
                deletions=event_data.get("deletions", 0),
            ))
            
        elif event.event_type == "doc_edit":
            # Analyze document contribution
            analysis = asyncio.run(gemini_service.analyze_doc_contribution(
                title=event_data.get("target", {}).get("title", ""),
                author=event_data.get("actor", {}).get("displayName", "Unknown"),
                edit_count=event_data.get("edit_count", 1),
                total_revisions=event_data.get("total_revisions", 1),
                time_span=event_data.get("time_span", ""),
            ))
            
        else:
            logger.warning(f"Unknown event type: {event.event_type}")
            return None
        
        # Store analysis result
        ai_analysis = AIAnalysis(
            contribution_event_id=event.id,
            model_used=analysis.get("model_used", "gemini-1.5-flash"),
            quality_score=analysis.get("overall_score", 50.0),
            summary=analysis.get("reasoning", ""),
            flags=analysis.get("flags", {}),
            raw_response=analysis,
        )
        session.add(ai_analysis)
        session.commit()
        
        logger.info(f"Analyzed event {event.id} with score {analysis.get('overall_score')}")
        return ai_analysis
        
    except Exception as e:
        logger.error(f"Error in _analyze_single_event_sync: {str(e)}")
        return None


def _recompute_team_scores(session, team_id: UUID):
    """Recompute all contribution scores for a team."""
    try:
        team = session.query(Team).filter_by(id=team_id).first()
        if not team:
            logger.error(f"Team {team_id} not found")
            return
        
        # Get all team members
        members = session.query(TeamMember).filter_by(team_id=team_id).all()
        
        scoring_service = ScoringService()
        
        for member in members:
            # Get all contributions for this member
            events = session.query(ContributionEvent).join(
                Integration
            ).filter(
                and_(
                    Integration.team_id == team_id,
                    ContributionEvent.user_id == member.user_id
                )
            ).all()
            
            # Calculate scores
            scores = scoring_service.calculate_scores(
                events=events,
                all_events=session.query(ContributionEvent).join(
                    Integration
                ).filter(
                    Integration.team_id == team_id
                ).all()
            )
            
            # Update or create contribution score
            score_record = session.query(ContributionScore).filter(
                and_(
                    ContributionScore.team_id == team_id,
                    ContributionScore.user_id == member.user_id
                )
            ).first()
            
            if not score_record:
                score_record = ContributionScore(
                    team_id=team_id,
                    user_id=member.user_id
                )
                session.add(score_record)
            
            # Update scores
            score_record.quantity_score = scores["quantity_score"]
            score_record.quality_score = scores["quality_score"]
            score_record.consistency_score = scores["consistency_score"]
            score_record.final_score = scores["final_score"]
            score_record.contribution_pct = scores["contribution_pct"]
            score_record.role_label = scores["role_label"]
            score_record.computed_at = datetime.now(timezone.utc)
        
        session.commit()
        logger.info(f"Recomputed scores for {len(members)} members in team {team_id}")
        
    except Exception as e:
        logger.error(f"Error recomputing scores for team {team_id}: {str(e)}")


@celery_app.task(name="app.workers.analysis_tasks.analyze_single_event")
def analyze_single_event(event_id: str):
    """Analyze a single contribution event with Gemini AI."""
    session = SyncSessionLocal()
    try:
        event = session.query(ContributionEvent).filter_by(
            id=UUID(event_id)
        ).first()
        
        if not event:
            logger.error(f"Event {event_id} not found")
            return
        
        # Check if already analyzed
        existing = session.query(AIAnalysis).filter_by(
            contribution_event_id=event.id
        ).first()
        if existing:
            logger.info(f"Event {event_id} already analyzed")
            return
        
        gemini_service = GeminiService()
        _analyze_single_event_sync(session, event, gemini_service)
        
        # Find the team and recompute scores
        integration = session.query(Integration).filter_by(
            id=event.integration_id
        ).first()
        if integration:
            _recompute_team_scores(session, integration.team_id)
        
    except Exception as e:
        logger.error(f"Error analyzing event {event_id}: {str(e)}")
        
    finally:
        session.close()
