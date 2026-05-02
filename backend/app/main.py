"""
FastAPI application entry-point.

- Registers all routers.
- Starts background worker + observability task on startup.
- Gracefully shuts down DB connections on shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api.health import router as health_router
from app.api.health import update_metrics
from app.api.incidents import router as incidents_router
from app.api.ingest import router as ingest_router
from app.config import settings
from app.core.buffer import get_queue
from app.db.mongo import close_mongo, get_mongo_db
from app.db.postgres import async_session, close_db, init_db
from app.db.redis_client import close_redis
from app.models.pg_models import IncidentStatus, WorkItem
from app.workers.signal_worker import get_and_reset_counter, signal_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger("ims.main")


# ─── Observability background task ──────────────────────────────────

async def observability_loop() -> None:
    """Print throughput every 5 seconds."""
    while True:
        await asyncio.sleep(settings.METRICS_INTERVAL_SECONDS)
        processed = await get_and_reset_counter()
        sps = processed / settings.METRICS_INTERVAL_SECONDS
        q = get_queue()

        # Count active incidents
        try:
            async with async_session() as session:
                result = await session.execute(
                    select(func.count())
                    .select_from(WorkItem)
                    .where(WorkItem.status.in_([
                        IncidentStatus.OPEN,
                        IncidentStatus.INVESTIGATING,
                    ]))
                )
                active = result.scalar() or 0
        except Exception:
            active = -1

        update_metrics(sps, active)

        logger.info(
            "Throughput: %.1f signals/sec | Queue depth: %d | Active incidents: %d",
            sps,
            q.qsize(),
            active,
        )


# ─── Lifespan ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await get_mongo_db()

    worker_task = asyncio.create_task(signal_worker())
    metrics_task = asyncio.create_task(observability_loop())
    logger.info("🚀 IMS Backend is ready")

    yield

    # Shutdown
    worker_task.cancel()
    metrics_task.cancel()
    await close_db()
    await close_mongo()
    await close_redis()
    logger.info("🛑 IMS Backend shut down")


# ─── App ────────────────────────────────────────────────────────────

app = FastAPI(
    title="Incident Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# Security: CORS origins from environment variable
# Default allows localhost for development; production should set IMS_ALLOWED_ORIGINS
_ALLOWED_ORIGINS = os.getenv(
    "IMS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=600,
)

app.include_router(ingest_router, tags=["Signals"])
app.include_router(incidents_router, tags=["Incidents"])
app.include_router(health_router, tags=["Health"])
