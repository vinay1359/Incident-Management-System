"""
Redis-backed debounce logic.

Key: f"debounce:{component_id}"   TTL: 10 seconds

- Key EXISTS  → return the stored work_item_id (do NOT create a new Work Item)
- Key ABSENT  → caller should create a new Work Item, then call set_debounce()
"""

from __future__ import annotations

import logging

from app.config import settings

logger = logging.getLogger("ims.debouncer")

TTL = settings.DEBOUNCE_TTL_SECONDS


async def get_debounce(redis, component_id: str) -> str | None:
    """Return the work_item_id if a debounce key exists, else None."""
    key = f"debounce:{component_id}"
    val = await redis.get(key)
    if val is not None:
        return val.decode() if isinstance(val, bytes) else val
    return None


async def set_debounce(redis, component_id: str, work_item_id: str) -> None:
    """Set the debounce key with the configured TTL."""
    key = f"debounce:{component_id}"
    await redis.set(key, work_item_id, ex=TTL)
    logger.debug("Debounce set: %s → %s (TTL=%ss)", key, work_item_id, TTL)
