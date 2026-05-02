"""
Pydantic v2 models for MongoDB signal documents.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class SignalDocument(BaseModel):
    """Raw signal stored in MongoDB."""

    component_id: str
    component_type: str
    severity: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    work_item_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SignalIn(BaseModel):
    """Inbound signal from HTTP POST /api/signals."""

    component_id: str
    component_type: str  # validated in the endpoint
    severity: str  # validated in the endpoint
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SignalOut(BaseModel):
    """Signal document returned to the frontend."""

    component_id: str
    component_type: str
    severity: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    work_item_id: str
    timestamp: datetime
