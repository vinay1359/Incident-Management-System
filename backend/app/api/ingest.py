"""
POST /api/signals — signal ingestion endpoint.

- Validates component_type and severity.
- Applies token-bucket rate limiter (HTTP 429).
- Pushes onto asyncio.Queue and returns HTTP 202 immediately.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.core.buffer import enqueue_signal
from app.core.rate_limiter import is_rate_limited
from app.models.mongo_models import SignalIn
from app.models.pg_models import ComponentType, Severity

router = APIRouter()

VALID_COMPONENT_TYPES = {e.value for e in ComponentType}
VALID_SEVERITIES = {e.value for e in Severity}


@router.post(
    "/api/signals",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest a signal",
)
async def ingest_signal(signal: SignalIn, request: Request):
    # ── Rate limiter ────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded — max 500 req/sec per IP.",
        )

    # ── Validate enums ──────────────────────────────────────────
    if signal.component_type not in VALID_COMPONENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid component_type '{signal.component_type}'. "
                   f"Must be one of {sorted(VALID_COMPONENT_TYPES)}.",
        )
    if signal.severity not in VALID_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid severity '{signal.severity}'. "
                   f"Must be one of {sorted(VALID_SEVERITIES)}.",
        )

    # ── Enqueue (non-blocking) ──────────────────────────────────
    accepted = enqueue_signal(signal.model_dump())
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backpressure: signal queue is full. Try again shortly.",
        )

    return {"status": "accepted"}
