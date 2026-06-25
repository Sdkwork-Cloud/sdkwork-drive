from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .archive_entry import ArchiveEntry


@dataclass
class ArchiveEntryListResponse:
    items: List[ArchiveEntry]
