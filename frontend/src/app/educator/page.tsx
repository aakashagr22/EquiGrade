"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, FolderKanban,
  ChevronRight, Plus, AlertTriangle, TrendingUp,
  Award, Bell, Activity, Clock, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Score } from "@/lib/types";

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader" },
  contributor: { color: "badge-contributor", label: "Contributor" },
  passive: { color: "badge-passive", label: "Passive" },
  free_rider: { color: "badge-free_rider", label: "Free Rider" },
};

export default function EducatorDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTeams = projects.reduce((a, p) => a + (p.team_count || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-light)]" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Educator Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {projects.length > 0 ? projects[0].name : "Welcome to EquiGrade"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/educator/projects/new" className="btn btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
        {[
          { icon: FolderKanban, label: "Projects", value: projects.length, color: "from-indigo-500/20 to-indigo-600/20" },
          { icon: Users, label: "Total Teams", value: totalTeams, color: "from-cyan-500/20 to-cyan-600/20" },
          { icon: Award, label: "Integrations", value: "—", color: "from-green-500/20 to-green-600/20" },
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
          <h2 className="text-lg font-semibold">Your Projects</h2>
          <Link href="/educator/projects" className="text-xs text-[var(--primary-light)] hover:underline">
            View All →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)] text-sm mb-4">No projects yet. Create your first project to start evaluating contributions.</p>
            <Link href="/educator/projects/new" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
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
                <p className="text-xs text-[var(--text-muted)] mb-3">{project.description || "No description"}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {project.team_count} teams
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      {projects.length === 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="space-y-3">
            {[
              { step: "1", title: "Create a Project", desc: "Set up a course or project with a name and date range." },
              { step: "2", title: "Add Teams", desc: "Create teams and add students as members." },
              { step: "3", title: "Connect Integrations", desc: "Link GitHub repos or Google Docs to each team." },
              { step: "4", title: "Sync & Analyze", desc: "Fetch contributions and run AI analysis to generate scores." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-white text-xs">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
