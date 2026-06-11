from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .maintenance_job import MaintenanceJob


@dataclass
class MaintenanceJobPage:
    items: List[MaintenanceJob]
    page: int
    page_size: int
    total: int
