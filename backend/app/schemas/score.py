"""
Pydantic schemas for scores, contributions, and AI analysis.
"""

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal, List, Any


# ── Contribution Events ─────────────────────────────────

class ContributionEventResponse(BaseModel):
    id: UUID
    integration_id: UUID
    user_id: Optional[UUID] = None
    event_type: str
    event_data: dict
    occurred_at: datetime
    fetched_at: datetime

    model_config = {"from_attributes": True}


# ── AI Analysis ─────────────────────────────────────────

class AIAnalysisResponse(BaseModel):
    id: UUID
    contribution_event_id: UUID
    model_used: str
    quality_score: Optional[float] = None
    summary: Optional[str] = None
    flags: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Scores ──────────────────────────────────────────────

class ScoreResponse(BaseModel):
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    avatar_url: Optional[str] = None
    quantity_score: float
    quality_score: float
    consistency_score: float
    final_score: float
    contribution_pct: float
    role_label: Literal["leader", "contributor", "passive", "free_rider"]
    computed_at: datetime

    model_config = {"from_attributes": True}


class TeamScoresResponse(BaseModel):
    team_id: UUID
    team_name: str
    scores: List[ScoreResponse]


# ── Flags ───────────────────────────────────────────────

class FlagItem(BaseModel):
    user_id: UUID
    user_name: Optional[str] = None
    flag_type: str   # "last_minute", "copy_paste", "trivial_commits"
    detail: str
    severity: Literal["low", "medium", "high"]
    event_ids: List[UUID] = []


class FlagsResponse(BaseModel):
    team_id: UUID
    flags: List[FlagItem]


# ── Timeline ───────────────────────────────────────────

class TimelinePoint(BaseModel):
    date: str  # ISO date string
    commits: int = 0
    doc_edits: int = 0
    pr_reviews: int = 0
    total: int = 0


class UserTimeline(BaseModel):
    user_id: UUID
    user_name: Optional[str] = None
    data: List[TimelinePoint]


# ── Dashboard ──────────────────────────────────────────

class DashboardResponse(BaseModel):
    project_id: UUID
    project_name: str
    total_teams: int
    total_members: int
    teams: List[TeamScoresResponse]
    flags_count: int
