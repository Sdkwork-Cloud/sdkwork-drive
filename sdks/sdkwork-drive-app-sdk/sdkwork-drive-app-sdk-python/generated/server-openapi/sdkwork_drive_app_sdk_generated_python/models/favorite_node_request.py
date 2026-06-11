from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class FavoriteNodeRequest:
    tenant_id: str
    subject_type: str
    subject_id: str
    operator_id: Optional[str] = None
