use axum::Json;
use sdkwork_utils_rust::{
    offset_limit_page_info, offset_list_page_data, OffsetListPageParams,
    PageInfo, PageMode, SdkWorkApiResponse, SdkWorkPageData,
};
use serde::Serialize;

use crate::dto::{is_false_bool, DriveNodeResponse, PageRequest};

/// Standard list payload with optional drive-specific ACL scan metadata.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DriveListPageData<T> {
    pub items: Vec<T>,
    pub page_info: PageInfo,
    #[serde(skip_serializing_if = "is_false_bool")]
    pub incomplete_page: bool,
}

pub(crate) type DriveNodeListHttpResponse =
    Json<SdkWorkApiResponse<DriveListPageData<DriveNodeResponse>>>;

pub(crate) type DriveListHttpResponse<T> = Json<SdkWorkApiResponse<SdkWorkPageData<T>>>;

pub(crate) fn current_trace_id() -> String {
    sdkwork_drive_http::problem_correlation::current_problem_correlation().trace_id
}

/// Build cursor-mode `PageInfo` for legacy numeric `pageToken` offset continuation.
pub(crate) fn page_info_from_offset_token(
    page: PageRequest,
    next_page_token: Option<String>,
) -> PageInfo {
    PageInfo {
        mode: PageMode::Cursor,
        page: None,
        page_size: Some(page.limit as i32),
        total_items: None,
        total_pages: None,
        next_cursor: next_page_token.clone(),
        has_more: Some(next_page_token.is_some()),
    }
}

pub(crate) fn success_list_page<T: Serialize>(
    items: Vec<T>,
    page: PageRequest,
    next_page_token: Option<String>,
    incomplete_page: bool,
) -> Json<SdkWorkApiResponse<DriveListPageData<T>>> {
    Json(SdkWorkApiResponse::success(
        DriveListPageData {
            items,
            page_info: page_info_from_offset_token(page, next_page_token),
            incomplete_page,
        },
        current_trace_id(),
    ))
}

pub(crate) fn success_list_page_simple<T: Serialize>(
    items: Vec<T>,
    page: PageRequest,
    next_page_token: Option<String>,
) -> Json<SdkWorkApiResponse<SdkWorkPageData<T>>> {
    Json(SdkWorkApiResponse::success(
        SdkWorkPageData {
            items,
            page_info: page_info_from_offset_token(page, next_page_token),
        },
        current_trace_id(),
    ))
}

pub(crate) fn success_offset_list_page<T: Serialize>(
    items: Vec<T>,
    total_items: i64,
    params: OffsetListPageParams,
) -> Json<SdkWorkApiResponse<SdkWorkPageData<T>>> {
    Json(SdkWorkApiResponse::success(
        offset_list_page_data(items, total_items, params),
        current_trace_id(),
    ))
}

pub(crate) fn success_cursor_list_page<T: Serialize>(
    items: Vec<T>,
    page_size: i32,
    next_cursor: Option<String>,
) -> Json<SdkWorkApiResponse<SdkWorkPageData<T>>> {
    Json(SdkWorkApiResponse::success(
        SdkWorkPageData {
            items,
            page_info: PageInfo {
                mode: PageMode::Cursor,
                page: None,
                page_size: Some(page_size),
                total_items: None,
                total_pages: None,
                next_cursor: next_cursor.clone(),
                has_more: Some(next_cursor.is_some()),
            },
        },
        current_trace_id(),
    ))
}

pub(crate) fn offset_page_info_from_token(
    _page: PageRequest,
    next_page_token: Option<String>,
) -> PageInfo {
    let has_more = next_page_token.is_some();
    offset_limit_page_info(next_page_token, has_more)
}

pub(crate) fn offset_list_params_from_page(page: PageRequest) -> OffsetListPageParams {
    let page_no = if page.limit > 0 {
        (page.offset / page.limit) + 1
    } else {
        1
    };
    OffsetListPageParams {
        page: page_no,
        page_size: page.limit,
        offset: page.offset,
    }
}
