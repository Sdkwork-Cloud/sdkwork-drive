from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .audit_event import AuditEvent


@dataclass
class AuditEventPage:
    items: List[AuditEvent]
    page: int
    page_size: int
    total: int
