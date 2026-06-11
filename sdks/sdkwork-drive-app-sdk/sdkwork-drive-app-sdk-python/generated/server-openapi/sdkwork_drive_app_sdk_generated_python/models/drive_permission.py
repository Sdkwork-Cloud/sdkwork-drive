from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DrivePermission:
    id: str
    tenant_id: str
    node_id: str
    subject_type: str
    subject_id: str
    role: str
    inherited: bool
    lifecycle_status: str
    version: int
