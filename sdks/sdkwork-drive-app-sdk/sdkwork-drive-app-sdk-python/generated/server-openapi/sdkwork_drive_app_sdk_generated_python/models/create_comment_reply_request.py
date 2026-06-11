from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateCommentReplyRequest:
    id: str
    tenant_id: str
    content: str
    operator_id: str
