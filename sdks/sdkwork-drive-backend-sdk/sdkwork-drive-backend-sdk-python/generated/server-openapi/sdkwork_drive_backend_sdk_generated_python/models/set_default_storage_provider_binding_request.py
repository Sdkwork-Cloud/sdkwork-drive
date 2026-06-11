from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SetDefaultStorageProviderBindingRequest:
    tenant_id: str
    provider_id: str
    operator_id: str
    space_id: Optional[str] = None
    storage_root_prefix: Optional[str] = None
