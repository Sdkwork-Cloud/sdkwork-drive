from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateCommentReplyRequest:
    tenant_id: str
    content: Optional[str] = None
    operator_id: Optional[str] = None
