from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_permission import DrivePermission


@dataclass
class PermissionListResponse:
    items: List[DrivePermission]
    next_page_token: Optional[str] = None
