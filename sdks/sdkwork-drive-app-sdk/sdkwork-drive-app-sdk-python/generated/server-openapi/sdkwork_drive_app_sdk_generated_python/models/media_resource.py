from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MediaResource:
    media_resource_id: Optional[str] = None
    media_type: Optional[str] = None
    content_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    size_bytes: Optional[int] = None
    checksum_sha256: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
