"use client";

import { useState } from "react";
import { Search, UserCheck, TrendingUp, ChevronRight } from "lucide-react";

const ALL_STUDENTS = [
  { id: "1", name: "Alex Johnson", email: "alex@uni.edu", team: "Team Alpha", project: "CS 301", final_score: 90.4, role_label: "leader" as const },
  { id: "2", name: "Sarah Chen", email: "sarah@uni.edu", team: "Team Alpha", project: "CS 301", final_score: 82.1, role_label: "contributor" as const },
  { id: "3", name: "Mike Davis", email: "mike@uni.edu", team: "Team Alpha", project: "CS 301", final_score: 70.1, role_label: "contributor" as const },
  { id: "4", name: "Emma Wilson", email: "emma@uni.edu", team: "Team Beta", project: "CS 301", final_score: 46.5, role_label: "passive" as const },
  { id: "5", name: "Jake Brown", email: "jake@uni.edu", team: "Team Beta", project: "CS 301", final_score: 21.0, role_label: "free_rider" as const },
  { id: "6", name: "Lisa Park", email: "lisa@uni.edu", team: "Team Beta", project: "CS 301", final_score: 75.3, role_label: "contributor" as const },
  { id: "7", name: "Tom Lee", email: "tom@uni.edu", team: "Team Gamma", project: "CS 201", final_score: 88.2, role_label: "leader" as const },
  { id: "8", name: "Ana Garcia", email: "ana@uni.edu", team: "Team Gamma", project: "CS 201", final_score: 79.0, role_label: "contributor" as const },
];

const roleConfig = {
  leader: { color: "badge-leader", label: "Leader" },
  contributor: { color: "badge-contributor", label: "Contributor" },
  passive: { color: "badge-passive", label: "Passive" },
  free_rider: { color: "badge-free_rider", label: "Free Rider" },
};

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const filtered = ALL_STUDENTS.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.role_label === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Students</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        All students across your projects
      </p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All Roles</option>
          <option value="leader">Leaders</option>
          <option value="contributor">Contributors</option>
          <option value="passive">Passive</option>
          <option value="free_rider">Free Riders</option>
        </select>
      </div>

      {/* Student List */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Team</th>
              <th>Project</th>
              <th>Score</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id} className="cursor-pointer">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{student.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm">{student.team}</td>
                <td className="text-sm text-[var(--text-secondary)]">{student.project}</td>
                <td>
                  <span className="text-lg font-bold gradient-text">{student.final_score}</span>
                </td>
                <td>
                  <span className={`badge ${roleConfig[student.role_label].color}`}>
                    {roleConfig[student.role_label].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] text-sm">No students found.</p>
        </div>
      )}
    </>
  );
}
