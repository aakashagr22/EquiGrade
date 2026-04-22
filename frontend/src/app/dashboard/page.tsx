"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap, BarChart3, TrendingUp, Award, Clock,
  GitCommit, FileEdit, MessageSquare, ArrowLeft,
  Info, ChevronRight, Activity,
} from "lucide-react";

// ── Demo Data ──
const MY_SCORE = {
  quantity_score: 78,
  quality_score: 85,
  consistency_score: 80,
  final_score: 82.1,
  contribution_pct: 25.9,
  role_label: "contributor" as const,
};

const SCORE_BREAKDOWN = [
  { label: "Quantity", value: MY_SCORE.quantity_score, weight: "30%", desc: "Commits, edits, reviews relative to most active member" },
  { label: "Quality", value: MY_SCORE.quality_score, weight: "50%", desc: "AI analysis of code quality, significance, and complexity" },
  { label: "Consistency", value: MY_SCORE.consistency_score, weight: "20%", desc: "How evenly distributed contributions are over time" },
];

const TIMELINE_DATA = [
  { date: "Mar 1", commits: 3, doc_edits: 1, total: 4 },
  { date: "Mar 5", commits: 5, doc_edits: 2, total: 7 },
  { date: "Mar 10", commits: 2, doc_edits: 3, total: 5 },
  { date: "Mar 15", commits: 4, doc_edits: 1, total: 5 },
  { date: "Mar 20", commits: 6, doc_edits: 0, total: 6 },
  { date: "Mar 25", commits: 3, doc_edits: 4, total: 7 },
  { date: "Apr 1", commits: 5, doc_edits: 2, total: 7 },
  { date: "Apr 5", commits: 4, doc_edits: 1, total: 5 },
  { date: "Apr 10", commits: 7, doc_edits: 3, total: 10 },
  { date: "Apr 15", commits: 3, doc_edits: 2, total: 5 },
  { date: "Apr 20", commits: 4, doc_edits: 1, total: 5 },
];

const RECENT_ACTIVITY = [
  { type: "commit", message: "feat: implement user authentication flow", time: "2 hours ago", score: 85 },
  { type: "commit", message: "fix: resolve database connection pooling issue", time: "5 hours ago", score: 78 },
  { type: "doc_edit", message: "Updated API documentation section 3.2", time: "1 day ago", score: 72 },
  { type: "pr_review", message: "Reviewed PR #47: Add pagination support", time: "1 day ago", score: 80 },
  { type: "commit", message: "refactor: extract validation logic to utils", time: "2 days ago", score: 90 },
];

const activityIcons = {
  commit: GitCommit,
  doc_edit: FileEdit,
  pr_review: MessageSquare,
};

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader", desc: "Top contributor — consistently high quality and quantity" },
  contributor: { color: "badge-contributor", label: "Contributor", desc: "Solid contributions across all dimensions" },
  passive: { color: "badge-passive", label: "Passive", desc: "Below average participation — room for improvement" },
  free_rider: { color: "badge-free_rider", label: "Free Rider", desc: "Minimal meaningful contribution detected" },
};

export default function StudentDashboard() {
  const maxTotal = Math.max(...TIMELINE_DATA.map((d) => d.total));

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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold">S</div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
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
                  strokeDasharray={`${(MY_SCORE.final_score / 100) * 327} 327`}
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
                <span className="text-3xl font-extrabold gradient-text">{MY_SCORE.final_score}</span>
                <span className="text-xs text-[var(--text-muted)]">/ 100</span>
              </div>
            </div>

            {/* Score Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                <h1 className="text-2xl font-bold">Your Contribution Score</h1>
                <span className={`badge ${roleConfig[MY_SCORE.role_label].color}`}>
                  {roleConfig[MY_SCORE.role_label].label}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {roleConfig[MY_SCORE.role_label].desc}
              </p>
              <div className="flex items-center gap-6 justify-center md:justify-start text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Team Share: </span>
                  <span className="font-bold text-[var(--primary-light)]">{MY_SCORE.contribution_pct}%</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Project: </span>
                  <span className="font-medium">CS 301 — Software Engineering</span>
                </div>
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

        {/* ── Activity Timeline (Visual Bar Chart) ── */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[var(--primary-light)]" />
            <h2 className="text-lg font-semibold">Contribution Timeline</h2>
          </div>

          <div className="flex items-end gap-2 h-40">
            {TIMELINE_DATA.map((d) => (
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

          <div className="flex items-center gap-6 mt-4 justify-center text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-indigo-500/60" /> Commits
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-cyan-400/60" /> Doc Edits
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-[var(--primary-light)]" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>

          <div className="space-y-3 stagger-children">
            {RECENT_ACTIVITY.map((act, i) => {
              const Icon = activityIcons[act.type as keyof typeof activityIcons] || GitCommit;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--primary-light)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{act.message}</div>
                    <div className="text-xs text-[var(--text-muted)]">{act.time}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold gradient-text">{act.score}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">AI Score</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
