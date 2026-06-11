from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .effective_permission import EffectivePermission


@dataclass
class EffectivePermissionListResponse:
    items: List[EffectivePermission]
    next_page_token: Optional[str] = None
