from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .asset_collection import AssetCollection


@dataclass
class AssetCollectionPage:
    items: List[AssetCollection]
    next_cursor: Optional[str] = None
