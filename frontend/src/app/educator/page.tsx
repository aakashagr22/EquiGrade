"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, FolderKanban,
  ChevronRight, Plus, AlertTriangle, TrendingUp,
  Award, Bell, Activity, Clock,
} from "lucide-react";

// ── Demo Data ──
const DEMO_PROJECTS = [
  { id: "1", name: "CS 301 — Software Engineering", team_count: 5, created_at: "2026-03-01", description: "Spring 2026 group projects" },
  { id: "2", name: "CS 201 — Data Structures", team_count: 3, created_at: "2026-02-15", description: "Algorithm design and implementation" },
];

const DEMO_SCORES = [
  { user_id: "1", user_name: "Alex Johnson", user_email: "alex@uni.edu", avatar_url: null, quantity_score: 92, quality_score: 88, consistency_score: 95, final_score: 90.4, contribution_pct: 28.5, role_label: "leader" as const, computed_at: "2026-04-20" },
  { user_id: "2", user_name: "Sarah Chen", user_email: "sarah@uni.edu", avatar_url: null, quantity_score: 78, quality_score: 85, consistency_score: 80, final_score: 82.1, contribution_pct: 25.9, role_label: "contributor" as const, computed_at: "2026-04-20" },
  { user_id: "3", user_name: "Mike Davis", user_email: "mike@uni.edu", avatar_url: null, quantity_score: 65, quality_score: 72, consistency_score: 70, final_score: 70.1, contribution_pct: 22.1, role_label: "contributor" as const, computed_at: "2026-04-20" },
  { user_id: "4", user_name: "Emma Wilson", user_email: "emma@uni.edu", avatar_url: null, quantity_score: 40, quality_score: 55, consistency_score: 35, final_score: 46.5, contribution_pct: 14.7, role_label: "passive" as const, computed_at: "2026-04-20" },
  { user_id: "5", user_name: "Jake Brown", user_email: "jake@uni.edu", avatar_url: null, quantity_score: 15, quality_score: 30, consistency_score: 10, final_score: 21.0, contribution_pct: 6.6, role_label: "free_rider" as const, computed_at: "2026-04-20" },
];

const DEMO_FLAGS = [
  { user_name: "Jake Brown", flag_type: "last_minute", detail: "80% of commits made in the last 48 hours", severity: "high" as const },
  { user_name: "Emma Wilson", flag_type: "trivial", detail: "Multiple formatting-only commits detected", severity: "medium" as const },
  { user_name: "Jake Brown", flag_type: "copy_paste", detail: "Large code blocks appear copy-pasted from external sources", severity: "high" as const },
];

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader" },
  contributor: { color: "badge-contributor", label: "Contributor" },
  passive: { color: "badge-passive", label: "Passive" },
  free_rider: { color: "badge-free_rider", label: "Free Rider" },
};

const severityColors = {
  low: "text-blue-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

export default function EducatorDashboard() {
  const [selectedProject] = useState(DEMO_PROJECTS[0]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Educator Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {selectedProject.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center font-bold">
              3
            </span>
          </button>
          <Link href="/educator/projects/new" className="btn btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 stagger-children">
        {[
          { icon: FolderKanban, label: "Projects", value: DEMO_PROJECTS.length, color: "from-indigo-500/20 to-indigo-600/20" },
          { icon: Users, label: "Total Students", value: DEMO_SCORES.length, color: "from-cyan-500/20 to-cyan-600/20" },
          { icon: AlertTriangle, label: "Flags", value: DEMO_FLAGS.length, color: "from-red-500/20 to-red-600/20" },
          { icon: Award, label: "Avg Score", value: Math.round(DEMO_SCORES.reduce((a, s) => a + s.final_score, 0) / DEMO_SCORES.length), color: "from-green-500/20 to-green-600/20" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card stat-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-[var(--text-primary)]" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link href="/educator/projects" className="text-xs text-[var(--primary-light)] hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_PROJECTS.map((project) => (
            <Link
              key={project.id}
              href={`/educator/projects/${project.id}`}
              className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm group-hover:text-[var(--primary-light)] transition-colors">
                  {project.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">{project.description}</p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {project.team_count} teams
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {project.created_at}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Scores Table */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Team Alpha — Contribution Scores</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Last computed: April 20, 2026
            </p>
          </div>
          <button className="btn btn-secondary text-xs">Export CSV</button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Quantity</th>
                <th>Quality</th>
                <th>Consistency</th>
                <th>Final Score</th>
                <th>Contribution</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_SCORES.map((score) => (
                <tr key={score.user_id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                        {score.user_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{score.user_name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{score.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16"><div className="progress-fill" style={{ width: `${score.quantity_score}%` }} /></div>
                      <span className="text-xs text-[var(--text-secondary)]">{score.quantity_score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16"><div className="progress-fill" style={{ width: `${score.quality_score}%` }} /></div>
                      <span className="text-xs text-[var(--text-secondary)]">{score.quality_score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16"><div className="progress-fill" style={{ width: `${score.consistency_score}%` }} /></div>
                      <span className="text-xs text-[var(--text-secondary)]">{score.consistency_score}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-lg font-bold gradient-text">{score.final_score}</span>
                  </td>
                  <td>
                    <span className="text-sm font-semibold">{score.contribution_pct}%</span>
                  </td>
                  <td>
                    <span className={`badge ${roleConfig[score.role_label].color}`}>
                      {roleConfig[score.role_label].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flags Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Suspicious Behavior Flags</h2>
        </div>

        <div className="space-y-3 stagger-children">
          {DEMO_FLAGS.map((flag, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
            >
              <div className={`w-2 h-2 rounded-full ${flag.severity === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{flag.user_name}</span>
                  <span className={`text-xs font-semibold uppercase ${severityColors[flag.severity]}`}>
                    {flag.severity}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-muted)]">{flag.flag_type}:</span>{" "}
                  {flag.detail}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
