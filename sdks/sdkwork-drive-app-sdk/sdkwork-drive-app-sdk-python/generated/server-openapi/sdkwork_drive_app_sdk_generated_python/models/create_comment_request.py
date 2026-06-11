from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateCommentRequest:
    id: str
    tenant_id: str
    content: str
    operator_id: str
    anchor: Optional[str] = None
