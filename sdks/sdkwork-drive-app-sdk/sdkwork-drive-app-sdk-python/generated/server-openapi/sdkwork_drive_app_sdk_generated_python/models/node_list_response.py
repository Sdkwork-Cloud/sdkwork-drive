from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_node import DriveNode


@dataclass
class NodeListResponse:
    items: List[DriveNode]
    next_page_token: Optional[str] = None
    incomplete_page: Optional[bool] = None
