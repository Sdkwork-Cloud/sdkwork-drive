from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_object import ProviderObject


@dataclass
class ProviderObjectList:
    provider_id: str
    bucket: str
    items: List[ProviderObject]
    prefix: Optional[str] = None
    next_page_token: Optional[str] = None
