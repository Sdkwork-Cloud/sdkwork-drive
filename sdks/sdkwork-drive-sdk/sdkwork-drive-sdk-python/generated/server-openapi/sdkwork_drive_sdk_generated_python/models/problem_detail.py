from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ProblemDetail:
    type: str
    title: str
    status: int
    detail: str
    code: str
    trace_id: str
    request_id: str
