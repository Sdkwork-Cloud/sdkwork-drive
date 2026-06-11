from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DriveComment:
    id: str
    tenant_id: str
    node_id: str
    content: str
    resolved: bool
    lifecycle_status: str
    version: int
    created_by: str
    updated_by: str
    created_at: str
    updated_at: str
    anchor: Optional[str] = None
