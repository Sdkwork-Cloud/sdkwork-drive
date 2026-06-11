from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdatePermissionRequest:
    tenant_id: str
    role: Optional[str] = None
    operator_id: Optional[str] = None
