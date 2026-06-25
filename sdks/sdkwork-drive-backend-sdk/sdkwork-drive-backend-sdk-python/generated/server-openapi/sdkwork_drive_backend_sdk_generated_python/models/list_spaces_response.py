from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_space import DriveSpace


@dataclass
class ListSpacesResponse:
    items: List[DriveSpace]
