"""
aioredis (redis-py async) client.
"""

from __future__ import annotations

import logging

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("ims.db.redis")

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return (or create) the async Redis client."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        logger.info("Redis client connected → %s", settings.REDIS_URL)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
        logger.info("Redis client closed.")
