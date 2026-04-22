"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, FileText, Loader2, CheckCircle2 } from "lucide-react";

const INTEGRATION_TYPES = [
  {
    id: "github_repo",
    icon: "🔗",
    name: "GitHub Repository",
    description: "Track commits, pull requests, code reviews, and diffs",
    placeholder: "owner/repo-name",
    color: "from-gray-700/40 to-gray-800/40",
  },
  {
    id: "google_doc",
    icon: "📄",
    name: "Google Document",
    description: "Track edits, revision history, and contributions",
    placeholder: "Document URL or ID",
    color: "from-blue-600/20 to-blue-700/20",
  },
  {
    id: "google_sheet",
    icon: "📊",
    name: "Google Sheet",
    description: "Track spreadsheet edits and cell contributions",
    placeholder: "Sheet URL or ID",
    color: "from-green-600/20 to-green-700/20",
  },
  {
    id: "google_slide",
    icon: "📽️",
    name: "Google Slides",
    description: "Track slide creation and design contributions",
    placeholder: "Presentation URL or ID",
    color: "from-yellow-600/20 to-yellow-700/20",
  },
];

export default function ConnectIntegrationPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [externalId, setExternalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !externalId.trim()) return;

    setLoading(true);
    try {
      // TODO: api.addIntegration(teamId, { type: selected, external_id: externalId })
      await new Promise((r) => setTimeout(r, 1200));
      setSuccess(true);
      setTimeout(() => {
        router.push(`/educator/projects/${id}`);
      }, 1500);
    } catch {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Integration Connected!</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Redirecting back to project...
          </p>
        </div>
      </div>
    );
  }

  const selectedType = INTEGRATION_TYPES.find((t) => t.id === selected);

  return (
    <>
      <Link
        href={`/educator/projects/${id}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </Link>

      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-[var(--primary-light)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Connect Integration</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Link a data source to track contributions
            </p>
          </div>
        </div>

        {/* Step 1: Select Type */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">
            1. Select Integration Type
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {INTEGRATION_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selected === type.id
                    ? "border-[var(--primary)] bg-[rgba(99,102,241,0.1)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{type.icon}</span>
                  <span className="font-medium text-sm">{type.name}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Enter ID */}
        {selected && (
          <form onSubmit={handleConnect} className="animate-fade-in">
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                2. Enter Resource Identifier
              </h3>
              <div className="glass-card p-5">
                <label className="block text-sm font-medium mb-2">
                  {selectedType?.name} ID
                </label>
                <input
                  type="text"
                  placeholder={selectedType?.placeholder}
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="input font-mono"
                  autoFocus
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {selected === "github_repo"
                    ? "Enter the repository in owner/repo format"
                    : "Paste the document URL or Google Drive file ID"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn btn-ghost"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !externalId.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" /> Connect
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
