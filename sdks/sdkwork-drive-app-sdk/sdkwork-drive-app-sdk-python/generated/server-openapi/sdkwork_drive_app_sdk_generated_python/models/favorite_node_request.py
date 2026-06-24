from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class FavoriteNodeRequest:
    subject_type: Optional[str] = None
    subject_id: Optional[str] = None
    operator_id: Optional[str] = None
