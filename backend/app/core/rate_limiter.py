"""
Token-bucket rate limiter — per-IP, max 500 req/sec.

Entirely in-memory (dict of IP → bucket).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from app.config import settings


@dataclass
class TokenBucket:
    max_tokens: int = settings.RATE_LIMIT_MAX_TOKENS
    refill_period: float = settings.RATE_LIMIT_REFILL_SECONDS
    tokens: float = field(init=False)
    last_refill: float = field(init=False)

    def __post_init__(self) -> None:
        self.tokens = float(self.max_tokens)
        self.last_refill = time.monotonic()

    def consume(self) -> bool:
        """Try to consume one token. Return True if allowed, False otherwise."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        # refill tokens proportionally
        self.tokens = min(
            self.max_tokens,
            self.tokens + elapsed * (self.max_tokens / self.refill_period),
        )
        self.last_refill = now

        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


# Per-IP buckets
_buckets: dict[str, TokenBucket] = {}


def is_rate_limited(ip: str) -> bool:
    """Return True if the IP has exceeded its rate limit."""
    if ip not in _buckets:
        _buckets[ip] = TokenBucket()
    return not _buckets[ip].consume()
