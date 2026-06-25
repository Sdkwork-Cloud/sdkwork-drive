from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .drive_comment_reply import DriveCommentReply


@dataclass
class CommentReplyListResponse:
    items: List[DriveCommentReply]
    next_page_token: Optional[str] = None
