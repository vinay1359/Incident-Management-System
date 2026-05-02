"""
GET /health — system health and throughput metrics.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.buffer import get_queue
from app.workers.signal_worker import get_and_reset_counter

router = APIRouter()

# Rolling window — updated by the observability task, read here
_signals_per_sec: float = 0.0
_active_incidents: int = 0


def update_metrics(sps: float, active: int) -> None:
    global _signals_per_sec, _active_incidents
    _signals_per_sec = sps
    _active_incidents = active


@router.get("/health", summary="Health check")
async def health():
    q = get_queue()
    return {
        "status": "ok",
        "queue_depth": q.qsize(),
        "signals_per_sec": round(_signals_per_sec, 2),
        "active_incidents": _active_incidents,
    }
