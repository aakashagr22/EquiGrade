"""
Scoring algorithm service.
Combines quantity, quality, and consistency into final contribution scores.
Classifies roles: leader, contributor, passive, free_rider.
"""

from dataclasses import dataclass
from typing import Literal
from datetime import datetime, timezone
from collections import defaultdict
import statistics

RoleLabel = Literal["leader", "contributor", "passive", "free_rider"]


# ── Configurable Weights ────────────────────────────────────

WEIGHTS = {
    "quantity": 0.30,
    "quality": 0.50,
    "consistency": 0.20,
}


@dataclass
class MemberScore:
    user_id: str
    quantity_score: float       # 0–100
    quality_score: float        # 0–100
    consistency_score: float    # 0–100
    final_score: float          # 0–100
    contribution_pct: float     # 0–100 (percentage of team total)
    role_label: RoleLabel


def compute_final_score(quantity: float, quality: float, consistency: float) -> float:
    """Weighted combination of the three score dimensions."""
    return round(
        quantity * WEIGHTS["quantity"]
        + quality * WEIGHTS["quality"]
        + consistency * WEIGHTS["consistency"],
        2,
    )


def classify_role(score: float, team_avg: float) -> RoleLabel:
    """
    Classify a member's role based on their score relative to team average.
    - Leader:       ≥120% of average
    - Contributor:   ≥80% of average
    - Passive:       ≥40% of average
    - Free-rider:    <40% of average
    """
    if team_avg <= 0:
        return "contributor"
    ratio = score / team_avg
    if ratio >= 1.2:
        return "leader"
    elif ratio >= 0.8:
        return "contributor"
    elif ratio >= 0.4:
        return "passive"
    else:
        return "free_rider"


def compute_quantity_score(event_count: int, max_events: int) -> float:
    """
    Normalize event count to 0–100 relative to the most active team member.
    """
    if max_events <= 0:
        return 0.0
    return round(min(100.0, (event_count / max_events) * 100), 2)


def compute_quality_score(ai_scores: list[float]) -> float:
    """
    Average the AI quality scores for a member's contributions.
    Returns 0–100.
    """
    if not ai_scores:
        return 0.0
    return round(statistics.mean(ai_scores), 2)


def compute_consistency_score(event_dates: list[datetime], project_start: datetime, project_end: datetime) -> float:
    """
    Measure how evenly distributed a member's contributions are over the project timeline.

    Uses the coefficient of variation of gaps between contributions.
    Perfect consistency (evenly spaced) → 100.
    All contributions on one day → close to 0.
    """
    if not event_dates or len(event_dates) < 2:
        return 20.0  # Minimum score for having at least contributed

    sorted_dates = sorted(event_dates)

    # Calculate total project span in days
    total_span = max((project_end - project_start).days, 1)

    # Calculate what fraction of the project timeline has activity
    unique_days = len(set(d.date() for d in sorted_dates))
    coverage = unique_days / total_span

    # Check for last-minute cramming: if >50% of events in last 10% of timeline
    cutoff = project_start + (project_end - project_start) * 0.9
    late_events = sum(1 for d in sorted_dates if d >= cutoff)
    late_ratio = late_events / len(sorted_dates)

    # Base score from coverage
    score = coverage * 80  # max 80 from coverage

    # Bonus for steady activity (not back-loaded)
    if late_ratio < 0.3:
        score += 20
    elif late_ratio < 0.5:
        score += 10

    return round(min(100.0, max(0.0, score)), 2)


def compute_team_scores(
    member_data: dict[str, dict],
    project_start: datetime,
    project_end: datetime,
) -> list[MemberScore]:
    """
    Compute scores for all members of a team.

    member_data format:
    {
        "user_id": {
            "event_count": int,
            "ai_scores": [float, ...],
            "event_dates": [datetime, ...],
        }
    }
    """
    if not member_data:
        return []

    # Find max events for normalization
    max_events = max((d["event_count"] for d in member_data.values()), default=1)

    scores = []
    for user_id, data in member_data.items():
        qty = compute_quantity_score(data["event_count"], max_events)
        ql = compute_quality_score(data.get("ai_scores", []))
        cons = compute_consistency_score(data.get("event_dates", []), project_start, project_end)
        final = compute_final_score(qty, ql, cons)

        scores.append(MemberScore(
            user_id=user_id,
            quantity_score=qty,
            quality_score=ql,
            consistency_score=cons,
            final_score=final,
            contribution_pct=0.0,  # computed below
            role_label="contributor",  # computed below
        ))

    # Compute contribution percentages
    total_final = sum(s.final_score for s in scores)
    if total_final > 0:
        for s in scores:
            s.contribution_pct = round((s.final_score / total_final) * 100, 2)

    # Compute role labels
    avg_score = statistics.mean(s.final_score for s in scores) if scores else 0
    for s in scores:
        s.role_label = classify_role(s.final_score, avg_score)

    return scores
