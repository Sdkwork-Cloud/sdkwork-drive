from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .asset_item import AssetItem


@dataclass
class AssetPage:
    items: List[AssetItem]
    next_cursor: Optional[str] = None
