"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Users, Clock, ChevronRight,
  Calendar, Search, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your courses and group project evaluations
          </p>
        </div>
        <Link href="/educator/projects/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-light)]" />
        </div>
      ) : (
        <>
          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/educator/projects/${project.id}`}
                className="glass-card p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-[var(--primary-light)] transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-5 mt-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {project.team_count} teams
                  </span>
                  {project.start_date && project.end_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {project.start_date} → {project.end_date}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--text-muted)] text-sm">
                {projects.length === 0
                  ? "No projects yet. Create your first project to get started!"
                  : "No projects match your search."}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
