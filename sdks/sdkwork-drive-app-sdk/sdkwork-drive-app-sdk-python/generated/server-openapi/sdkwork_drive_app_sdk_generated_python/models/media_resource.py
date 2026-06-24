from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MediaResource:
    id: Optional[str] = None
    kind: Optional[str] = None
    source: Optional[str] = None
    uri: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[str] = None
    checksum: Optional[Dict[str, Any]] = None
    url: Optional[str] = None
    media_resource_id: Optional[str] = None
    media_type: Optional[str] = None
    content_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    checksum_sha256: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
