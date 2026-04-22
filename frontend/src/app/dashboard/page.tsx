"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap, Activity, TrendingUp, Award, Clock,
  GitCommit, FileEdit, MessageSquare,
  Info, Loader2, LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Project, Team, Score, ContributionEvent } from "@/lib/types";

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader", desc: "Top contributor — consistently high quality and quantity" },
  contributor: { color: "badge-contributor", label: "Contributor", desc: "Solid contributions across all dimensions" },
  passive: { color: "badge-passive", label: "Passive", desc: "Below average participation — room for improvement" },
  free_rider: { color: "badge-free_rider", label: "Free Rider", desc: "Minimal meaningful contribution detected" },
};

const activityIcons: Record<string, typeof GitCommit> = {
  commit: GitCommit,
  doc_edit: FileEdit,
  pr_review: MessageSquare,
  pull_request: GitCommit,
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myScore, setMyScore] = useState<Score | null>(null);
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        // Get projects the student is part of
        const projects = await api.listProjects();
        if (projects.length === 0) {
          setLoading(false);
          return;
        }
        setProjectName(projects[0].name);

        // Get teams for the first project
        const teams = await api.listTeams(projects[0].id);
        if (teams.length === 0) {
          setLoading(false);
          return;
        }

        const teamId = teams[0].id;

        // Get scores and events
        const [scores, contribs] = await Promise.all([
          api.getTeamScores(teamId).catch(() => []),
          api.getTeamContributions(teamId).catch(() => []),
        ]);

        // Find my score
        if (user) {
          const mine = scores.find((s) => s.user_id === user.id);
          if (mine) setMyScore(mine);
        }

        // Filter events to mine
        const myEvents = user
          ? contribs.filter((e) => e.user_id === user.id)
          : contribs;
        setEvents(myEvents.slice(0, 10));
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user]);

  // Build timeline data from events
  const dailyMap: Record<string, { commits: number; doc_edits: number; total: number }> = {};
  for (const e of events) {
    const day = new Date(e.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!dailyMap[day]) dailyMap[day] = { commits: 0, doc_edits: 0, total: 0 };
    dailyMap[day].total += 1;
    if (e.event_type === "commit") dailyMap[day].commits += 1;
    else dailyMap[day].doc_edits += 1;
  }
  const timeline = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));
  const maxTotal = Math.max(...timeline.map((d) => d.total), 1);

  const score = myScore || { quantity_score: 0, quality_score: 0, consistency_score: 0, final_score: 0, contribution_pct: 0, role_label: "contributor" as const };
  const SCORE_BREAKDOWN = [
    { label: "Quantity", value: score.quantity_score, weight: "30%", desc: "Commits, edits, reviews relative to most active member" },
    { label: "Quality", value: score.quality_score, weight: "50%", desc: "AI analysis of code quality, significance, and complexity" },
    { label: "Consistency", value: score.consistency_score, weight: "20%", desc: "How evenly distributed contributions are over time" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-light)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Top Bar ── */}
      <nav className="glass sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold gradient-text">EquiGrade</span>
            </Link>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="text-sm text-[var(--text-secondary)]">Student Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">{user?.name || user?.email}</span>
            <button onClick={logout} className="btn btn-ghost text-xs">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!myScore && events.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Welcome to EquiGrade</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              You don't have any scores yet. Once your educator sets up a project and syncs your contributions, your scores will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* ── Score Hero ── */}
            <div className="glass-card p-8 mb-8 gradient-border animate-fade-in">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Score Circle */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-surface)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="url(#scoreGradient)" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(score.final_score / 100) * 327} 327`}
                      style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold gradient-text">{score.final_score}</span>
                    <span className="text-xs text-[var(--text-muted)]">/ 100</span>
                  </div>
                </div>

                {/* Score Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                    <h1 className="text-2xl font-bold">Your Contribution Score</h1>
                    <span className={`badge ${roleConfig[score.role_label as keyof typeof roleConfig]?.color || "badge-contributor"}`}>
                      {roleConfig[score.role_label as keyof typeof roleConfig]?.label || score.role_label}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {roleConfig[score.role_label as keyof typeof roleConfig]?.desc || ""}
                  </p>
                  <div className="flex items-center gap-6 justify-center md:justify-start text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Team Share: </span>
                      <span className="font-bold text-[var(--primary-light)]">{score.contribution_pct}%</span>
                    </div>
                    {projectName && (
                      <div>
                        <span className="text-[var(--text-muted)]">Project: </span>
                        <span className="font-medium">{projectName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Score Breakdown ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
              {SCORE_BREAKDOWN.map((dim) => (
                <div key={dim.label} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">{dim.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">Weight: {dim.weight}</span>
                  </div>
                  <div className="text-3xl font-bold gradient-text mb-2">{dim.value}</div>
                  <div className="progress-bar mb-3">
                    <div className="progress-fill" style={{ width: `${dim.value}%` }} />
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {dim.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Activity Timeline ── */}
            {timeline.length > 0 && (
              <div className="glass-card p-6 mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-[var(--primary-light)]" />
                  <h2 className="text-lg font-semibold">Contribution Timeline</h2>
                </div>
                <div className="flex items-end gap-2 h-40">
                  {timeline.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-[var(--text-muted)]">{d.total}</div>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-indigo-600/80 to-cyan-400/80 transition-all duration-500 min-h-[4px]"
                        style={{ height: `${(d.total / maxTotal) * 100}%` }}
                      />
                      <div className="text-[10px] text-[var(--text-muted)] mt-1">{d.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent Events ── */}
            {events.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-[var(--primary-light)]" />
                  <h2 className="text-lg font-semibold">Recent Activity</h2>
                </div>
                <div className="space-y-3 stagger-children">
                  {events.map((evt) => {
                    const Icon = activityIcons[evt.event_type] || GitCommit;
                    const data = evt.event_data as Record<string, unknown>;
                    return (
                      <div
                        key={evt.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[var(--primary-light)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {(data.message as string) || (data.title as string) || evt.event_type}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {new Date(evt.occurred_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] flex-shrink-0">
                          {evt.event_type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Transparency Note ── */}
        <div className="mt-8 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--primary-light)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold mb-1">How Your Score is Calculated</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Your final score is a weighted average: <strong>50% Quality</strong> (AI-analyzed code significance and complexity),{" "}
                <strong>30% Quantity</strong> (total contributions relative to the most active member),{" "}
                and <strong>20% Consistency</strong> (how evenly your work is spread over the project timeline).
                Role labels are assigned based on your score relative to the team average.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
