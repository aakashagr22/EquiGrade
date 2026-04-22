# EquiGrade

**AI-Powered Group Project Contribution Evaluator**

EquiGrade replaces subjective peer reviews with objective, data-driven contribution analysis. It integrates with GitHub and Google Workspace, uses Gemini AI to evaluate quality, and produces fair, transparent scores for every team member.

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Next.js Frontend│────▶│  FastAPI Backend  │────▶│  PostgreSQL  │
│  (Vercel)        │     │  (Render/Docker)  │     │  (Supabase)  │
└──────────────────┘     └────────┬─────────┘     └──────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ GitHub   │ │ Google   │ │ Gemini   │
              │ API      │ │ Drive API│ │ AI       │
              └──────────┘ └──────────┘ └──────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis (for background jobs)

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker (Full Stack)
```bash
cp backend/.env.example backend/.env
docker compose up -d
```

## 📁 Project Structure

```
EquiGrade/
├── frontend/          # Next.js App Router + Tailwind CSS
│   ├── src/app/       # Pages and layouts
│   ├── src/lib/       # API client, types, utilities
│   └── src/components # Reusable UI components
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── routers/   # API endpoints
│   │   ├── models/    # Database ORM models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # GitHub, Google, Gemini, Scoring
│   │   └── workers/   # Celery background tasks
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔑 Environment Variables

See `backend/.env.example` and `frontend/.env.local.example` for required configuration.

Key variables:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth App
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth
- `GEMINI_API_KEY` — Google AI Studio API key
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key

## 📊 Scoring Algorithm

| Dimension    | Weight | Description |
|-------------|--------|-------------|
| **Quality**     | 50%    | Gemini AI analysis of code significance, complexity, and style |
| **Quantity**    | 30%    | Total contributions normalized against most active member |
| **Consistency** | 20%    | Distribution of work over project timeline |

### Role Classifications
- **Leader** (≥120% of team avg) — Top contributor
- **Contributor** (≥80%) — Solid participation
- **Passive** (≥40%) — Below average
- **Free Rider** (<40%) — Minimal contribution

## 📄 License

MIT Hello
# EquiGrade
