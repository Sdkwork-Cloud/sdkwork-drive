from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .field_error import FieldError


@dataclass
class ProblemDetail:
    type: str
    title: str
    status: int
    detail: Optional[str] = None
    instance: Optional[str] = None
    code: Optional[str] = None
    trace_id: Optional[str] = None
    request_id: Optional[str] = None
    errors: Optional[List[FieldError]] = None
