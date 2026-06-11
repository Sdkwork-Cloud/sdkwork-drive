from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .completed_upload_part import CompletedUploadPart


@dataclass
class CompleteUploadSessionRequest:
    tenant_id: str
    content_type: str
    content_length: int
    checksum_sha256hex: str
    parts: List[CompletedUploadPart]
    upload_id: Optional[str] = None
    operator_id: Optional[str] = None
