from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .file_version import FileVersion


@dataclass
class VersionListResponse:
    items: List[FileVersion]
    next_page_token: Optional[str] = None
