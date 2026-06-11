from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DriveShareLink:
    id: str
    tenant_id: str
    node_id: str
    role: str
    download_count: int
    lifecycle_status: str
    version: int
    expires_at_epoch_ms: Optional[int] = None
    download_limit: Optional[int] = None
