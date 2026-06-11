from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class FileVersion:
    id: str
    tenant_id: str
    node_id: str
    version_no: int
    content_type: str
    content_length: int
    checksum_sha256hex: str
    lifecycle_status: str
    created_at: str
