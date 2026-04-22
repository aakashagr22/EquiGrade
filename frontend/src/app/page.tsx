"use client";

import Link from "next/link";
import {
  BarChart3,
  GitBranch,
  FileText,
  Shield,
  Zap,
  Users,
  ArrowRight,
  CheckCircle2,
  Brain,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Automatically track commits, pull requests, code reviews, and diffs from connected repositories.",
  },
  {
    icon: FileText,
    title: "Google Docs Tracking",
    description:
      "Monitor document edit history across Docs, Sheets, and Slides to capture writing contributions.",
  },
  {
    icon: Brain,
    title: "AI Quality Analysis",
    description:
      "Gemini AI evaluates code quality, meaningful changes vs trivial edits, and detects suspicious patterns.",
  },
  {
    icon: BarChart3,
    title: "Fair Scoring Algorithm",
    description:
      "Weighted scoring combines quantity, quality, and consistency for transparent, explainable results.",
  },
  {
    icon: Shield,
    title: "Privacy-First",
    description:
      "Read-only OAuth permissions, project-scoped data access, and encrypted token storage.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Dashboards",
    description:
      "Educator and student dashboards with contribution timelines, role labels, and behavioral flags.",
  },
];

const stats = [
  { value: "3", label: "Score Dimensions", sub: "Quantity · Quality · Consistency" },
  { value: "4", label: "Role Classifications", sub: "Leader · Contributor · Passive · Free-rider" },
  { value: "100%", label: "Data-Driven", sub: "Zero subjective peer reviews" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">EquiGrade</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/login" className="btn btn-primary">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-[var(--text-secondary)]">
              Powered by Google Gemini AI
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Fair Grading for
            <br />
            <span className="gradient-text">Group Projects</span>
          </h1>

          <p
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            EquiGrade replaces subjective peer reviews with objective,
            AI-powered contribution analysis. Track real work from GitHub and
            Google Workspace — automatically.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <Link href="/login" className="btn btn-primary text-base px-8 py-3">
              <Zap className="w-5 h-5" />
              Start Evaluating
            </Link>
            <a href="#features" className="btn btn-secondary text-base px-8 py-3">
              Learn More
            </a>
          </div>
        </div>

        {/* Hero Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card stat-card p-6 text-center">
              <div className="text-4xl font-extrabold gradient-text mb-2">{stat.value}</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{stat.label}</div>
              <div className="text-xs text-[var(--text-muted)]">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for{" "}
              <span className="gradient-text">Fair Evaluation</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              From data ingestion to AI analysis to transparent scoring — EquiGrade handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 flex items-center justify-center mb-4 group-hover:from-indigo-500/30 group-hover:to-cyan-400/30 transition-all">
                  <f.icon className="w-6 h-6 text-[var(--primary-light)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="gradient-text">Works</span>
          </h2>

          <div className="space-y-8 stagger-children">
            {[
              { step: "01", title: "Connect", desc: "Link your GitHub repositories and Google Workspace documents to EquiGrade." },
              { step: "02", title: "Collect", desc: "Automatically fetch commit logs, code diffs, document edit history, and PR reviews." },
              { step: "03", title: "Analyze", desc: "Gemini AI evaluates each contribution for quality, significance, and suspicious patterns." },
              { step: "04", title: "Score", desc: "Weighted algorithm produces fair, transparent scores with role classifications." },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center glass-card p-12 gradient-border">
          <h2 className="text-3xl font-bold mb-4">
            Ready to <span className="gradient-text">Eliminate Free-Riding?</span>
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join universities using EquiGrade for objective, data-driven group project evaluation.
          </p>
          <Link href="/login" className="btn btn-primary text-base px-10 py-3">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">EquiGrade</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} EquiGrade. Fair grading, powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
