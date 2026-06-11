from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DriveNode:
    id: str
    tenant_id: str
    space_id: str
    node_type: str
    node_name: str
    lifecycle_status: str
    version: int
    parent_node_id: Optional[str] = None
    shortcut_target_node_id: Optional[str] = None
    scene: Optional[str] = None
    source: Optional[str] = None
