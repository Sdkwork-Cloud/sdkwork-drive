from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateShareLinkRequest:
    tenant_id: str
    role: Optional[str] = None
    expires_at_epoch_ms: Optional[int] = None
    download_limit: Optional[int] = None
    operator_id: Optional[str] = None
