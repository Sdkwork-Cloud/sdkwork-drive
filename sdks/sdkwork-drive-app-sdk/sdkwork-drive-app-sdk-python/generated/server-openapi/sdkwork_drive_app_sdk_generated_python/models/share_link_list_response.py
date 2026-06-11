from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_share_link import DriveShareLink


@dataclass
class ShareLinkListResponse:
    items: List[DriveShareLink]
    next_page_token: Optional[str] = None
