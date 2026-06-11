from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SetNodePropertyRequest:
    tenant_id: str
    value: str
    visibility: Optional[str] = None
    operator_id: Optional[str] = None
