from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_provider_binding import StorageProviderBinding


@dataclass
class StorageProviderBindingListResponse:
    items: List[StorageProviderBinding]
