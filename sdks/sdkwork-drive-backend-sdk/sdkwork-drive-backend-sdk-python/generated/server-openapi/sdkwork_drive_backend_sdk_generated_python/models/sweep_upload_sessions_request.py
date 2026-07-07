from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SweepUploadSessionsRequest:
    now_epoch_ms: int
    dry_run: bool
    operator_id: str
    limit: Optional[int] = None
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
