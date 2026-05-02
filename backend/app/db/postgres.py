"""
Async SQLAlchemy engine + session factory for PostgreSQL.
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.pg_models import Base

logger = logging.getLogger("ims.db.postgres")

engine = create_async_engine(
    settings.POSTGRES_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("PostgreSQL tables initialised.")


async def close_db() -> None:
    await engine.dispose()
    logger.info("PostgreSQL engine disposed.")
