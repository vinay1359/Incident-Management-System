"""
SQLAlchemy 2.0 async models for PostgreSQL — WorkItem and RCA tables.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


# ─── Enums ───────────────────────────────────────────────────────────

class ComponentType(str, enum.Enum):
    API = "API"
    MCP_HOST = "MCP_HOST"
    CACHE = "CACHE"
    QUEUE = "QUEUE"
    RDBMS = "RDBMS"
    NOSQL = "NOSQL"


class Severity(str, enum.Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class RootCauseCategory(str, enum.Enum):
    HARDWARE = "HARDWARE"
    SOFTWARE = "SOFTWARE"
    NETWORK = "NETWORK"
    HUMAN_ERROR = "HUMAN_ERROR"
    DEPENDENCY = "DEPENDENCY"
    UNKNOWN = "UNKNOWN"


# ─── Base ────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─── WorkItem ────────────────────────────────────────────────────────

class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(String(255), nullable=False, index=True)
    component_type = Column(Enum(ComponentType), nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(
        Enum(IncidentStatus), nullable=False, default=IncidentStatus.OPEN
    )
    signal_count = Column(Integer, nullable=False, default=1)
    start_time = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    end_time = Column(DateTime(timezone=True), nullable=True)
    mttr_seconds = Column(Float, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    rca = relationship("RCA", back_populates="work_item", uselist=False)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "component_id": self.component_id,
            "component_type": self.component_type.value if self.component_type else None,
            "severity": self.severity.value if self.severity else None,
            "status": self.status.value if self.status else None,
            "signal_count": self.signal_count,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "mttr_seconds": self.mttr_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ─── RCA ─────────────────────────────────────────────────────────────

class RCA(Base):
    __tablename__ = "rca"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("work_items.id"),
        unique=True,
        nullable=False,
    )
    incident_start = Column(DateTime(timezone=True), nullable=False)
    incident_end = Column(DateTime(timezone=True), nullable=False)
    root_cause_category = Column(Enum(RootCauseCategory), nullable=False)
    fix_applied = Column(Text, nullable=False)
    prevention_steps = Column(Text, nullable=False)
    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    work_item = relationship("WorkItem", back_populates="rca")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "work_item_id": str(self.work_item_id),
            "incident_start": self.incident_start.isoformat() if self.incident_start else None,
            "incident_end": self.incident_end.isoformat() if self.incident_end else None,
            "root_cause_category": self.root_cause_category.value if self.root_cause_category else None,
            "fix_applied": self.fix_applied,
            "prevention_steps": self.prevention_steps,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
        }
