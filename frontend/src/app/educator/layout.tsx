"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Zap, BarChart3, FolderKanban, Users,
  GitBranch, Settings, LogOut, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/educator", icon: BarChart3, label: "Dashboard" },
  { href: "/educator/projects", icon: FolderKanban, label: "Projects" },
  { href: "/educator/students", icon: Users, label: "Students" },
  { href: "/educator/integrations", icon: GitBranch, label: "Integrations" },
  { href: "/educator/settings", icon: Settings, label: "Settings" },
];

export default function EducatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="sidebar flex flex-col">
        <div className="px-5 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">EquiGrade</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/educator"
                ? pathname === "/educator"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 mt-auto space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-2 py-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.name || "Educator"}
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {user.email}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="sidebar-link text-red-400/70 hover:text-red-400 w-full"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
