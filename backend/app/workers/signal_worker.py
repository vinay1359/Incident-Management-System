"""
Background worker that drains the asyncio.Queue in batches.

For each signal:
  1. Check Redis debounce key for the component_id.
  2. If key exists → increment signal_count on existing Work Item, insert raw signal to MongoDB.
  3. If key absent → create new Work Item in PostgreSQL, set debounce key, fire alert, insert signal to MongoDB.
  4. All DB writes use exponential backoff retry (3 attempts).
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update

from app.config import settings
from app.core.alert_strategy import fire_alert
from app.core.buffer import get_queue
from app.core.debouncer import get_debounce, set_debounce
from app.db.mongo import get_mongo_db
from app.db.postgres import async_session
from app.db.redis_client import get_redis
from app.models.pg_models import ComponentType, IncidentStatus, Severity, WorkItem

logger = logging.getLogger("ims.worker")

BATCH_SIZE = settings.BATCH_SIZE
RETRY_DELAYS = [0.1, 0.5, 2.0]


# ─── Retry helper ───────────────────────────────────────────────────

async def retry_async(coro_fn, *args, operation: str = "db_write"):
    """Call coro_fn(*args) with exponential backoff. Return result or None on total failure."""
    last_exc = None
    for attempt, delay in enumerate(RETRY_DELAYS, 1):
        try:
            return await coro_fn(*args)
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "Retry %d/%d for %s failed: %s — waiting %.1fs",
                attempt,
                len(RETRY_DELAYS),
                operation,
                exc,
                delay,
            )
            await asyncio.sleep(delay)
    logger.error("All %d retries exhausted for %s: %s", len(RETRY_DELAYS), operation, last_exc)
    return None


# ─── DB operations (each is a single-shot coroutine) ────────────────

async def _create_work_item(signal: dict) -> dict | None:
    """Insert a new WorkItem row and return its dict representation."""
    async with async_session() as session:
        async with session.begin():
            wi = WorkItem(
                id=uuid.uuid4(),
                component_id=signal["component_id"],
                component_type=ComponentType(signal["component_type"]),
                severity=Severity(signal["severity"]),
                status=IncidentStatus.OPEN,
                signal_count=1,
                start_time=datetime.now(timezone.utc),
            )
            session.add(wi)
            await session.flush()
            result = wi.to_dict()
    return result


async def _increment_signal_count(work_item_id: str) -> None:
    """Atomically bump signal_count on an existing Work Item."""
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(WorkItem)
                .where(WorkItem.id == uuid.UUID(work_item_id))
                .values(
                    signal_count=WorkItem.signal_count + 1,
                    updated_at=datetime.now(timezone.utc),
                )
            )


async def _insert_signal_doc(signal: dict, work_item_id: str) -> None:
    """Insert one raw signal document into MongoDB."""
    db = await get_mongo_db()
    doc = {
        "component_id": signal["component_id"],
        "component_type": signal["component_type"],
        "severity": signal["severity"],
        "message": signal["message"],
        "metadata": signal.get("metadata", {}),
        "work_item_id": work_item_id,
        "timestamp": datetime.now(timezone.utc),
    }
    await db["signals"].insert_one(doc)


async def _cache_work_item(redis, work_item_dict: dict) -> None:
    """Write Work Item summary into Redis (TTL 60 s)."""
    key = f"incident:{work_item_dict['id']}"
    await redis.set(key, json.dumps(work_item_dict, default=str), ex=60)


# ─── Signal counter for throughput metrics ──────────────────────────

_signal_counter: int = 0
_counter_lock = asyncio.Lock()


async def get_and_reset_counter() -> int:
    global _signal_counter
    async with _counter_lock:
        val = _signal_counter
        _signal_counter = 0
        return val


async def _inc_counter(n: int = 1) -> None:
    global _signal_counter
    async with _counter_lock:
        _signal_counter += n


# ─── Main worker loop ───────────────────────────────────────────────

BATCH_TIMEOUT_MS = 100  # Wait up to 100ms to fill batch before processing


async def signal_worker() -> None:
    """Run forever, draining the queue in batches."""
    q = get_queue()
    logger.info("Signal worker started (batch=%d, timeout=%dms)", BATCH_SIZE, BATCH_TIMEOUT_MS)

    while True:
        batch: list[dict] = []

        # Block until at least one item is available
        first = await q.get()
        batch.append(first)

        # Wait briefly to gather more items for efficient batching
        # This improves throughput for steady streams while maintaining low latency
        timeout = BATCH_TIMEOUT_MS / 1000.0
        gather_deadline = asyncio.get_event_loop().time() + timeout

        while len(batch) < BATCH_SIZE:
            remaining_timeout = gather_deadline - asyncio.get_event_loop().time()
            if remaining_timeout <= 0:
                break
            try:
                item = await asyncio.wait_for(q.get(), timeout=remaining_timeout)
                batch.append(item)
            except asyncio.TimeoutError:
                break

        redis = await get_redis()

        for signal in batch:
            try:
                component_id = signal["component_id"]

                existing_wi_id = await get_debounce(redis, component_id)

                if existing_wi_id:
                    # Debounce hit — link signal to existing Work Item
                    await retry_async(
                        _increment_signal_count, existing_wi_id,
                        operation="pg_increment",
                    )
                    await retry_async(
                        _insert_signal_doc, signal, existing_wi_id,
                        operation="mongo_insert",
                    )
                else:
                    # New Work Item
                    wi_dict = await retry_async(
                        _create_work_item, signal,
                        operation="pg_create_wi",
                    )
                    if wi_dict is None:
                        continue  # all retries failed

                    wi_id = wi_dict["id"]
                    await set_debounce(redis, component_id, wi_id)
                    await retry_async(
                        _insert_signal_doc, signal, wi_id,
                        operation="mongo_insert",
                    )
                    # Cache & alert
                    await _cache_work_item(redis, wi_dict)
                    await fire_alert(wi_dict)

            except Exception as exc:
                logger.exception("Unexpected error processing signal: %s", exc)

        await _inc_counter(len(batch))

        # Mark tasks as done
        for _ in batch:
            q.task_done()
