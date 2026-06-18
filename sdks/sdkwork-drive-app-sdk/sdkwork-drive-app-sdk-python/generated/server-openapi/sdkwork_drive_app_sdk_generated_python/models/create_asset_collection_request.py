from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateAssetCollectionRequest:
    title: str
    organization_id: Optional[str] = None
    description: Optional[str] = None
    collection_type: Optional[str] = None
    visibility: Optional[str] = None
