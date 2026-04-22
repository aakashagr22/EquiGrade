/* EquiGrade TypeScript Types */

export type UserRole = "student" | "educator" | "admin";
export type RoleLabel = "leader" | "contributor" | "passive" | "free_rider";
export type IntegrationType = "github_repo" | "google_doc" | "google_sheet" | "google_slide" | "figma";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  institution_id: string | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  team_count: number;
}

export interface TeamMember {
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface Team {
  id: string;
  name: string;
  project_id: string;
  members: TeamMember[];
}

export interface Integration {
  id: string;
  team_id: string;
  type: IntegrationType;
  external_id: string;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface ContributionEvent {
  id: string;
  integration_id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  occurred_at: string;
  fetched_at: string;
}

export interface Score {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  avatar_url: string | null;
  quantity_score: number;
  quality_score: number;
  consistency_score: number;
  final_score: number;
  contribution_pct: number;
  role_label: RoleLabel;
  computed_at: string;
}

export interface TeamScores {
  team_id: string;
  team_name: string;
  scores: Score[];
}

export interface FlagItem {
  user_id: string;
  user_name: string | null;
  flag_type: string;
  detail: string;
  severity: "low" | "medium" | "high";
  event_ids: string[];
}

export interface TimelinePoint {
  date: string;
  commits: number;
  doc_edits: number;
  pr_reviews: number;
  total: number;
}

export interface UserTimeline {
  user_id: string;
  user_name: string | null;
  data: TimelinePoint[];
}

export interface Dashboard {
  project_id: string;
  project_name: string;
  total_teams: number;
  total_members: number;
  teams: TeamScores[];
  flags_count: number;
}
