from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_node_property import DriveNodeProperty


@dataclass
class NodePropertyListResponse:
    items: List[DriveNodeProperty]
    next_page_token: Optional[str] = None
