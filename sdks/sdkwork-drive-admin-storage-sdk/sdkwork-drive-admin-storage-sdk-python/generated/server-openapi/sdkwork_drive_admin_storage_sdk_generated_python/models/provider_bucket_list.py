from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_bucket_list_item import ProviderBucketListItem


@dataclass
class ProviderBucketList:
    provider_id: str
    configured_bucket: str
    items: List[ProviderBucketListItem]
