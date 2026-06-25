from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateQuotaPolicyRequest:
    operator_id: str
    quota_bytes: Optional[int] = None
    clear_tenant_policy: Optional[bool] = None
