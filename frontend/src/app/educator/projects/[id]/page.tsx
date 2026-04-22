"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, GitBranch, Plus, ChevronRight,
  Activity, UserPlus, RefreshCw, ExternalLink, Calendar,
  BarChart3, AlertTriangle, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Team, Integration } from "@/lib/types";

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
  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<(Team & { integrations: Integration[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [proj, teamList] = await Promise.all([
        api.getProject(id),
        api.listTeams(id),
      ]);
      setProject(proj);

      // Load integrations for each team
      const teamsWithIntegrations = await Promise.all(
        teamList.map(async (t) => {
          const integrations = await api.listIntegrations(t.id).catch(() => []);
          return { ...t, integrations };
        })
      );
      setTeams(teamsWithIntegrations);
    } catch {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await api.createTeam(id, newTeamName);
      setNewTeamName("");
      setShowAddTeam(false);
      loadData();
    } catch { /* handle error */ }
  };

  const handleSync = async (integrationId: string) => {
    setSyncing(integrationId);
    try {
      const result = await api.triggerSync(integrationId);
      alert(`Sync complete: ${result.message || "Done"}`);
      loadData();
    } catch (err) {
      alert(`Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setSyncing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-light)]" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-[var(--text-muted)]">Project not found.</p>;
  }

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
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {project.description || "No description"}
            </p>
            <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
              {project.start_date && project.end_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {project.start_date} → {project.end_date}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {teams.length} teams · {teams.reduce((a, t) => a + t.members.length, 0)} students
              </span>
            </div>
          </div>
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

      {teams.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">No teams yet. Add a team to get started.</p>
        </div>
      )}

      {/* Team Cards */}
      <div className="space-y-6 stagger-children">
        {teams.map((team) => (
          <div key={team.id} className="glass-card p-6">
            {/* Team Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{team.name}</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {team.members.length} members
                </span>
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
                      {m.name?.charAt(0) || "?"}
                    </div>
                    <span>{m.name || m.email}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {m.email}
                    </span>
                  </div>
                ))}
                {team.members.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)]">No members yet</span>
                )}
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
                    <button
                      onClick={() => handleSync(intg.id)}
                      disabled={syncing === intg.id}
                      className="ml-1 text-[var(--primary-light)] hover:text-white transition-colors"
                      title="Sync now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing === intg.id ? "animate-spin" : ""}`} />
                    </button>
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
          </div>
        ))}
      </div>
    </>
  );
}
