from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateCommentRequest:
    tenant_id: str
    content: Optional[str] = None
    anchor: Optional[str] = None
    resolved: Optional[bool] = None
    operator_id: Optional[str] = None
