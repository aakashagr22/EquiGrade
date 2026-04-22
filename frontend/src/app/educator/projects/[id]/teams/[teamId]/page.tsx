"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Download, AlertTriangle,
  ChevronRight, Activity, Clock,
} from "lucide-react";

const TEAM = { id: "t1", name: "Team Alpha" };

const SCORES = [
  { user_id: "1", user_name: "Alex Johnson", user_email: "alex@uni.edu", quantity_score: 92, quality_score: 88, consistency_score: 95, final_score: 90.4, contribution_pct: 28.5, role_label: "leader" as const },
  { user_id: "2", user_name: "Sarah Chen", user_email: "sarah@uni.edu", quantity_score: 78, quality_score: 85, consistency_score: 80, final_score: 82.1, contribution_pct: 25.9, role_label: "contributor" as const },
  { user_id: "3", user_name: "Mike Davis", user_email: "mike@uni.edu", quantity_score: 65, quality_score: 72, consistency_score: 70, final_score: 70.1, contribution_pct: 22.1, role_label: "contributor" as const },
];

const FLAGS = [
  { user_name: "Jake Brown", flag_type: "last_minute", detail: "80% of commits made in the last 48 hours", severity: "high" as const },
];

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader" },
  contributor: { color: "badge-contributor", label: "Contributor" },
  passive: { color: "badge-passive", label: "Passive" },
  free_rider: { color: "badge-free_rider", label: "Free Rider" },
};

export default function TeamScoresPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = use(params);

  return (
    <>
      <Link
        href={`/educator/projects/${id}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">{TEAM.name} — Scores</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Individual contribution scores and AI analysis results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
          </button>
          <button className="btn btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Contribution Pie */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-semibold mb-4">Contribution Distribution</h3>
        <div className="flex items-center gap-8">
          {/* Visual bar */}
          <div className="flex-1 h-8 rounded-full overflow-hidden flex">
            {SCORES.map((s, i) => {
              const colors = [
                "bg-indigo-500",
                "bg-cyan-400",
                "bg-violet-500",
                "bg-emerald-500",
                "bg-amber-400",
              ];
              return (
                <div
                  key={s.user_id}
                  className={`${colors[i % colors.length]} transition-all`}
                  style={{ width: `${s.contribution_pct}%` }}
                  title={`${s.user_name}: ${s.contribution_pct}%`}
                />
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {SCORES.map((s, i) => {
            const colors = ["bg-indigo-500", "bg-cyan-400", "bg-violet-500"];
            return (
              <div key={s.user_id} className="flex items-center gap-2 text-xs">
                <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
                <span className="text-[var(--text-secondary)]">{s.user_name}</span>
                <span className="font-semibold">{s.contribution_pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scores Table */}
      <div className="glass-card p-6 mb-8">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Quantity</th>
                <th>Quality</th>
                <th>Consistency</th>
                <th>Final Score</th>
                <th>Share</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {SCORES.map((score) => (
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
                      <div className="progress-bar w-16">
                        <div className="progress-fill" style={{ width: `${score.quantity_score}%` }} />
                      </div>
                      <span className="text-xs">{score.quantity_score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16">
                        <div className="progress-fill" style={{ width: `${score.quality_score}%` }} />
                      </div>
                      <span className="text-xs">{score.quality_score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16">
                        <div className="progress-fill" style={{ width: `${score.consistency_score}%` }} />
                      </div>
                      <span className="text-xs">{score.consistency_score}</span>
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

      {/* Flags */}
      {FLAGS.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Flags</h3>
          </div>
          <div className="space-y-3">
            {FLAGS.map((flag, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
              >
                <div className={`w-2 h-2 rounded-full ${flag.severity === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
                <div className="flex-1">
                  <span className="font-medium text-sm">{flag.user_name}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">{flag.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
