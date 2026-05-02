"""
Unit tests — state transition rules (State Pattern).
"""

import pytest

from app.core.state_machine import (
    InvalidTransitionError,
    RCAIncompleteError,
    get_state,
)
from app.models.pg_models import IncidentStatus


# ─── Valid transitions ──────────────────────────────────────────────

def test_open_to_investigating():
    state = get_state(IncidentStatus.OPEN)
    result = state.transition(IncidentStatus.INVESTIGATING)
    assert result == IncidentStatus.INVESTIGATING


def test_investigating_to_resolved():
    state = get_state(IncidentStatus.INVESTIGATING)
    result = state.transition(IncidentStatus.RESOLVED)
    assert result == IncidentStatus.RESOLVED


class _FakeRCA:
    def __init__(self, fix: str, prevention: str):
        self.fix_applied = fix
        self.prevention_steps = prevention


def test_resolved_to_closed_with_complete_rca():
    state = get_state(IncidentStatus.RESOLVED)
    rca = _FakeRCA(
        fix="Replaced the faulty disk and restored from backup",
        prevention="Added monitoring for disk I/O latency thresholds",
    )
    result = state.transition(IncidentStatus.CLOSED, rca=rca)
    assert result == IncidentStatus.CLOSED


# ─── Invalid transitions ────────────────────────────────────────────

def test_open_to_resolved_raises():
    state = get_state(IncidentStatus.OPEN)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.RESOLVED)


def test_open_to_closed_raises():
    state = get_state(IncidentStatus.OPEN)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.CLOSED)


def test_investigating_to_open_raises():
    state = get_state(IncidentStatus.INVESTIGATING)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.OPEN)


def test_investigating_to_closed_raises():
    state = get_state(IncidentStatus.INVESTIGATING)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.CLOSED)


def test_resolved_to_open_raises():
    state = get_state(IncidentStatus.RESOLVED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.OPEN)


def test_resolved_to_investigating_raises():
    state = get_state(IncidentStatus.RESOLVED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.INVESTIGATING)


# ─── CLOSED → anything is always forbidden ─────────────────────────

def test_closed_to_open_raises():
    state = get_state(IncidentStatus.CLOSED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.OPEN)


def test_closed_to_investigating_raises():
    state = get_state(IncidentStatus.CLOSED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.INVESTIGATING)


def test_closed_to_resolved_raises():
    state = get_state(IncidentStatus.CLOSED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.RESOLVED)


def test_closed_to_closed_raises():
    state = get_state(IncidentStatus.CLOSED)
    with pytest.raises(InvalidTransitionError):
        state.transition(IncidentStatus.CLOSED)
