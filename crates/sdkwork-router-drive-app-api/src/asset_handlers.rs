use axum::extract::Path;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;

pub(crate) async fn list_assets() -> Json<serde_json::Value> {
    Json(json!({
        "items": [],
        "nextCursor": null
    }))
}

pub(crate) async fn create_asset() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::CREATED,
        Json(json!({
            "assetId": "",
            "driveNodeId": "",
            "driveSpaceId": "",
            "assetKind": "file",
            "nodeType": "file",
            "lifecycleStatus": "active"
        })),
    )
}

pub(crate) async fn get_asset(Path(asset_id): Path<String>) -> Json<serde_json::Value> {
    Json(json!({
        "assetId": asset_id,
        "driveNodeId": asset_id,
        "driveSpaceId": "",
        "assetKind": "file",
        "nodeType": "file",
        "lifecycleStatus": "active"
    }))
}

pub(crate) async fn update_asset(Path(asset_id): Path<String>) -> Json<serde_json::Value> {
    Json(json!({
        "assetId": asset_id,
        "driveNodeId": asset_id,
        "driveSpaceId": "",
        "assetKind": "file",
        "nodeType": "file",
        "lifecycleStatus": "active"
    }))
}

pub(crate) async fn archive_asset(Path(asset_id): Path<String>) -> Json<serde_json::Value> {
    Json(json!({
        "assetId": asset_id,
        "driveNodeId": asset_id,
        "lifecycleStatus": "archived"
    }))
}

pub(crate) async fn restore_asset(Path(asset_id): Path<String>) -> Json<serde_json::Value> {
    Json(json!({
        "assetId": asset_id,
        "driveNodeId": asset_id,
        "lifecycleStatus": "active"
    }))
}

pub(crate) async fn list_asset_collections() -> Json<serde_json::Value> {
    Json(json!({
        "items": [],
        "nextCursor": null
    }))
}

pub(crate) async fn create_asset_collection() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::CREATED,
        Json(json!({
            "id": "",
            "title": "",
            "lifecycleStatus": "active"
        })),
    )
}

pub(crate) async fn add_asset_collection_item(
    Path(collection_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::CREATED,
        Json(json!({
            "id": "",
            "collectionId": collection_id
        })),
    )
}

pub(crate) async fn delete_asset_collection_item(
    Path((collection_id, item_id)): Path<(String, String)>,
) -> Json<serde_json::Value> {
    Json(json!({
        "deleted": true,
        "collectionId": collection_id,
        "itemId": item_id
    }))
}

pub(crate) async fn create_asset_relation(
    Path(asset_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::CREATED,
        Json(json!({
            "id": "",
            "assetId": asset_id
        })),
    )
}

pub(crate) async fn delete_asset_relation(
    Path((asset_id, relation_id)): Path<(String, String)>,
) -> Json<serde_json::Value> {
    Json(json!({
        "deleted": true,
        "assetId": asset_id,
        "relationId": relation_id
    }))
}

pub(crate) async fn asset_method_not_allowed() -> StatusCode {
    StatusCode::METHOD_NOT_ALLOWED
}

pub(crate) async fn asset_not_found() -> StatusCode {
    StatusCode::NOT_FOUND
}
