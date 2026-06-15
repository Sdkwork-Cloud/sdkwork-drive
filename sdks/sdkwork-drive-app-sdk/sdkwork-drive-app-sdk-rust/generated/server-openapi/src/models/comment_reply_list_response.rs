use serde::{Deserialize, Serialize};

use crate::models::DriveCommentReply;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CommentReplyListResponse {
    pub items: Vec<DriveCommentReply>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
