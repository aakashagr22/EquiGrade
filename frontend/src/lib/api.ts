/**
 * EquiGrade API Client
 * Typed fetch wrapper for all backend endpoints.
 */

import type {
  User, TokenResponse, Project, Team, Integration,
  ContributionEvent, Score, Dashboard, FlagItem, UserTimeline,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("equigrade_token", token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("equigrade_token");
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("equigrade_token");
    }
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ── Auth ──────────────────────────────────────────
  async getGitHubLoginUrl(): Promise<{ url: string }> {
    return this.fetch("/auth/github");
  }

  async getGoogleLoginUrl(): Promise<{ url: string }> {
    return this.fetch("/auth/google");
  }

  async githubCallback(code: string): Promise<TokenResponse> {
    return this.fetch("/auth/github/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async googleCallback(code: string): Promise<TokenResponse> {
    return this.fetch("/auth/google/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async getMe(): Promise<User> {
    return this.fetch("/auth/me");
  }

  // ── Projects ──────────────────────────────────────
  async listProjects(): Promise<Project[]> {
    return this.fetch("/projects");
  }

  async createProject(data: { name: string; description?: string; start_date?: string; end_date?: string }): Promise<Project> {
    return this.fetch("/projects", { method: "POST", body: JSON.stringify(data) });
  }

  async getProject(id: string): Promise<Project> {
    return this.fetch(`/projects/${id}`);
  }

  // ── Teams ─────────────────────────────────────────
  async listTeams(projectId: string): Promise<Team[]> {
    return this.fetch(`/projects/${projectId}/teams`);
  }

  async createTeam(projectId: string, name: string): Promise<Team> {
    return this.fetch(`/projects/${projectId}/teams`, { method: "POST", body: JSON.stringify({ name }) });
  }

  async addTeamMember(teamId: string, userId: string): Promise<void> {
    return this.fetch(`/teams/${teamId}/members`, { method: "POST", body: JSON.stringify({ user_id: userId }) });
  }

  // ── Integrations ──────────────────────────────────
  async listIntegrations(teamId: string): Promise<Integration[]> {
    return this.fetch(`/teams/${teamId}/integrations`);
  }

  async addIntegration(teamId: string, data: { type: string; external_id: string }): Promise<Integration> {
    return this.fetch(`/teams/${teamId}/integrations`, { method: "POST", body: JSON.stringify(data) });
  }

  async triggerSync(integrationId: string): Promise<{ message: string; job_id: string }> {
    return this.fetch(`/integrations/${integrationId}/sync`, { method: "POST" });
  }

  // ── Scores & Contributions ────────────────────────
  async getTeamScores(teamId: string): Promise<Score[]> {
    return this.fetch(`/teams/${teamId}/scores`);
  }

  async getTeamContributions(teamId: string): Promise<ContributionEvent[]> {
    return this.fetch(`/teams/${teamId}/contributions`);
  }

  async triggerAnalysis(teamId: string): Promise<{ message: string }> {
    return this.fetch(`/teams/${teamId}/analyze`, { method: "POST" });
  }

  async getTeamFlags(teamId: string): Promise<{ team_id: string; flags: FlagItem[] }> {
    return this.fetch(`/teams/${teamId}/flags`);
  }

  async getUserTimeline(userId: string, teamId: string): Promise<UserTimeline> {
    return this.fetch(`/users/${userId}/contribution-timeline?team_id=${teamId}`);
  }

  // ── Dashboard ─────────────────────────────────────
  async getDashboard(projectId: string): Promise<Dashboard> {
    return this.fetch(`/projects/${projectId}/dashboard`);
  }
}

export const api = new ApiClient();
