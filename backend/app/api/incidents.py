"""
Incident CRUD + state transition + RCA endpoints.

GET    /api/incidents               → list Work Items
GET    /api/incidents/{id}          → detail + linked signals from MongoDB
PATCH  /api/incidents/{id}/status   → state transition
POST   /api/incidents/{id}/rca      → submit RCA
GET    /api/incidents/{id}/rca      → get RCA
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.state_machine import (
    InvalidTransitionError,
    RCAIncompleteError,
    get_state,
)
from app.db.mongo import get_mongo_db
from app.db.postgres import async_session
from app.db.redis_client import get_redis
from app.models.pg_models import (
    IncidentStatus,
    RCA,
    RootCauseCategory,
    WorkItem,
)

router = APIRouter()


# ─── Request / response schemas ─────────────────────────────────────

class StatusTransitionRequest(BaseModel):
    target_status: str


class RCARequest(BaseModel):
    incident_start: datetime
    incident_end: datetime
    root_cause_category: str
    fix_applied: str = Field(..., min_length=20)
    prevention_steps: str = Field(..., min_length=20)


# ─── Helpers ────────────────────────────────────────────────────────

SEVERITY_ORDER = {"P0": 0, "P1": 1, "P2": 2}


async def _invalidate_dashboard_cache() -> None:
    """Delete the dashboard cache so the next read rebuilds it."""
    try:
        redis = await get_redis()
        await redis.delete("dashboard:state")
    except Exception:
        pass


async def _cache_work_item(wi_dict: dict) -> None:
    """Write Work Item summary into Redis."""
    try:
        redis = await get_redis()
        key = f"incident:{wi_dict['id']}"
        await redis.set(key, json.dumps(wi_dict, default=str), ex=60)
        await _invalidate_dashboard_cache()
    except Exception:
        pass


# ─── LIST incidents ─────────────────────────────────────────────────

@router.get("/api/incidents", summary="List all incidents")
async def list_incidents():
    redis = await get_redis()

    # Try dashboard cache first
    cached = await redis.get("dashboard:state")
    if cached:
        return json.loads(cached)

    # Fall back to PostgreSQL
    async with async_session() as session:
        result = await session.execute(select(WorkItem))
        items = result.scalars().all()

    data = [wi.to_dict() for wi in items]
    # Sort: P0 first, then newest first within same severity
    data.sort(key=lambda d: (SEVERITY_ORDER.get(d["severity"], 99), d["created_at"] or ""), reverse=False)
    data.sort(key=lambda d: SEVERITY_ORDER.get(d["severity"], 99))

    # Cache for 5 seconds
    await redis.set("dashboard:state", json.dumps(data, default=str), ex=5)

    return data


# ─── GET incident detail ────────────────────────────────────────────

@router.get("/api/incidents/{incident_id}", summary="Get incident detail")
async def get_incident(incident_id: str):
    redis = await get_redis()

    # Try Redis first
    cached = await redis.get(f"incident:{incident_id}")
    wi_dict = None
    if cached:
        wi_dict = json.loads(cached)

    if wi_dict is None:
        async with async_session() as session:
            result = await session.execute(
                select(WorkItem).where(WorkItem.id == uuid.UUID(incident_id))
            )
            wi = result.scalar_one_or_none()
            if wi is None:
                raise HTTPException(status_code=404, detail="Incident not found")
            wi_dict = wi.to_dict()

    # Fetch linked signals from MongoDB
    db = await get_mongo_db()
    cursor = db["signals"].find(
        {"work_item_id": incident_id},
        {"_id": 0},
    ).sort("timestamp", -1)
    signals = await cursor.to_list(length=500)

    # Serialize datetimes in signals
    for sig in signals:
        if "timestamp" in sig and isinstance(sig["timestamp"], datetime):
            sig["timestamp"] = sig["timestamp"].isoformat()

    return {**wi_dict, "signals": signals}


# ─── PATCH status transition ────────────────────────────────────────

@router.patch(
    "/api/incidents/{incident_id}/status",
    summary="Transition incident status",
)
async def transition_status(incident_id: str, body: StatusTransitionRequest):
    try:
        target = IncidentStatus(body.target_status)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid target_status '{body.target_status}'.",
        )

    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(WorkItem)
                .with_for_update()
                .options(selectinload(WorkItem.rca))
                .where(WorkItem.id == uuid.UUID(incident_id))
            )
            wi = result.scalar_one_or_none()
            if wi is None:
                raise HTTPException(status_code=404, detail="Incident not found")

            current_state = get_state(wi.status)
            try:
                current_state.transition(target, rca=wi.rca)
            except InvalidTransitionError as e:
                raise HTTPException(status_code=422, detail=str(e))
            except RCAIncompleteError as e:
                raise HTTPException(status_code=422, detail=str(e))

            wi.status = target
            wi.updated_at = datetime.now(timezone.utc)

            wi_dict = wi.to_dict()

    await _cache_work_item(wi_dict)
    return wi_dict


# ─── POST submit RCA ────────────────────────────────────────────────

@router.post(
    "/api/incidents/{incident_id}/rca",
    status_code=status.HTTP_201_CREATED,
    summary="Submit RCA",
)
async def submit_rca(incident_id: str, body: RCARequest):
    # Validate root cause category
    try:
        rcc = RootCauseCategory(body.root_cause_category)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid root_cause_category '{body.root_cause_category}'.",
        )

    if len(body.fix_applied.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="fix_applied must be at least 20 characters.",
        )
    if len(body.prevention_steps.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="prevention_steps must be at least 20 characters.",
        )
    if body.incident_end < body.incident_start:
        raise HTTPException(
            status_code=422,
            detail="incident_end cannot be before incident_start.",
        )

    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(WorkItem)
                .with_for_update()
                .where(WorkItem.id == uuid.UUID(incident_id))
            )
            wi = result.scalar_one_or_none()
            if wi is None:
                raise HTTPException(status_code=404, detail="Incident not found")

            # Check for existing RCA
            existing = await session.execute(
                select(RCA).where(RCA.work_item_id == uuid.UUID(incident_id))
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="RCA already exists.")

            rca = RCA(
                id=uuid.uuid4(),
                work_item_id=wi.id,
                incident_start=body.incident_start,
                incident_end=body.incident_end,
                root_cause_category=rcc,
                fix_applied=body.fix_applied,
                prevention_steps=body.prevention_steps,
                submitted_at=datetime.now(timezone.utc),
            )
            session.add(rca)

            # Auto-calculate MTTR
            mttr = (body.incident_end - wi.start_time).total_seconds()
            wi.mttr_seconds = mttr
            wi.end_time = body.incident_end
            wi.updated_at = datetime.now(timezone.utc)

            rca_dict = rca.to_dict()
            wi_dict = wi.to_dict()

    await _cache_work_item(wi_dict)
    return rca_dict


# ─── GET RCA ────────────────────────────────────────────────────────

@router.get("/api/incidents/{incident_id}/rca", summary="Get RCA")
async def get_rca(incident_id: str):
    async with async_session() as session:
        result = await session.execute(
            select(RCA).where(RCA.work_item_id == uuid.UUID(incident_id))
        )
        rca = result.scalar_one_or_none()
        if rca is None:
            raise HTTPException(status_code=404, detail="RCA not found")
        return rca.to_dict()
