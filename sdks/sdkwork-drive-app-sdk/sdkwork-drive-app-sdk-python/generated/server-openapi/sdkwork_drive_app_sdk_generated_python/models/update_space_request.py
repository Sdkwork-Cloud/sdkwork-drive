from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateSpaceRequest:
    tenant_id: str
    display_name: Optional[str] = None
    operator_id: Optional[str] = None
