"use client";

import { useState } from "react";
import { Zap, ArrowLeft, Loader2, Mail } from "lucide-react";

// Custom GitHub icon since lucide-react removed it
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGitHubLogin = async () => {
    setLoading("github");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/github`
      );
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading("google");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/google`
      );
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Login Card */}
        <div className="glass-card p-8 gradient-border">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center animate-pulse-glow">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">EquiGrade</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Sign in to continue
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
            Connect your GitHub or Google account to start tracking
            contributions. We only request{" "}
            <span className="text-[var(--primary-light)] font-medium">
              read-only
            </span>{" "}
            access to your project data.
          </p>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGitHubLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "github" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GithubIcon className="w-5 h-5" />
              )}
              Continue with GitHub
            </button>

            <button
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Secure OAuth 2.0
            </span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          {/* Trust Indicators */}
          <div className="space-y-3">
            {[
              "Read-only access to repositories and documents",
              "No passwords stored — OAuth tokens encrypted",
              "Only project-specific data is accessed",
            ].map((text) => (
              <div
                key={text}
                className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
              >
                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Role Info */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { role: "Student", desc: "View your scores" },
            { role: "Educator", desc: "Manage projects" },
            { role: "Admin", desc: "Full access" },
          ].map((r) => (
            <div
              key={r.role}
              className="glass-card p-3 text-xs"
            >
              <div className="font-semibold text-[var(--primary-light)] mb-0.5">
                {r.role}
              </div>
              <div className="text-[var(--text-muted)]">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
