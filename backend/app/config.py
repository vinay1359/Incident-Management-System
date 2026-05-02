"""
Application configuration — loaded from environment variables.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    # PostgreSQL
    POSTGRES_URL: str = os.getenv(
        "POSTGRES_URL",
        "postgresql+asyncpg://ims:ims123@localhost:5432/imsdb",
    )

    # MongoDB
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "ims_signals")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Queue
    QUEUE_MAX_SIZE: int = int(os.getenv("QUEUE_MAX_SIZE", "50000"))
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "100"))

    # Debounce
    DEBOUNCE_TTL_SECONDS: int = int(os.getenv("DEBOUNCE_TTL_SECONDS", "10"))

    # Rate limiter
    RATE_LIMIT_MAX_TOKENS: int = int(os.getenv("RATE_LIMIT_MAX_TOKENS", "500"))
    RATE_LIMIT_REFILL_SECONDS: float = float(
        os.getenv("RATE_LIMIT_REFILL_SECONDS", "1.0")
    )

    # Observability
    METRICS_INTERVAL_SECONDS: int = int(os.getenv("METRICS_INTERVAL_SECONDS", "5"))


settings = Settings()
