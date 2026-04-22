"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Download, AlertTriangle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Score, FlagItem } from "@/lib/types";

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
  const [scores, setScores] = useState<Score[]>([]);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadData = async () => {
    try {
      const [scoreData, flagData] = await Promise.all([
        api.getTeamScores(teamId),
        api.getTeamFlags(teamId).catch(() => ({ flags: [] })),
      ]);
      setScores(scoreData);
      setFlags(flagData.flags || []);
    } catch { /* handle */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [teamId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.triggerAnalysis(teamId);
      await loadData();
    } catch { /* handle */ }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-light)]" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold mb-1">Team Scores</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Individual contribution scores and AI analysis results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn btn-secondary text-xs disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {analyzing ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      </div>

      {scores.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-4">
            No scores computed yet. Sync integrations first, then click "Re-analyze" to compute scores.
          </p>
          <button onClick={handleAnalyze} disabled={analyzing} className="btn btn-primary disabled:opacity-50">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              "Run Analysis"
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Contribution Bar */}
          <div className="glass-card p-6 mb-8">
            <h3 className="text-sm font-semibold mb-4">Contribution Distribution</h3>
            <div className="flex items-center gap-8">
              <div className="flex-1 h-8 rounded-full overflow-hidden flex">
                {scores.map((s, i) => {
                  const colors = [
                    "bg-indigo-500", "bg-cyan-400", "bg-violet-500",
                    "bg-emerald-500", "bg-amber-400",
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
              {scores.map((s, i) => {
                const colors = ["bg-indigo-500", "bg-cyan-400", "bg-violet-500", "bg-emerald-500", "bg-amber-400"];
                return (
                  <div key={s.user_id} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
                    <span className="text-[var(--text-secondary)]">{s.user_name || "Unknown"}</span>
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
                  {scores.map((score) => (
                    <tr key={score.user_id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                            {score.user_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{score.user_name || "Unknown"}</div>
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
                        <span className={`badge ${roleConfig[score.role_label]?.color || "badge-contributor"}`}>
                          {roleConfig[score.role_label]?.label || score.role_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Flags</h3>
          </div>
          <div className="space-y-3">
            {flags.map((flag, i) => (
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
