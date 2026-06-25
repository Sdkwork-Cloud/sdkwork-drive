from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .node_label import NodeLabel


@dataclass
class NodeLabelListResponse:
    items: List[NodeLabel]
    next_page_token: Optional[str] = None
