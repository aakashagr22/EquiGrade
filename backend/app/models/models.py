"""
SQLAlchemy ORM base and all table models for EquiGrade.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Date, Numeric,
    ForeignKey, UniqueConstraint, CheckConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return uuid.uuid4()


class Base(DeclarativeBase):
    pass


# ── Users & Auth ────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email = Column(String(320), unique=True, nullable=False, index=True)
    name = Column(String(255))
    avatar_url = Column(Text)
    role = Column(
        String(20),
        CheckConstraint("role IN ('student', 'educator', 'admin')"),
        default="student",
        nullable=False,
    )
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    team_memberships = relationship("TeamMember", back_populates="user")
    scores = relationship("ContributionScore", back_populates="user")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(
        String(20),
        CheckConstraint("provider IN ('github', 'google')"),
        nullable=False,
    )
    provider_user_id = Column(String(255), nullable=False)
    access_token = Column(Text)   # encrypted at rest
    refresh_token = Column(Text)  # encrypted at rest
    token_expiry = Column(TIMESTAMP(timezone=True))
    scope = Column(Text)

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_user"),
    )

    user = relationship("User", back_populates="oauth_accounts")


# ── Institutions ────────────────────────────────────────────────

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    members = relationship("InstitutionMember", back_populates="institution")
    projects = relationship("Project", back_populates="institution")


class InstitutionMember(Base):
    __tablename__ = "institution_members"

    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role = Column(
        String(20),
        CheckConstraint("role IN ('admin', 'educator', 'student')"),
    )

    institution = relationship("Institution", back_populates="members")
    user = relationship("User")


# ── Projects & Teams ───────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    institution = relationship("Institution", back_populates="projects")
    creator = relationship("User")
    teams = relationship("Team", back_populates="project", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)

    project = relationship("Project", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="team", cascade="all, delete-orphan")
    scores = relationship("ContributionScore", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


# ── Integrations ────────────────────────────────────────────────

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    type = Column(
        String(30),
        CheckConstraint("type IN ('github_repo', 'google_doc', 'google_sheet', 'google_slide', 'figma')"),
        nullable=False,
    )
    external_id = Column(String(500), nullable=False)  # e.g. "owner/repo" or Drive file ID
    config = Column(JSONB)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    team = relationship("Team", back_populates="integrations")
    adder = relationship("User")
    events = relationship("ContributionEvent", back_populates="integration", cascade="all, delete-orphan")
    sync_jobs = relationship("SyncJob", back_populates="integration", cascade="all, delete-orphan")


# ── Contribution Events ────────────────────────────────────────

class ContributionEvent(Base):
    __tablename__ = "contribution_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # 'commit', 'pr_review', 'doc_edit', etc.
    event_data = Column(JSONB, nullable=False)
    occurred_at = Column(TIMESTAMP(timezone=True), nullable=False)
    fetched_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_events_integration_type", "integration_id", "event_type"),
        Index("ix_events_user_occurred", "user_id", "occurred_at"),
    )

    integration = relationship("Integration", back_populates="events")
    user = relationship("User")
    ai_analysis = relationship("AIAnalysis", back_populates="event", uselist=False)


# ── AI Analyses ─────────────────────────────────────────────────

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    contribution_event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contribution_events.id"),
        nullable=False,
        unique=True,
    )
    model_used = Column(String(100), nullable=False)
    quality_score = Column(Numeric(5, 2))   # 0–100
    summary = Column(Text)
    flags = Column(JSONB)   # {"trivial": true, "copy_paste": false, ...}
    raw_response = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    event = relationship("ContributionEvent", back_populates="ai_analysis")


# ── Contribution Scores ────────────────────────────────────────

class ContributionScore(Base):
    __tablename__ = "contribution_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quantity_score = Column(Numeric(5, 2))
    quality_score = Column(Numeric(5, 2))
    consistency_score = Column(Numeric(5, 2))
    final_score = Column(Numeric(5, 2))
    contribution_pct = Column(Numeric(5, 2))  # percentage of total team contribution
    role_label = Column(
        String(20),
        CheckConstraint("role_label IN ('leader', 'contributor', 'passive', 'free_rider')"),
    )
    computed_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user_score"),
    )

    team = relationship("Team", back_populates="scores")
    user = relationship("User", back_populates="scores")


# ── Sync Jobs ──────────────────────────────────────────────────

class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.id"), nullable=False)
    status = Column(
        String(20),
        CheckConstraint("status IN ('pending', 'running', 'success', 'failed')"),
        default="pending",
    )
    started_at = Column(TIMESTAMP(timezone=True))
    finished_at = Column(TIMESTAMP(timezone=True))
    error_message = Column(Text)
    events_fetched = Column(Numeric, default=0)

    integration = relationship("Integration", back_populates="sync_jobs")
