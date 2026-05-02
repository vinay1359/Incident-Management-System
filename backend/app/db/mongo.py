"""
Motor (async MongoDB) client.
"""

from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

logger = logging.getLogger("ims.db.mongo")

_client: AsyncIOMotorClient | None = None
_db = None


async def get_mongo_db():
    """Return the Motor database handle, creating the client on first call."""
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGO_URL)
        _db = _client[settings.MONGO_DB]
        # Create an index for fast queries by component_id + timestamp
        signals_col = _db["signals"]
        await signals_col.create_index(
            [("component_id", 1), ("timestamp", -1)]
        )
        await signals_col.create_index("work_item_id")
        logger.info("MongoDB client connected → %s", settings.MONGO_DB)
    return _db


async def close_mongo() -> None:
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB client closed.")
