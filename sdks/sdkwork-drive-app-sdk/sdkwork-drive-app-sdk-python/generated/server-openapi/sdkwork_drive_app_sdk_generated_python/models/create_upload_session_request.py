from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateUploadSessionRequest:
    session_id: str
    tenant_id: str
    space_id: str
    node_id: str
    idempotency_key: str
    operator_id: str
    expires_at_epoch_ms: int
    bucket: Optional[str] = None
    object_key: Optional[str] = None
