from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MoveNodeRequest:
    tenant_id: str
    target_parent_node_id: Optional[str] = None
    operator_id: Optional[str] = None
