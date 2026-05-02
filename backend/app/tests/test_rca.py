"""
Unit tests — RCA validation logic.
"""

import pytest
from datetime import datetime, timezone, timedelta

from app.core.state_machine import (
    RCAIncompleteError,
    get_state,
)
from app.models.pg_models import IncidentStatus


class _FakeRCA:
    """Minimal RCA stand-in for unit testing."""

    def __init__(self, fix: str = "", prevention: str = ""):
        self.fix_applied = fix
        self.prevention_steps = prevention


class _FakeWorkItem:
    """Minimal WorkItem stand-in for MTTR calculation tests."""

    def __init__(self):
        self.start_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


# ─── Validation errors ──────────────────────────────────────────────

def test_rca_fix_too_short_raises():
    """fix_applied < 20 chars → RCAIncompleteError"""
    state = get_state(IncidentStatus.RESOLVED)
    rca = _FakeRCA(fix="short", prevention="This prevention step is more than enough")
    with pytest.raises(RCAIncompleteError):
        state.transition(IncidentStatus.CLOSED, rca=rca)


def test_rca_prevention_too_short_raises():
    """prevention_steps < 20 chars → RCAIncompleteError"""
    state = get_state(IncidentStatus.RESOLVED)
    rca = _FakeRCA(fix="This fix description is definitely long enough", prevention="short")
    with pytest.raises(RCAIncompleteError):
        state.transition(IncidentStatus.CLOSED, rca=rca)


def test_transition_to_closed_without_rca_raises():
    """No RCA at all → RCAIncompleteError"""
    state = get_state(IncidentStatus.RESOLVED)
    with pytest.raises(RCAIncompleteError):
        state.transition(IncidentStatus.CLOSED, rca=None)


# ─── Happy path ─────────────────────────────────────────────────────

def test_complete_rca_allows_closed():
    """Complete RCA with sufficient text → success"""
    state = get_state(IncidentStatus.RESOLVED)
    rca = _FakeRCA(
        fix="Replaced the faulty disk controller and restored from backup",
        prevention="Added proactive disk health monitoring with SMART alerts",
    )
    result = state.transition(IncidentStatus.CLOSED, rca=rca)
    assert result == IncidentStatus.CLOSED


# ─── MTTR calculation ───────────────────────────────────────────────

def test_mttr_calculated_correctly():
    """MTTR = (incident_end - start_time) in seconds."""
    wi = _FakeWorkItem()
    incident_end = datetime(2025, 1, 1, 12, 45, 30, tzinfo=timezone.utc)
    mttr = (incident_end - wi.start_time).total_seconds()
    assert mttr == 2730.0  # 45 min 30 sec = 2730 seconds


def test_mttr_zero_when_instant_resolution():
    """Edge case: incident resolved at the same instant it started."""
    wi = _FakeWorkItem()
    incident_end = wi.start_time
    mttr = (incident_end - wi.start_time).total_seconds()
    assert mttr == 0.0
