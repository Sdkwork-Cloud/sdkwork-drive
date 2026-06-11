from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateDownloadPackageRequest:
    tenant_id: str
    node_ids: List[str]
    package_name: Optional[str] = None
    requested_ttl_seconds: Optional[int] = None
    operator_id: Optional[str] = None
