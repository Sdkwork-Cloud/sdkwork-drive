use axum::extract::Path;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;

fn not_implemented() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "type": "about:blank",
            "title": "not implemented",
            "status": 501,
            "detail": "Drive assets API is not implemented; use Drive nodes and uploader flows instead",
            "code": "drive.not_implemented"
        })),
    )
}

pub(crate) async fn list_assets() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn create_asset() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn get_asset(Path(_asset_id): Path<String>) -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn update_asset(
    Path(_asset_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn archive_asset(
    Path(_asset_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn restore_asset(
    Path(_asset_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn list_asset_collections() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn create_asset_collection() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn add_asset_collection_item() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn delete_asset_collection_item() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn create_asset_relation() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn delete_asset_relation() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}

pub(crate) async fn asset_upload_not_implemented() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "type": "about:blank",
            "title": "not implemented",
            "status": 501,
            "detail": "legacy asset upload endpoints are not available; use Drive uploader APIs",
            "code": "drive.not_implemented"
        })),
    )
}

pub(crate) async fn asset_method_not_allowed() -> (StatusCode, Json<serde_json::Value>) {
    not_implemented()
}
