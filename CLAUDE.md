# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ATAS-Pro** is an AI-native platform connecting university students with industry experts. The system features expert discovery via vector search (pgvector), event bookings, real-time chat (Stream Chat), QR attendance tracking, and AI-generated proposals.

## Development Commands

### Full Stack (Recommended)

```bash
# Start all services (PostgreSQL, Redis, RabbitMQ, API, Celery worker)
docker-compose up --build

# Start with monitoring (Prometheus + Grafana)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```

Services when running:
- API: http://localhost:8000 (Swagger UI at `/docs`)
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5433
- RabbitMQ Management: http://localhost:15672

### Backend (Standalone)

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py                          # Uvicorn dev server on :8000

# Celery worker (separate terminal)
celery -A app.core.celery_app.celery_app worker -l info

# Tests
pytest tests/
pytest tests/ --cov=app               # With coverage
pytest tests/test_specific.py::test_name  # Single test
```

### Frontend (Standalone)

```bash
cd frontend
npm install
npm run dev                            # Dev server on :3000
npm run build && npm start             # Production build
npm run lint                           # ESLint
```

### Database Migrations

```bash
cd backend
alembic upgrade head                   # Apply all migrations
alembic revision --autogenerate -m "description"  # Generate from model changes
alembic downgrade -1                   # Roll back one step
```

See `backend/ALEMBIC_CHEATSHEET.md` for detailed migration workflows.

## Architecture

### Backend — Clean Architecture (FastAPI)

Strict layer separation; data must not cross layers sideways:

```
Router → Service → Database (Model)
                ↘ Schema (Pydantic DTO)
```

1. **`routers/`** — HTTP handlers only. Validate input, call one service, return HTTP response. No business logic.
2. **`services/`** — All business logic. Always returns Pydantic schemas (DTOs), never SQLAlchemy models.
3. **`models/`** — SQLAlchemy ORM models. Database shape only.
4. **`schemas/`** — Pydantic v2 DTOs. Input validation and output serialization.
5. **`core/`** — Infrastructure singletons: `config.py` (Pydantic Settings), `security.py` (JWT), `redis.py`, `celery_app.py`, `scheduler.py`.
6. **`tasks/`** — Celery background tasks (emails, AI proposals, reminders).
7. **`database/`** — Async SQLAlchemy session, pgvector setup.
8. **`middleware/`** — JWT auth middleware.

**Critical conventions:**
- All functions must have type hints. No `Any`.
- Services return Pydantic schemas — never expose ORM models to routers.
- All DB I/O is async/await.
- Rate limiting via FastAPI-Limiter + Redis.
- Cache-Aside pattern for Redis caching.

### Frontend — Next.js App Router

```
app/
  (admin)/   → Admin-only routes with shared layout
  (app)/     → Authenticated user routes
  (public)/  → Public-facing pages
```

- **`services/`** — Typed API client functions (one file per backend domain).
- **`hooks/`** — Custom React hooks for data fetching (SWR-based).
- **`components/`** — Grouped by domain: `admin/`, `event/`, `chat/`, `attendance/`, etc.
- Path alias `@/*` maps to the frontend root.
- Tailwind CSS 4 + Radix UI primitives for all UI.

### Key Infrastructure

| Service | Purpose | Config |
|---|---|---|
| PostgreSQL 15 + pgvector | Primary DB + vector embeddings for semantic expert search | `.env` → `DATABASE_URL` |
| Redis 7 | Caching, rate limiting, Celery result backend | `.env` → `REDIS_URL` |
| RabbitMQ 3 | Celery message broker | `.env` → `CELERY_BROKER_URL` |
| Celery | Background tasks (emails, AI, reminders) | `app/core/celery_app.py` |
| Stream Chat | Real-time mentorship/community chat | `.env` → `STREAM_*` |
| Google Gemini | LLM for embeddings & AI proposal generation | `.env` → `GEMINI_API_KEY` |
| Cloudinary | Image uploads/CDN | `.env` → `CLOUDINARY_*` |
| Resend | Transactional emails | `.env` → `RESEND_API_KEY` |
| Google OAuth | SSO authentication | `.env` → `GOOGLE_CLIENT_*` |

### Database Models (16 core)

`User`, `Profile`, `Organization`, `Skill`, `Event`, `Booking`, `Review`, `Attendance`, `Notification`, `CommunicationLog`, `EmailTemplate`, `Chat`, `Follows`, `AIModel`, `AuditLog`, `Blocklist`

Vector embeddings on `Profile` and `Skill` models enable pgvector semantic search.

### Auth Flow

1. JWT issued at login (`app/core/security.py`)
2. `middleware/` validates token on every protected request
3. Google OAuth handled in `routers/auth_router.py`
4. `admin_router.py` requires admin role check in service layer

## Environment Setup

The project requires a `.env` file at the repository root (not committed). Copy from team or set up manually with keys for: `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, JWT secrets, Gemini, Google OAuth, Cloudinary, Resend, Stream Chat.

## Specialist Agent Team

The `.claude/agents/` directory contains specialized subagents for proactive quality enforcement:

- **`api-contract-reviewer`** — Run when Pydantic schemas or API endpoints change
- **`db-reviewer`** — Run when SQLAlchemy models or Alembic migrations change
- **`frontend-reviewer`** — Run when Next.js pages/components change
- **`security-guard`** — Run when auth/middleware/router logic changes
- **`performance-detective`** — Run when service methods or DB queries change
- **`test-writer`** — Run to generate pytest tests for new endpoints/services
