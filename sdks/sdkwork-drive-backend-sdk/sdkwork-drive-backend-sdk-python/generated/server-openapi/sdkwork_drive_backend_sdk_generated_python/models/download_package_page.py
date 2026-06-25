from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .download_package import DownloadPackage


@dataclass
class DownloadPackagePage:
    items: List[DownloadPackage]
    page: int
    page_size: int
    total: int
