"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Users, Clock, ChevronRight,
  Calendar, Search,
} from "lucide-react";

const DEMO_PROJECTS = [
  { id: "1", name: "CS 301 — Software Engineering", team_count: 5, created_at: "2026-03-01", description: "Spring 2026 group projects", start_date: "2026-03-01", end_date: "2026-05-15" },
  { id: "2", name: "CS 201 — Data Structures", team_count: 3, created_at: "2026-02-15", description: "Algorithm design and implementation", start_date: "2026-02-15", end_date: "2026-04-30" },
  { id: "3", name: "CS 401 — Capstone Design", team_count: 8, created_at: "2026-01-10", description: "Senior year capstone projects with industry partners", start_date: "2026-01-10", end_date: "2026-06-01" },
  { id: "4", name: "CS 101 — Intro to Programming", team_count: 12, created_at: "2026-03-20", description: "Collaborative pair programming exercises", start_date: "2026-03-20", end_date: "2026-05-20" },
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");

  const filtered = DEMO_PROJECTS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
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
                  {project.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" />
            </div>

            <div className="flex items-center gap-5 mt-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {project.team_count} teams
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {project.start_date} → {project.end_date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Created {project.created_at}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] text-sm">No projects found.</p>
        </div>
      )}
    </>
  );
}
