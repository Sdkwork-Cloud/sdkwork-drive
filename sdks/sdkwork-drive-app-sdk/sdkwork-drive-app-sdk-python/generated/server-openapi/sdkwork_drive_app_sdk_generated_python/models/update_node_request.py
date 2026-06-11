from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateNodeRequest:
    tenant_id: Optional[str] = None
    node_name: Optional[str] = None
    parent_node_id: Optional[str] = None
    operator_id: Optional[str] = None
