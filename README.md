# Incident Management System (IMS)

A real-time system that watches your infrastructure (APIs, databases, caches, message queues) for problems, groups related error signals together, and gives your team a clean workflow to investigate, fix, and document every incident.

---

## What Does This System Do?

1. **Catches errors fast** — Takes in thousands of error signals per second from your services
2. **Groups them smartly** — If 100 errors come from the same database in 10 seconds, it creates just 1 incident (not 100)
3. **Alerts the right people** — Database down? Critical alert. Cache hiccup? Lower priority alert
4. **Tracks the fix** — Walk through each stage: Open → Investigating → Resolved → Closed
5. **Requires a post-mortem** — You can't close an incident without documenting what went wrong and how you fixed it
6. **Measures response time** — Automatically calculates how long it took to fix each incident

---

## Quick Start

```bash
git clone https://github.com/vinay1359/Incident-Management-System.git
cd ims
docker compose up --build
```

That's it. Open your browser:

| What | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

### Try It Out

Open a new terminal and run the simulation script to create some test incidents:

```bash
cd seed
pip install httpx
python simulate_failure.py
```

This sends signals for 4 different infrastructure components (RDBMS, MCP host, Cache, Queue). Thanks to debouncing, only 4 incidents get created (not 650+), demonstrating how the system groups related error signals together.

---

## Architecture

### Visual Diagram (Mermaid)

```mermaid
flowchart TD
    API[FastAPI Gateway] -->|Push Signals| Q[(asyncio.Queue)]
    Q -->|Drain in Batches| Worker[Background Worker]
    Worker -->|Read/Write Debounce Key| Redis[(Redis)]
    Worker -->|Create/Update Incidents| PG[(PostgreSQL)]
    Worker -->|Log Raw Data| Mongo[(MongoDB)]
    API -->|Fetch Feed| PG
    API -->|Fetch Telemetry| Redis
```

### ASCII Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                    │
│  ┌──────────────┐    ┌──────────────┐                                   │
│  │   React UI   │    │ Signal Source │                                  │
│  │  (Dashboard) │    │   (Services)  │                                  │
│  └──────┬───────┘    └──────┬───────┘                                   │
└─────────┼──────────────────┼───────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────┐    ┌────────────────────────────────────────┐  │   │
│  │  │  /api/       │    │  Rate Limiter (Token Bucket)          │  │   │
│  │  │  signals     │───▶│  500 req/sec per IP                   │  │   │
│  │  │  (Ingest)    │    └──────────────┬─────────────────────────┘  │   │
│  │  └──────────────┘                   │                            │   │
│  │                                     ▼                            │   │
│  │  ┌──────────────┐    ┌────────────────────────────────────────┐  │   │
│  │  │  /api/       │    │  asyncio.Queue (max 50,000)          │  │   │
│  │  │  incidents   │◀───│  Non-blocking signal buffer            │  │   │
│  │  │  (CRUD)      │    └──────────────┬─────────────────────────┘  │   │
│  │  └──────────────┘                   │                            │   │
│  │                                     ▼                            │   │
│  │  ┌──────────────┐    ┌────────────────────────────────────────┐  │   │
│  │  │   /health    │    │  Background Worker (batch=100)         │  │   │
│  │  └──────────────┘    │  • Debounce check (Redis TTL 10s)      │  │   │
│  │                      │  • Create/Update Work Items            │  │   │
│  │                      │  • Store raw signals                   │  │   │
│  │                      └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Redis 7    │    │ PostgreSQL  15│   │  MongoDB 6   │               │
│  │  ├ Debounce │    │  ├ Work Items │   │  ├ Signals   │               │
│  │  ├ Cache    │    │  ├ RCA        │   │  ├ Audit Log │               │
│  │  └ Dashboard│    │  └ MTTR       │   │  └ Raw Data  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

## How It Works

### Step by Step

1. **Signal arrives** at `POST /api/signals`
2. **Rate limiter** checks if this client is sending too many requests (max 500/sec per IP)
3. **Signal goes into a queue** (capacity: 50,000) — the API responds immediately with `202 Accepted`
4. **Background worker** picks up signals in batches of 100
5. **Debounce check** — Has this component reported errors in the last 10 seconds?
   - **Yes** → Link this signal to the existing incident, bump the signal count
   - **No** → Create a new incident, fire an alert, start the debounce timer
6. **Raw signal saved to MongoDB** (full error details, searchable)
7. **Incident saved to PostgreSQL** (structured data, transactional)
8. **Dashboard cache updated in Redis** (so the UI loads instantly)

### Why Three Databases?

Each database does what it's best at:

| Database | What It Stores | Why This One |
|---|---|---|
| **PostgreSQL** | Incidents, status changes, RCA records | Needs transactions — status changes must be reliable |
| **MongoDB** | Raw error signals (the full payloads) | High write speed, flexible structure, good for audit logs |
| **Redis** | Dashboard cache, debounce locks | Super fast reads for the UI, key expiry for debounce timing |

---

## Design Patterns

### State Pattern — Incident Lifecycle

Each incident moves through a fixed set of stages. The State Pattern makes sure you can't skip steps or go backwards:

```
OPEN → INVESTIGATING → RESOLVED → CLOSED
                                     ↑
                              (needs complete RCA)
```

- You can't jump from OPEN straight to CLOSED
- You can't re-open a CLOSED incident
- RESOLVED → CLOSED is blocked until you submit a Root Cause Analysis with proper detail

### Strategy Pattern — Smart Alerting

Different components get different alert levels automatically:

| Component Type | Alert Level | Why |
|---|---|---|
| RDBMS, API | P0 (Critical) | Core infrastructure — everything depends on these |
| MCP Host, Queue | P1 (High) | Important but may have fallbacks |
| Cache, NoSQL | P2 (Medium) | Usually degraded performance, not full outage |

Adding a new alert type is simple — just create a new strategy class. No existing code needs to change.

---

## Handling High Load

The system is built to handle bursts of 10,000+ signals per second without crashing:

1. **Queue as a shock absorber** — Signals go into a 50,000-item queue instantly. The API never waits for database writes
2. **Batch processing** — The worker processes 100 signals at a time, not one by one
3. **Graceful degradation** — If the queue fills up (databases completely unresponsive), new signals are dropped with a warning. The API stays up
4. **Retry with backoff** — Failed database writes are retried 3 times with increasing delays (0.1s, 0.5s, 2s)
5. **Rate limiting** — Token bucket algorithm prevents any single client from flooding the system

---

## Handling Backpressure

The system is designed to handle massive spikes in signal volume without crashing or overwhelming downstream databases. This is achieved through strict backpressure mechanisms:
1. **Asynchronous Queueing**: All incoming signals are instantly dumped into an in-memory `asyncio.Queue`. The HTTP response is returned immediately to the client without waiting for database operations.
2. **Batch Processing**: A dedicated background worker pulls signals from the queue in batches, significantly reducing database connection overhead and context switching.
3. **Aggressive Debouncing**: Before touching the persistent databases, the worker checks Redis. If an active incident already exists for a given component, it skips creating a new PostgreSQL row and simply increments a counter, gracefully absorbing "alert storms."
4. **Exponential Backoff**: If PostgreSQL or MongoDB experience transient latency spikes under load, the worker employs exponential backoff retries, ensuring no data is dropped while giving the database time to recover.

---

## API Reference

| Method | Endpoint | What It Does |
|---|---|---|
| `POST` | `/api/signals` | Send an error signal (returns 202) |
| `GET` | `/api/incidents` | List all incidents (sorted by severity) |
| `GET` | `/api/incidents/{id}` | Get incident details + raw signals |
| `PATCH` | `/api/incidents/{id}/status` | Move incident to next stage |
| `POST` | `/api/incidents/{id}/rca` | Submit Root Cause Analysis |
| `GET` | `/api/incidents/{id}/rca` | View the RCA for an incident |
| `GET` | `/health` | System health + throughput metrics |



## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest app/tests/ -v
```

Tests cover:
- **State transitions** — Every valid and invalid transition is tested (11 tests)
- **RCA validation** — Short text, missing RCA, complete RCA (5 tests)
- **MTTR calculation** — Normal case + edge case (instant resolution)

---

## Project Structure

```
ims/
├── backend/
│   ├── app/
│   │   ├── main.py                 # App startup, background tasks
│   │   ├── config.py               # Environment-based settings
│   │   ├── api/
│   │   │   ├── ingest.py           # POST /signals endpoint
│   │   │   ├── incidents.py        # Incident CRUD + RCA + transitions
│   │   │   └── health.py           # Health check endpoint
│   │   ├── core/
│   │   │   ├── state_machine.py    # State Pattern (lifecycle rules)
│   │   │   ├── alert_strategy.py   # Strategy Pattern (alert levels)
│   │   │   ├── buffer.py           # asyncio.Queue (backpressure)
│   │   │   ├── debouncer.py        # Redis-based signal grouping
│   │   │   └── rate_limiter.py     # Token bucket rate limiter
│   │   ├── workers/
│   │   │   └── signal_worker.py    # Background queue processor
│   │   ├── models/
│   │   │   ├── pg_models.py        # PostgreSQL tables (SQLAlchemy)
│   │   │   └── mongo_models.py     # Signal schemas (Pydantic)
│   │   ├── db/
│   │   │   ├── postgres.py         # Async PostgreSQL connection
│   │   │   ├── mongo.py            # Async MongoDB connection
│   │   │   └── redis_client.py     # Async Redis connection
│   │   └── tests/
│   │       ├── test_state.py       # State transition tests
│   │       └── test_rca.py         # RCA validation tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Routes + theme toggle
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Live incident feed
│   │   │   └── IncidentDetail.jsx  # Incident view + RCA
│   │   └── components/
│   │       ├── IncidentCard.jsx     # Single incident row
│   │       ├── RCAForm.jsx          # Root Cause Analysis form
│   │       └── SignalList.jsx       # Raw signal viewer
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml              # Full stack (5 services)
└── seed/
    └── simulate_failure.py         # Test data generator
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | FastAPI | 0.110+ |
| Task Processing | Python asyncio | 3.11 |
| Frontend | React + Vite | 18.3 / 5.3 |
| Styling | Tailwind CSS | 3.4 |
| Primary Database | PostgreSQL | 15 |
| Document Store | MongoDB | 6 |
| Cache / Pub-Sub | Redis | 7 |
| ORM | SQLAlchemy (async) | 2.0 |
| MongoDB Driver | Motor (async) | 3.3 |
| Containerization | Docker Compose | v2 |

---

## Configuration

All settings can be changed via environment variables:

| Variable | Default | What It Controls |
|---|---|---|
| `POSTGRES_URL` | `postgresql+asyncpg://ims:ims123@localhost:5432/imsdb` | PostgreSQL connection |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `QUEUE_MAX_SIZE` | `50000` | Max signals the queue can hold |
| `BATCH_SIZE` | `100` | Signals processed per batch |
| `DEBOUNCE_TTL_SECONDS` | `10` | How long to group signals together |
| `RATE_LIMIT_MAX_TOKENS` | `500` | Max requests per second per IP |
| `METRICS_INTERVAL_SECONDS` | `5` | How often to log throughput |

---

## Security & Production Considerations

### Current Security Measures

- **CORS Hardening**: Origins restricted to `IMS_ALLOWED_ORIGINS` env variable (defaults to localhost only in development)
- **Rate Limiting**: Token bucket algorithm prevents any single IP from overwhelming the system (500 req/sec)
- **No Console Leaks**: Error handling in frontend does not expose internal details via console
- **Input Validation**: All API inputs validated via Pydantic schemas

### Production Deployment Checklist

Before exposing to network:

| Item | Localhost | Production |
|---|---|---|
| Authentication | Not required | JWT or OAuth required |
| HTTPS | Optional | Mandatory |
| CORS Origins | `localhost:3000,5173` | Your actual domain(s) |
| Environment Secrets | Hardcoded defaults | Proper `.env` file |
| Database Credentials | Default passwords | Strong unique passwords |

**Note**: Currently designed for localhost/internal use. Add JWT authentication layer before production deployment.

---
