# EquiGrade Architecture & Design

## System Overview

EquiGrade is a cloud-native, AI-powered contribution evaluation system designed to fairly assess individual contributions in group projects by analyzing objective data from GitHub and Google Workspace.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  - Student Dashboard (scores, timeline, insights)           │
│  - Educator Dashboard (team overview, flags)                │
│  - Integration Setup (GitHub, Google Docs)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (FastAPI)                          │
│  ✓ Authentication (OAuth 2.0)                              │
│  ✓ Authorization (Role-based access)                       │
│  ✓ Rate limiting & validation                              │
│  ✓ CORS & Security headers                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌────────┐     ┌──────────┐    ┌──────────┐
    │Projects│     │Integrations  │  Scores  │
    │Teams   │     │Sync Status   │ Analysis │
    │Members │     │Configuration │ Flags    │
    └────────┘     └──────────────┘    └──────────┘
        │                │                    │
        └────────────────┼────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │   PostgreSQL Database               │
        │  • Users & Auth                     │
        │  • Projects & Teams                 │
        │  • Integrations & Events            │
        │  • AI Analyses & Scores             │
        │  • Sync Jobs & Status               │
        └─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌────────┐     ┌──────────┐    ┌──────────┐
    │Workers │     │Beat      │    │Scheduler │
    │(Sync)  │     │(Periodic)│    │(DB)      │
    └────────┘     └──────────┘    └──────────┘
        │
        ├──▶ GitHub API      ──▶ Commits, PRs, Reviews
        │
        ├──▶ Google API      ──▶ Doc edits, timestamps
        │
        └──▶ Gemini API      ──▶ Quality scoring, flags
```

---

## Component Architecture

### 1. Frontend Layer (Next.js)

**Tech Stack:**
- Next.js 16 (React 19, Server Components)
- TypeScript
- Tailwind CSS
- Recharts for visualizations
- next-auth for session management

**Key Pages:**
- `/` - Landing page
- `/login` - OAuth redirect
- `/dashboard` - Student personal dashboard
- `/educator/*` - Educator dashboard & management
- `/auth/callback` - OAuth callback handler

**State Management:**
- Auth context (React Context)
- API client with axios/fetch wrapper
- URL-based state (next/navigation)

---

### 2. API Gateway (FastAPI)

**Architecture:**
- Async request handling
- Dependency injection for auth & DB
- Router-based modular structure
- OpenAPI/Swagger documentation

**Routers:**

| Router | Purpose | Auth |
|--------|---------|------|
| `/auth` | OAuth flows, JWT | None (returns token) |
| `/institutions` | Org management | Admin only |
| `/projects` | Course management | Educator/Student |
| `/teams` | Team CRUD + members | Educator/Student |
| `/integrations` | Source connections | Educator/Student |
| `/scores` | Analysis & results | Student/Educator |

**Security Layers:**
1. HTTPBearer token validation
2. JWT decode & payload extraction
3. User lookup in database
4. Role-based permission checks
5. Resource ownership verification

---

### 3. Data Access Layer

**Database Design:**

```
Users (central identity)
├── OAuthAccount (GitHub, Google credentials)
├── InstitutionMember (org roles)
├── TeamMember (project participation)
└── ContributionScore (results)

Projects (course containers)
├── Team (group entities)
│   ├── TeamMember (students)
│   ├── Integration (data sources)
│   │   ├── ContributionEvent (raw data)
│   │   │   ├── AIAnalysis (Gemini results)
│   │   │   └── SyncJob (tracking)
│   │   └── ContributionScore (computed)
```

**Async SQLAlchemy:**
- Async engine with asyncpg
- Connection pooling (size=20, overflow=10)
- Relationship lazy-loading with selectinload()
- JSON column for event_data storage

---

### 4. Background Job System (Celery)

**Architecture:**
- Redis as broker + result backend
- Synchronous worker processes
- Async-to-sync bridge for DB calls
- Beat scheduler for periodic tasks

**Task Flow:**

```
Periodic Task (hourly)
  ▼
sync_all_integrations
  ├── Query all Integration records
  ├── For each: dispatch sync_integration task
  └── sync_integration
      ├── Decrypt OAuth token
      ├── Call GitHub/Google API
      ├── Transform data → ContributionEvent
      ├── Store in DB
      └── Update SyncJob status

Manual Trigger: /teams/{team_id}/analyze
  ▼
analyze_team
  ├── Query unanalyzed ContributionEvents
  ├── For each: call GeminiService.analyze_*()
  ├── Store AIAnalysis results
  ├── _recompute_team_scores()
  │   ├── For each team member:
  │   ├── Calculate quantity/quality/consistency
  │   ├── Apply 30/50/20 weights
  │   ├── Determine role classification
  │   └── Update ContributionScore table
  └── Return summary
```

**Retries & Error Handling:**
- 3 retries with exponential backoff
- Failed jobs logged to database
- Worker health monitoring via Redis

---

### 5. AI Analysis Engine (Gemini)

**Integration Points:**

```
GeminiService.analyze_commit()
  Input: Code diff, message, stats
  ├── Prompt: COMMIT_ANALYSIS_PROMPT
  ├── Output: {significance, complexity, quality, flags}
  └── Stores in AIAnalysis table

GeminiService.analyze_doc_contribution()
  Input: Edit count, time span, author
  ├── Prompt: DOC_ANALYSIS_PROMPT
  ├── Output: {volume, consistency, quality, flags}
  └── Stores in AIAnalysis table
```

**Flags Detected:**
- `trivial`: Formatting-only or whitespace changes
- `copy_paste`: Suspicious code block repetition
- `last_minute`: Clustering near deadline

**Scoring Logic:**
- 1-10 scale for each dimension
- Aggregated to 0-100 overall score
- Average of multiple analyses per student

---

### 6. Scoring Algorithm

**Input:**
- All ContributionEvents for a student in a team
- Corresponding AIAnalysis records (quality)

**Computation:**

```python
Quantity Score (0-100):
  events_per_student / max_events_in_team * 100

Quality Score (0-100):
  average of all AIAnalysis.quality_score values

Consistency Score (0-100):
  1 - coefficient_of_variation(event_timestamps)
  # Events spread evenly over time = high score

Final Score (0-100):
  (quantity * 0.30) + (quality * 0.50) + (consistency * 0.20)

Contribution %:
  student_score / sum_all_scores * 100

Role Classification:
  team_avg = mean(all_students_final_scores)
  
  if score >= team_avg * 1.20: "leader"
  if score >= team_avg * 0.80: "contributor"
  if score >= team_avg * 0.40: "passive"
  if score < team_avg * 0.40: "free_rider"
```

---

## Data Flow

### New Project Setup

```
1. Educator creates project
   POST /projects → Project record created

2. Educator creates team
   POST /projects/{id}/teams → Team record created

3. Educator adds students
   POST /teams/{id}/members → TeamMember records

4. Educator connects GitHub repo
   POST /teams/{id}/integrations
   {type: "github_repo", external_id: "owner/repo"}
   
5. System fetches OAuth token
   OAuthAccount.access_token (decrypted)

6. Educator connects Google Doc
   Similar flow with google_doc type
```

### Automated Data Collection

```
Every hour (Celery Beat):
  1. sync_all_integrations() dispatches tasks
  2. For each integration:
     a. Fetch new commits/edits since last sync
     b. Create ContributionEvent records
     c. Update SyncJob tracking
     d. If any new events: trigger analyze_team

Human-triggered analysis:
  1. POST /teams/{id}/analyze
  2. analyze_team(team_id) dispatches to Celery
  3. Gets unanalyzed events
  4. Calls Gemini API for each
  5. Stores AIAnalysis results
  6. Recomputes contribution scores
  7. Returns updated scores
```

### Dashboard Display

```
Student sees:
  - Personal score breakdown
  - Daily activity timeline
  - Role classification
  - How score was calculated
  - Peer anonymized scores

Educator sees:
  - All students' scores per team
  - Comparison charts
  - Flagged suspicious behavior
  - Sync status
  - Last analysis timestamp
```

---

## Security Architecture

### Authentication Flow

```
Frontend                                Backend
   │
   │─ Click "Login with GitHub"
   │   Redirect to GitHub OAuth
   │
   ├─ GitHub redirects with code
   │
   └─▶ POST /auth/github/callback
       │
       ├─ Exchange code for access_token
       ├─ Fetch user profile from GitHub
       ├─ Find/create User record
       ├─ Encrypt & store access_token
       ├─ Generate JWT token
       │
       └─ Return JWT + user info
       
       Store JWT in localStorage/cookie
       
   ├─ Include JWT in all API requests
   │   Authorization: Bearer {jwt}
   │
   └─ On each request:
       ├─ Validate JWT signature
       ├─ Verify expiration
       ├─ Extract user_id
       ├─ Load User from DB
       └─ Check role/permissions
```

### Token Security

- **OAuth Tokens**: Encrypted at rest (Fernet)
- **JWT Tokens**: Signed with SECRET_KEY (HS256)
- **Refresh Tokens**: Stored encrypted in DB
- **API Keys**: Environment variables only (never in code)

### Access Control

```
Anonymous:
  ✓ GET /auth/github
  ✓ GET /auth/google
  ✓ POST /auth/*/callback

Student:
  ✓ GET /projects (own teams)
  ✓ GET /projects/{id}/dashboard (own)
  ✓ GET /teams/{id}/scores
  ✓ GET /teams/{id}/contributions
  ✗ POST /projects (create)
  ✗ DELETE /teams/{id}/members

Educator:
  ✓ GET /projects (created)
  ✓ POST /projects (create)
  ✓ POST /teams (create)
  ✓ POST /teams/{id}/members (manage)
  ✓ POST /teams/{id}/integrations (connect)
  ✓ POST /teams/{id}/analyze (trigger)
  ✓ GET /projects/{id}/dashboard (all)

Admin:
  ✓ Everything above
  ✓ POST /institutions (create orgs)
  ✓ DELETE /institutions/{id}/members
```

---

## Deployment Topology

### Development

```
Docker Compose (localhost)
├── FastAPI (8000)
├── Next.js (3000)
├── PostgreSQL (5432)
├── Redis (6379)
├── Celery Worker
└── Celery Beat
```

### Production (Render + Vercel)

```
Vercel
├── Next.js Frontend
└── Static assets

Render
├── PostgreSQL Database
├── Redis Cache
├── FastAPI Service (Web)
├── Celery Worker (Background)
└── Celery Beat (Scheduler)

External Services
├── GitHub OAuth
├── Google OAuth
├── Gemini API
└── GitHub/Google Data APIs
```

---

## Performance Considerations

### Database

- Async SQLAlchemy with connection pooling
- Indices on:
  - `contributions_events(integration_id, event_type)`
  - `contribution_events(user_id, occurred_at)`
  - `contribution_scores(team_id, user_id)`
- JSONB for flexible event_data
- Partitioning by time if needed (future)

### Caching

- Redis for Celery result backend
- Session tokens cached per request
- OAuth tokens cached in memory (encrypted)

### API Optimization

- FastAPI async handlers
- Lazy loading relationships (selectinload)
- Pagination on large result sets
- Query optimization with EXPLAIN

### Background Jobs

- 4 concurrent Celery workers
- Max 1000 tasks per worker
- 3600s task timeout
- Exponential backoff on retry

---

## Monitoring & Observability

### Logging

- Structured logging with JSON format
- Log levels: DEBUG, INFO, WARNING, ERROR
- Celery task logging
- Database query logging (DEBUG mode)

### Metrics

- API request/response times
- Database query performance
- Celery task success/failure rates
- Sync job statistics
- AI analysis quality metrics

### Health Checks

```
/health → Generic health check
/docs → OpenAPI documentation

Service Health:
- Database: pg_isready
- Redis: redis-cli ping
- API: HEAD /health
```

---

## Scalability

### Horizontal Scaling

1. **Frontend**: Deploy multiple instances on Vercel (automatic)
2. **Backend**: Load balance multiple API instances
3. **Workers**: Scale Celery workers independently
4. **Database**: Connection pooling handles concurrency

### Vertical Scaling

1. Increase worker concurrency (default: 4)
2. Increase connection pool size
3. Upgrade database instance
4. Cache frequently accessed data

### Data Growth

- Archive old sync jobs
- Partition contribution_events by date
- Aggregate daily statistics
- Cache pre-computed dashboards

---

## Future Enhancements

### Phase 2

- [ ] Real-time WebSocket updates
- [ ] Figma integration for design contributions
- [ ] Advanced analytics & dashboards
- [ ] Bulk student import/export
- [ ] Custom scoring algorithms
- [ ] Email notifications
- [ ] Calendar event sync

### Phase 3

- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Blockchain verification (optional)
- [ ] Plugin system for custom integrations
- [ ] Audit logs & compliance reporting
- [ ] Advanced ML for pattern detection

---

## Troubleshooting

### Common Issues

1. **Slow sync**: Check GitHub API rate limits, increase timeout
2. **Memory issues**: Reduce Celery worker concurrency
3. **JWT expired**: Refresh token (implement refresh endpoint)
4. **Database connection refused**: Check PostgreSQL health
5. **Gemini API failing**: Check API key, model availability

### Debug Commands

```bash
# Check Celery tasks
celery -A app.workers.celery_app inspect active

# View Redis keys
redis-cli KEYS '*'

# Test database
psql postgresql://user:pass@host/db -c "SELECT 1"

# View API docs
curl http://localhost:8000/openapi.json | jq
```

---

Last Updated: January 2024
Architecture Version: 1.0
