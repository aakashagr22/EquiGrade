# EquiGrade API Documentation

**Base URL**: `http://localhost:8000/api`  
**Authentication**: JWT Bearer token in `Authorization` header

---

## Authentication Endpoints

### 1. GitHub OAuth Login
```
GET /auth/github
```
Returns the GitHub OAuth authorization URL.

**Response:**
```json
{
  "url": "https://github.com/login/oauth/authorize?client_id=..."
}
```

---

### 2. GitHub OAuth Callback
```
POST /auth/github/callback
Content-Type: application/json

{
  "code": "string"
}
```
Exchanges GitHub authorization code for JWT token.

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar_url": "https://...",
    "role": "student"
  }
}
```

---

### 3. Google OAuth Login
```
GET /auth/google
```
Returns the Google OAuth authorization URL with Drive API scopes.

---

### 4. Google OAuth Callback
```
POST /auth/google/callback
Content-Type: application/json

{
  "code": "string"
}
```
Exchanges Google authorization code for JWT token.

---

### 5. Get Current User
```
GET /auth/me
Authorization: Bearer <jwt_token>
```
Returns the authenticated user's profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "avatar_url": "https://...",
  "role": "educator"
}
```

---

## Institution Endpoints

### 1. List Institutions
```
GET /institutions
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "University of Example",
    "slug": "university-of-example"
  }
]
```

---

### 2. Create Institution (Admin Only)
```
POST /institutions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "University of Example",
  "slug": "university-of-example"
}
```

---

### 3. Add Institution Member (Admin Only)
```
POST /institutions/{institution_id}/members
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "user_id": "uuid",
  "member_role": "educator"  // or "student", "admin"
}
```

---

### 4. Remove Institution Member (Admin Only)
```
DELETE /institutions/{institution_id}/members/{user_id}
Authorization: Bearer <jwt_token>
```

---

## Project Endpoints

### 1. List Projects
```
GET /projects
Authorization: Bearer <jwt_token>
```
- **Educators** see projects they created
- **Students** see projects where they're team members

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Group Project 1",
    "description": "Build a web app",
    "institution_id": "uuid",
    "start_date": "2024-01-15",
    "end_date": "2024-02-15",
    "created_at": "2024-01-10T10:00:00Z",
    "team_count": 3
  }
]
```

---

### 2. Create Project (Educator Only)
```
POST /projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Group Project 1",
  "description": "Build a web app",
  "institution_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-02-15"
}
```

---

### 3. Get Project
```
GET /projects/{project_id}
Authorization: Bearer <jwt_token>
```

---

## Team Endpoints

### 1. List Teams in Project
```
GET /projects/{project_id}/teams
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Team A",
    "project_id": "uuid",
    "members": [
      {
        "user_id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://...",
        "joined_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
]
```

---

### 2. Create Team (Educator Only)
```
POST /projects/{project_id}/teams
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Team A"
}
```

---

### 3. Add Team Member (Educator Only)
```
POST /teams/{team_id}/members
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "user_id": "uuid"
}
```

---

### 4. Remove Team Member (Educator Only)
```
DELETE /teams/{team_id}/members/{user_id}
Authorization: Bearer <jwt_token>
```

---

## Integration Endpoints

### 1. List Team Integrations
```
GET /teams/{team_id}/integrations
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "type": "github_repo",
    "external_id": "owner/repo",
    "config": {},
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### 2. Add Integration to Team
```
POST /teams/{team_id}/integrations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "github_repo",
  "external_id": "owner/repo",
  "config": {}
}
```

**Supported types:**
- `github_repo`: GitHub repository (external_id = "owner/repo")
- `google_doc`: Google Docs (external_id = Drive file ID)
- `google_sheet`: Google Sheets
- `google_slide`: Google Slides
- `figma`: Figma file

---

### 3. Remove Integration
```
DELETE /integrations/{integration_id}
Authorization: Bearer <jwt_token>
```

---

### 4. Sync Integration (Manual)
```
POST /integrations/{integration_id}/sync
Authorization: Bearer <jwt_token>
```
Manually trigger a sync for this integration.

---

### 5. Get Sync Status
```
GET /integrations/{integration_id}/sync-status
Authorization: Bearer <jwt_token>
```

---

## Contributions & Scoring Endpoints

### 1. Get Team Contributions
```
GET /teams/{team_id}/contributions
Authorization: Bearer <jwt_token>
```
Returns raw contribution events (max 500).

**Response:**
```json
[
  {
    "id": "uuid",
    "integration_id": "uuid",
    "user_id": "uuid",
    "event_type": "commit",
    "event_data": {
      "commit_hash": "abc123",
      "message": "Fix bug",
      "author": "John Doe",
      "additions": 50,
      "deletions": 10
    },
    "occurred_at": "2024-01-15T14:30:00Z",
    "fetched_at": "2024-01-15T15:00:00Z"
  }
]
```

---

### 2. Get Team Scores
```
GET /teams/{team_id}/scores
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "user_id": "uuid",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "avatar_url": "https://...",
    "quantity_score": 75.5,
    "quality_score": 82.3,
    "consistency_score": 88.0,
    "final_score": 81.6,
    "contribution_pct": 32.5,
    "role_label": "contributor",
    "computed_at": "2024-01-16T10:00:00Z"
  }
]
```

**Scoring Formula:**
```
final_score = (quantity * 0.30) + (quality * 0.50) + (consistency * 0.20)

Role Classification:
- leader: >= 120% of team average
- contributor: >= 80% of team average
- passive: >= 40%
- free_rider: < 40%
```

---

### 3. Trigger Team Analysis
```
POST /teams/{team_id}/analyze
Authorization: Bearer <jwt_token>
```
Dispatches Celery task to analyze all unanalyzed contributions.

**Response:**
```json
{
  "message": "Analysis queued",
  "team_id": "uuid",
  "task_id": "celery-task-id"
}
```

---

### 4. Get Team Flags
```
GET /teams/{team_id}/flags
Authorization: Bearer <jwt_token>
```
Returns suspicious patterns detected by AI.

**Response:**
```json
{
  "team_id": "uuid",
  "flags": [
    {
      "user_id": "uuid",
      "user_name": "Jane Smith",
      "flag_type": "copy_paste",
      "detail": "Large code blocks detected that appear copy-pasted",
      "severity": "high",
      "event_ids": ["uuid1", "uuid2"]
    },
    {
      "user_id": "uuid",
      "user_name": "Bob Johnson",
      "flag_type": "last_minute",
      "detail": "All commits made 2 hours before deadline",
      "severity": "medium",
      "event_ids": ["uuid3"]
    }
  ]
}
```

**Flag Types:**
- `trivial`: Whitespace/formatting only changes
- `copy_paste`: Large blocks of copied code
- `last_minute`: All work done right before deadline

---

### 5. Get User Contribution Timeline
```
GET /users/{user_id}/contribution-timeline?team_id={team_id}
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "user_id": "uuid",
  "user_name": "John Doe",
  "data": [
    {
      "date": "2024-01-15",
      "commits": 2,
      "doc_edits": 0,
      "pr_reviews": 1,
      "total": 3
    },
    {
      "date": "2024-01-16",
      "commits": 0,
      "doc_edits": 5,
      "pr_reviews": 0,
      "total": 5
    }
  ]
}
```

---

## Dashboard Endpoints

### 1. Get Project Dashboard (Educator Only)
```
GET /projects/{project_id}/dashboard
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "project_id": "uuid",
  "project_name": "Group Project 1",
  "total_teams": 5,
  "total_members": 20,
  "teams": [
    {
      "team_id": "uuid",
      "team_name": "Team A",
      "scores": [
        {
          "user_id": "uuid",
          "user_name": "John Doe",
          "final_score": 85.5,
          "role_label": "contributor",
          "contribution_pct": 35.2
        }
      ]
    }
  ],
  "flags_count": 3
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "detail": "Requires 'educator' role"
}
```

### 404 Not Found
```json
{
  "detail": "Team not found"
}
```

### 409 Conflict
```json
{
  "detail": "User is already a team member"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| GitHub API | 60/hour (unauthenticated), 5000/hour (authenticated) |
| Google API | 1000/day |
| Gemini API | Based on plan |
| General API | 100 requests/minute per user |

---

## Webhook (Optional Future Feature)

```
POST /webhooks/github
X-Hub-Signature-256: sha256=...

{
  "action": "opened",
  "pull_request": {...},
  "repository": {...}
}
```

For real-time sync instead of scheduled polling.

---

## WebSocket (Optional Future Feature)

```
WS /ws/team/{team_id}
Authorization: Bearer <jwt_token>
```

For real-time score updates and notifications.

---

## Testing API with curl

```bash
# Login with GitHub
curl -X POST "http://localhost:8000/api/auth/github/callback" \
  -H "Content-Type: application/json" \
  -d '{"code":"github_auth_code"}'

# Get current user
curl "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create project
curl -X POST "http://localhost:8000/api/projects" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "A group project",
    "start_date": "2024-01-15",
    "end_date": "2024-02-15"
  }'

# Get team scores
curl "http://localhost:8000/api/teams/TEAM_ID/scores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Trigger analysis
curl -X POST "http://localhost:8000/api/teams/TEAM_ID/analyze" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Interactive API Documentation

Visit **http://localhost:8000/docs** for Swagger UI with live testing.

---

Last Updated: 2024-01-16
Version: 1.0.0-beta
