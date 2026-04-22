"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, GitBranch, Plus, ChevronRight,
  Activity, UserPlus, RefreshCw, ExternalLink, Calendar,
  BarChart3, AlertTriangle,
} from "lucide-react";

// ── Demo Data ──
const PROJECT = {
  id: "1",
  name: "CS 301 — Software Engineering",
  description: "Spring 2026 group projects",
  start_date: "2026-03-01",
  end_date: "2026-05-15",
};

const TEAMS = [
  {
    id: "t1",
    name: "Team Alpha",
    members: [
      { user_id: "1", name: "Alex Johnson", email: "alex@uni.edu", avatar_url: null },
      { user_id: "2", name: "Sarah Chen", email: "sarah@uni.edu", avatar_url: null },
      { user_id: "3", name: "Mike Davis", email: "mike@uni.edu", avatar_url: null },
    ],
    integrations: [
      { id: "int1", type: "github_repo", external_id: "org/project-alpha", created_at: "2026-03-05" },
      { id: "int2", type: "google_doc", external_id: "1a2b3c...doc", created_at: "2026-03-05" },
    ],
    avg_score: 80.9,
    flags_count: 0,
  },
  {
    id: "t2",
    name: "Team Beta",
    members: [
      { user_id: "4", name: "Emma Wilson", email: "emma@uni.edu", avatar_url: null },
      { user_id: "5", name: "Jake Brown", email: "jake@uni.edu", avatar_url: null },
      { user_id: "6", name: "Lisa Park", email: "lisa@uni.edu", avatar_url: null },
      { user_id: "7", name: "Tom Lee", email: "tom@uni.edu", avatar_url: null },
    ],
    integrations: [
      { id: "int3", type: "github_repo", external_id: "org/project-beta", created_at: "2026-03-06" },
    ],
    avg_score: 52.6,
    flags_count: 3,
  },
];

const integrationIcons: Record<string, string> = {
  github_repo: "🔗",
  google_doc: "📄",
  google_sheet: "📊",
  google_slide: "📽️",
  figma: "🎨",
};

const integrationLabels: Record<string, string> = {
  github_repo: "GitHub Repository",
  google_doc: "Google Doc",
  google_sheet: "Google Sheet",
  google_slide: "Google Slides",
  figma: "Figma Project",
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: api.createTeam(id, newTeamName)
    setNewTeamName("");
    setShowAddTeam(false);
  };

  return (
    <>
      {/* Back */}
      <Link
        href="/educator/projects"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* Project Header */}
      <div className="glass-card p-6 mb-8 gradient-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{PROJECT.name}</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {PROJECT.description}
            </p>
            <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {PROJECT.start_date} → {PROJECT.end_date}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {TEAMS.length} teams · {TEAMS.reduce((a, t) => a + t.members.length, 0)} students
              </span>
            </div>
          </div>
          <button className="btn btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Sync All
          </button>
        </div>
      </div>

      {/* Teams Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Teams</h2>
        <button
          onClick={() => setShowAddTeam(true)}
          className="btn btn-primary text-xs"
        >
          <Plus className="w-4 h-4" /> Add Team
        </button>
      </div>

      {/* Add Team Inline Form */}
      {showAddTeam && (
        <form
          onSubmit={handleAddTeam}
          className="glass-card p-4 mb-4 flex items-center gap-3 animate-fade-in"
        >
          <input
            type="text"
            placeholder="Team name..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="input flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTeamName.trim()}
            className="btn btn-primary text-xs disabled:opacity-50"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowAddTeam(false)}
            className="btn btn-ghost text-xs"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Team Cards */}
      <div className="space-y-6 stagger-children">
        {TEAMS.map((team) => (
          <div key={team.id} className="glass-card p-6">
            {/* Team Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{team.name}</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {team.members.length} members
                </span>
                {team.flags_count > 0 && (
                  <span className="badge badge-free_rider text-[10px]">
                    <AlertTriangle className="w-3 h-3" /> {team.flags_count} flags
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/educator/projects/${id}/teams/${team.id}`}
                  className="btn btn-secondary text-xs"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> View Scores
                </Link>
              </div>
            </div>

            {/* Members */}
            <div className="mb-5">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
                Members
              </div>
              <div className="flex flex-wrap gap-2">
                {team.members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white">
                      {m.name?.charAt(0)}
                    </div>
                    <span>{m.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {m.email}
                    </span>
                  </div>
                ))}
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:border-[var(--primary)] transition-all">
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Integrations */}
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
                Integrations
              </div>
              <div className="flex flex-wrap gap-2">
                {team.integrations.map((intg) => (
                  <div
                    key={intg.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm"
                  >
                    <span>{integrationIcons[intg.type] || "🔌"}</span>
                    <span className="text-xs font-medium">
                      {integrationLabels[intg.type]}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {intg.external_id.length > 20
                        ? intg.external_id.slice(0, 20) + "..."
                        : intg.external_id}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </div>
                ))}
                <Link
                  href={`/educator/projects/${id}/teams/${team.id}/connect`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:text-[var(--primary-light)] hover:border-[var(--primary)] transition-all"
                >
                  <GitBranch className="w-3.5 h-3.5" /> Connect
                </Link>
              </div>
            </div>

            {/* Avg Score */}
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                Average Score
              </span>
              <span className="text-lg font-bold gradient-text">
                {team.avg_score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
