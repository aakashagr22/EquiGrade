"use client";

import Link from "next/link";
import {
  GitBranch, RefreshCw, Clock, CheckCircle2,
  AlertCircle, ExternalLink,
} from "lucide-react";

const INTEGRATIONS = [
  { id: "int1", team: "Team Alpha", project: "CS 301", type: "github_repo", external_id: "org/project-alpha", status: "synced", last_sync: "2026-04-20 14:32", events_count: 142 },
  { id: "int2", team: "Team Alpha", project: "CS 301", type: "google_doc", external_id: "Design Document", status: "synced", last_sync: "2026-04-20 14:32", events_count: 58 },
  { id: "int3", team: "Team Beta", project: "CS 301", type: "github_repo", external_id: "org/project-beta", status: "error", last_sync: "2026-04-19 09:15", events_count: 87 },
  { id: "int4", team: "Team Gamma", project: "CS 201", type: "google_sheet", external_id: "Data Analysis Sheet", status: "synced", last_sync: "2026-04-20 12:00", events_count: 34 },
];

const typeIcons: Record<string, string> = {
  github_repo: "🔗",
  google_doc: "📄",
  google_sheet: "📊",
  google_slide: "📽️",
};

const typeLabels: Record<string, string> = {
  github_repo: "GitHub Repo",
  google_doc: "Google Doc",
  google_sheet: "Google Sheet",
  google_slide: "Google Slides",
};

export default function IntegrationsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Integrations</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        Connected data sources across all teams
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <div className="text-2xl font-bold gradient-text">{INTEGRATIONS.length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Total Connections</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-2xl font-bold text-green-400">
            {INTEGRATIONS.filter((i) => i.status === "synced").length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Synced</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-2xl font-bold text-red-400">
            {INTEGRATIONS.filter((i) => i.status === "error").length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Errors</div>
        </div>
      </div>

      {/* Integration List */}
      <div className="space-y-3 stagger-children">
        {INTEGRATIONS.map((intg) => (
          <div
            key={intg.id}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div className="text-2xl">{typeIcons[intg.type] || "🔌"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{typeLabels[intg.type]}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {intg.external_id}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{intg.team} · {intg.project}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {intg.last_sync}
                </span>
                <span>{intg.events_count} events</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {intg.status === "synced" ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> Synced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4" /> Error
                </span>
              )}
              <button className="btn btn-ghost text-xs p-2">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
