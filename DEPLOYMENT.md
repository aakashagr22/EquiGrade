# EquiGrade Deployment Guide

## Quick Start (Development)

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for frontend)

### Local Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd EquiGrade

# Create environment file
cp .env.example .env

# Start services with docker-compose
docker-compose up -d

# Backend runs on http://localhost:8000
# Frontend runs on http://localhost:3000
```

### Access Points

- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (postgres)
- **Redis**: localhost:6379

---

## Production Deployment

### Option 1: Docker Compose (All-in-One)

```bash
# Build and run with production config
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Option 2: Render.com (Backend)

#### Step 1: Create PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `equigrade-postgres`
   - Database: `equigrade`
   - User: `postgres`
4. Save connection details

#### Step 2: Create Redis Cache

1. Click "New +" → "Redis"
2. Configure:
   - Name: `equigrade-redis`
3. Save connection URL

#### Step 3: Deploy Backend Service

1. Connect GitHub repo
2. Click "New +" → "Web Service"
3. Configure:
   - Name: `equigrade-backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   ```
   DATABASE_URL=postgresql+psycopg2://user:pass@hostname/equigrade
   REDIS_URL=redis://:password@hostname:port
   SECRET_KEY=<generate-random>
   GITHUB_CLIENT_ID=<your-id>
   GITHUB_CLIENT_SECRET=<your-secret>
   GOOGLE_CLIENT_ID=<your-id>
   GOOGLE_CLIENT_SECRET=<your-secret>
   GEMINI_API_KEY=<your-key>
   FRONTEND_URL=<your-frontend-url>
   DEBUG=false
   ```

#### Step 4: Deploy Celery Worker

1. Click "New +" → "Background Worker"
2. Configure:
   - Name: `equigrade-worker`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `celery -A app.workers.celery_app worker --loglevel=info`
3. Add same environment variables as backend

### Option 3: Vercel (Frontend)

1. Go to https://vercel.com
2. Import GitHub repository
3. Configure:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Add Environment Variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   ```
5. Deploy

---

## Database Migrations

### Create Migration

```bash
# From backend directory
alembic revision --autogenerate -m "description"
```

### Apply Migrations

```bash
# Automatic on startup (configured in docker-compose)
alembic upgrade head
```

---

## Environment Variables

See `.env.example` for all available configuration options.

### Critical Production Settings

- **SECRET_KEY**: Generate with `openssl rand -hex 32`
- **ENCRYPTION_KEY**: Generate with `openssl rand -hex 32`
- **DEBUG**: Always set to `false`
- **ENVIRONMENT**: Set to `production`
- **JWT_EXPIRATION_MINUTES**: Adjust based on security needs (default: 1440 = 24h)

---

## API Integration

### Authentication Flow

```
1. Frontend calls /api/auth/github or /api/auth/google
2. User redirects to OAuth provider
3. Provider redirects to /auth/{provider}/callback
4. Backend exchanges code for token, creates/updates user
5. Returns JWT token to frontend
6. Frontend stores JWT in localStorage
7. Include JWT in Authorization header for all API calls
```

### Example API Call

```javascript
const response = await fetch('http://localhost:8000/api/projects', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

---

## Monitoring & Logs

### View Container Logs

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f worker
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Health Checks

All services include health checks:
- Backend: GET /health
- PostgreSQL: pg_isready
- Redis: redis-cli ping

---

## Data Sync & Analysis Pipeline

### Workflow

1. **User connects integration** → Integration stored in DB
2. **Periodic sync** (every hour) → Celery Beat dispatches sync_all_integrations
3. **sync_integration task**:
   - Fetches GitHub commits or Google Docs edits
   - Stores as ContributionEvents
4. **analyze_team task** (manual trigger):
   - Gets unanalyzed events
   - Calls Gemini API for quality scoring
   - Stores AIAnalysis results
   - Computes contribution scores
5. **Dashboard displays** → Real scores and flags

### Manual Trigger

```bash
curl -X POST "http://localhost:8000/api/teams/{team_id}/analyze" \
  -H "Authorization: Bearer {jwt_token}"
```

---

## Troubleshooting

### Connection Refused

```bash
# Ensure all services are healthy
docker-compose -f docker-compose.prod.yml ps

# Check service health
docker-compose -f docker-compose.prod.yml logs postgres
```

### Database Migration Errors

```bash
# Reset database (WARNING: Deletes all data)
docker-compose -f docker-compose.prod.yml exec postgres \
  dropdb -U postgres equigrade
docker-compose -f docker-compose.prod.yml exec postgres \
  createdb -U postgres equigrade

# Re-run migrations
docker-compose -f docker-compose.prod.yml exec backend \
  alembic upgrade head
```

### Celery Task Not Running

```bash
# Check worker logs
docker-compose -f docker-compose.prod.yml logs worker

# Verify Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

---

## Performance Optimization

### Backend

- Use connection pooling (configured in SQLAlchemy)
- Celery worker concurrency: 4-8 workers per CPU core
- Redis caching for frequently accessed data

### Frontend

- Next.js automatic code splitting
- Image optimization with next/image
- CSS-in-JS (Tailwind) with tree-shaking

### Database

- Configured indices on frequently queried columns
- Async SQLAlchemy with connection pooling
- PostgreSQL native JSON support for event_data

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY (32+ chars, random)
- [ ] Enable HTTPS in production
- [ ] Set CORS allowed origins properly
- [ ] Use environment variables for secrets (never commit)
- [ ] Enable database backups
- [ ] Monitor API rate limiting
- [ ] Validate all user inputs
- [ ] Use read-only OAuth permissions

---

## Support & Documentation

- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **GitHub**: [repo-link]
- **Issues**: [GitHub Issues]
