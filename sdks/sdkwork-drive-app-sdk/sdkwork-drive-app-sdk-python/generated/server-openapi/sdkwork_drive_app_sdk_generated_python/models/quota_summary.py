from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class QuotaSummary:
    tenant_id: str
    used_bytes: int
    object_count: int
