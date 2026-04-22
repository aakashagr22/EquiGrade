"""
Pydantic schemas for projects, teams, integrations.
"""

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, Literal, List


# ── Projects ────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    institution_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    institution_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: datetime
    team_count: int = 0

    model_config = {"from_attributes": True}


# ── Teams ───────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str


class TeamMemberAdd(BaseModel):
    user_id: UUID


class TeamMemberResponse(BaseModel):
    user_id: UUID
    name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    joined_at: datetime

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    id: UUID
    name: str
    project_id: UUID
    members: List[TeamMemberResponse] = []

    model_config = {"from_attributes": True}


# ── Integrations ────────────────────────────────────────

class IntegrationCreate(BaseModel):
    type: Literal["github_repo", "google_doc", "google_sheet", "google_slide", "figma"]
    external_id: str  # e.g. "owner/repo" or Google Drive file ID
    config: Optional[dict] = None


class IntegrationResponse(BaseModel):
    id: UUID
    team_id: UUID
    type: str
    external_id: str
    config: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}
