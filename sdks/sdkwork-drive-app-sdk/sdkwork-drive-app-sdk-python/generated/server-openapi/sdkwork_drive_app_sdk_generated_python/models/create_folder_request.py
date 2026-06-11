from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateFolderRequest:
    id: str
    tenant_id: str
    space_id: str
    node_name: str
    operator_id: str
    parent_node_id: Optional[str] = None
