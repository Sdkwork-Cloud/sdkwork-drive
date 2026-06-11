from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .change import Change


@dataclass
class ChangeListResponse:
    items: List[Change]
    next_cursor: Optional[int] = None
    next_page_token: Optional[str] = None
