from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider import StorageProvider


@dataclass
class ListStorageProvidersResponse:
    items: List[StorageProvider]
