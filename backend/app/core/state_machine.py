"""
State Pattern — incident lifecycle state machine.

Allowed transitions:
    OPEN → INVESTIGATING
    INVESTIGATING → RESOLVED
    RESOLVED → CLOSED  (only if RCA exists and is complete)
    CLOSED → *          always forbidden
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.models.pg_models import IncidentStatus


# ─── Custom Errors ───────────────────────────────────────────────────

class InvalidTransitionError(Exception):
    """Raised when a state transition is not allowed."""

    def __init__(self, current: str, target: str):
        self.current = current
        self.target = target
        super().__init__(
            f"Invalid transition: {current} → {target}"
        )


class RCAIncompleteError(Exception):
    """Raised when attempting RESOLVED → CLOSED without a complete RCA."""

    def __init__(self, reason: str = "RCA is missing or incomplete"):
        self.reason = reason
        super().__init__(reason)


# ─── Base State ──────────────────────────────────────────────────────

class IncidentState(ABC):
    """Abstract base for every incident state."""

    @property
    @abstractmethod
    def name(self) -> IncidentStatus:
        ...

    @abstractmethod
    def transition(
        self,
        target_state: IncidentStatus,
        rca: object | None = None,
    ) -> IncidentStatus:
        """
        Validate and return the target state.
        Raise InvalidTransitionError or RCAIncompleteError on failure.
        """
        ...


# ─── Concrete States ────────────────────────────────────────────────

class OpenState(IncidentState):
    @property
    def name(self) -> IncidentStatus:
        return IncidentStatus.OPEN

    def transition(self, target_state: IncidentStatus, rca=None) -> IncidentStatus:
        if target_state == IncidentStatus.INVESTIGATING:
            return target_state
        raise InvalidTransitionError(self.name.value, target_state.value)


class InvestigatingState(IncidentState):
    @property
    def name(self) -> IncidentStatus:
        return IncidentStatus.INVESTIGATING

    def transition(self, target_state: IncidentStatus, rca=None) -> IncidentStatus:
        if target_state == IncidentStatus.RESOLVED:
            return target_state
        raise InvalidTransitionError(self.name.value, target_state.value)


class ResolvedState(IncidentState):
    @property
    def name(self) -> IncidentStatus:
        return IncidentStatus.RESOLVED

    def transition(self, target_state: IncidentStatus, rca=None) -> IncidentStatus:
        if target_state != IncidentStatus.CLOSED:
            raise InvalidTransitionError(self.name.value, target_state.value)

        # Must have a complete RCA to close
        if rca is None:
            raise RCAIncompleteError("No RCA has been submitted for this incident.")

        fix = getattr(rca, "fix_applied", None) or ""
        prevention = getattr(rca, "prevention_steps", None) or ""

        if len(fix.strip()) < 20:
            raise RCAIncompleteError(
                f"fix_applied must be at least 20 characters (got {len(fix.strip())})."
            )
        if len(prevention.strip()) < 20:
            raise RCAIncompleteError(
                f"prevention_steps must be at least 20 characters (got {len(prevention.strip())})."
            )

        return target_state


class ClosedState(IncidentState):
    @property
    def name(self) -> IncidentStatus:
        return IncidentStatus.CLOSED

    def transition(self, target_state: IncidentStatus, rca=None) -> IncidentStatus:
        raise InvalidTransitionError(self.name.value, target_state.value)


# ─── State Map ───────────────────────────────────────────────────────

STATE_MAP: dict[IncidentStatus, IncidentState] = {
    IncidentStatus.OPEN: OpenState(),
    IncidentStatus.INVESTIGATING: InvestigatingState(),
    IncidentStatus.RESOLVED: ResolvedState(),
    IncidentStatus.CLOSED: ClosedState(),
}


def get_state(status: IncidentStatus) -> IncidentState:
    """Return the concrete IncidentState for a given status enum."""
    return STATE_MAP[status]
