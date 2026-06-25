use serde::Serialize;

/// Standard success response envelope.
#[derive(Debug, Clone, Serialize)]
pub struct SuccessResponse<T: Serialize> {
    pub success: bool,
    pub data: T,
}

impl<T: Serialize> SuccessResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data,
        }
    }
}

/// Standard list response with pagination.
#[derive(Debug, Clone, Serialize)]
pub struct ListResponse<T: Serialize> {
    pub items: Vec<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_count: Option<i64>,
}

impl<T: Serialize> ListResponse<T> {
    pub fn new(items: Vec<T>) -> Self {
        Self {
            items,
            next_page_token: None,
            total_count: None,
        }
    }

    pub fn with_pagination(
        mut self,
        next_page_token: Option<String>,
        total_count: Option<i64>,
    ) -> Self {
        self.next_page_token = next_page_token;
        self.total_count = total_count;
        self
    }
}

/// No content response (204).
#[derive(Debug, Clone, Serialize)]
pub struct NoContent;

/// Created response (201) with resource ID.
#[derive(Debug, Clone, Serialize)]
pub struct CreatedResponse {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl CreatedResponse {
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            message: None,
        }
    }

    pub fn with_message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }
}
