"""
asyncio.Queue-based backpressure buffer.

Max size: 50,000 items.
If the queue is full, the signal is dropped with a warning — never crash.
"""

from __future__ import annotations

import asyncio
import logging

from app.config import settings

logger = logging.getLogger("ims.buffer")

# Singleton queue — initialised lazily
_queue: asyncio.Queue | None = None


def get_queue() -> asyncio.Queue:
    """Return (or create) the global signal queue."""
    global _queue
    if _queue is None:
        _queue = asyncio.Queue(maxsize=settings.QUEUE_MAX_SIZE)
        logger.info("Signal queue created (max=%d)", settings.QUEUE_MAX_SIZE)
    return _queue


def enqueue_signal(signal_dict: dict) -> bool:
    """
    Push a signal dict onto the queue.
    Returns True on success, False if the queue is full (signal dropped).
    """
    q = get_queue()
    try:
        q.put_nowait(signal_dict)
        return True
    except asyncio.QueueFull:
        logger.warning(
            "Queue full (%d items) — dropping signal for %s",
            q.qsize(),
            signal_dict.get("component_id", "?"),
        )
        return False
