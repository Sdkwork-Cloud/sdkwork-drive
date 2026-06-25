from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_comment import DriveComment


@dataclass
class CommentListResponse:
    items: List[DriveComment]
    next_page_token: Optional[str] = None
