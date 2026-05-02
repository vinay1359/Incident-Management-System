"""
Strategy Pattern — alerting strategies per severity level.
Simple logging-based alerts.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.models.pg_models import ComponentType

logger = logging.getLogger("ims.alerting")


# ─── Base Strategy ───────────────────────────────────────────────────

class AlertStrategy(ABC):
    """Abstract base for alert strategies."""

    @abstractmethod
    async def send_alert(self, work_item_dict: dict) -> None:
        """Send an alert for the given work item."""
        ...


# ─── Concrete Strategies ────────────────────────────────────────────

class P0Strategy(AlertStrategy):
    async def send_alert(self, work_item_dict: dict) -> None:
        logger.critical(
            "🔴 CRITICAL ALERT [P0] — component=%s  type=%s  id=%s",
            work_item_dict.get("component_id"),
            work_item_dict.get("component_type"),
            work_item_dict.get("id"),
        )


class P1Strategy(AlertStrategy):
    async def send_alert(self, work_item_dict: dict) -> None:
        logger.warning(
            "🟠 HIGH ALERT [P1] — component=%s  type=%s  id=%s",
            work_item_dict.get("component_id"),
            work_item_dict.get("component_type"),
            work_item_dict.get("id"),
        )


class P2Strategy(AlertStrategy):
    async def send_alert(self, work_item_dict: dict) -> None:
        logger.info(
            "🟡 MEDIUM ALERT [P2] — component=%s  type=%s  id=%s",
            work_item_dict.get("component_id"),
            work_item_dict.get("component_type"),
            work_item_dict.get("id"),
        )


# ─── Context ────────────────────────────────────────────────────────

class AlertContext:
    """Context that delegates to a chosen strategy."""

    def __init__(self) -> None:
        self._strategy: AlertStrategy | None = None

    def set_strategy(self, strategy: AlertStrategy) -> None:
        self._strategy = strategy

    async def execute(self, work_item_dict: dict) -> None:
        if self._strategy is None:
            raise RuntimeError("AlertStrategy not set")
        await self._strategy.send_alert(work_item_dict)


# ─── Mapping ────────────────────────────────────────────────────────

COMPONENT_STRATEGY_MAP: dict[str, AlertStrategy] = {
    ComponentType.RDBMS.value: P0Strategy(),
    ComponentType.API.value: P0Strategy(),
    ComponentType.MCP_HOST.value: P1Strategy(),
    ComponentType.QUEUE.value: P1Strategy(),
    ComponentType.CACHE.value: P2Strategy(),
    ComponentType.NOSQL.value: P2Strategy(),
}


async def fire_alert(work_item_dict: dict) -> None:
    """Convenience function: pick strategy from component_type and fire."""
    component_type = work_item_dict.get("component_type", "")
    strategy = COMPONENT_STRATEGY_MAP.get(component_type, P2Strategy())
    ctx = AlertContext()
    ctx.set_strategy(strategy)
    await ctx.execute(work_item_dict)
