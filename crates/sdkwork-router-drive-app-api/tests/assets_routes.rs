use axum::body::{to_bytes, Body};
use http::StatusCode;
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use tower::util::ServiceExt;

mod common;

async fn seed_asset_fixture(pool: &AnyPool) {
    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES ('space-assets', 'tenant-assets', 'user', 'user-assets', 'personal', 'Assets', 'active', 1, 'user-assets', 'user-assets')",
    )
    .execute(pool)
    .await
    .expect("asset test space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            scene, source, content_state, head_content_type, head_content_type_group,
            head_content_length, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'file-asset-001', 'tenant-assets', 'space-assets', NULL, 'file', 'photo.png',
            'media', 'upload:web', 'ready', 'image/png', 'image', 1024, 'active', 1, 'user-assets', 'user-assets'
        )",
    )
    .execute(pool)
    .await
    .expect("asset test node should be seeded");
}

async fn build_asset_test_pool_and_app() -> (AnyPool, axum::Router) {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");
    seed_asset_fixture(&pool).await;
    let app = common::test_router_with_pool(pool.clone());
    (pool, app)
}

async fn build_asset_test_app() -> axum::Router {
    build_asset_test_pool_and_app().await.1
}

#[tokio::test]
async fn assets_list_and_get_expose_drive_nodes_as_global_assets() {
    let app = build_asset_test_app().await;

    let list_response = app
        .clone()
        .oneshot(common::authed_get(
            "/app/v3/api/assets",
            "tenant-assets",
            "user-assets",
            "appbase",
        ))
        .await
        .expect("assets list should be handled");
    assert_eq!(list_response.status(), StatusCode::OK);
    let list_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(list_response.into_body(), usize::MAX)
            .await
            .expect("assets list body should be read"),
    )
    .expect("assets list should be json");
    let items = list_payload["items"]
        .as_array()
        .expect("assets list should include items");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["assetId"].as_str(), Some("file-asset-001"));
    assert_eq!(items[0]["driveNodeId"].as_str(), Some("file-asset-001"));
    assert_eq!(items[0]["assetKind"].as_str(), Some("image"));
    assert!(items[0]["driveUri"]
        .as_str()
        .unwrap_or("")
        .starts_with("drive://spaces/"));

    let get_response = app
        .clone()
        .oneshot(common::authed_get(
            "/app/v3/api/assets/file-asset-001",
            "tenant-assets",
            "user-assets",
            "appbase",
        ))
        .await
        .expect("assets get should be handled");
    assert_eq!(get_response.status(), StatusCode::OK);
    let get_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(get_response.into_body(), usize::MAX)
            .await
            .expect("assets get body should be read"),
    )
    .expect("assets get should be json");
    assert_eq!(get_payload["assetId"].as_str(), Some("file-asset-001"));
    assert_eq!(get_payload["title"].as_str(), Some("photo.png"));
}

#[tokio::test]
async fn assets_create_bind_existing_node_and_support_collections_and_relations() {
    let (pool, app) = build_asset_test_pool_and_app().await;

    let create_response = app
        .clone()
        .oneshot(common::authed_post_json(
            "/app/v3/api/assets",
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from(r#"{"driveNodeId":"file-asset-001","description":"catalog photo","tags":["hero"]}"#),
        ))
        .await
        .expect("assets create should be handled");
    assert_eq!(create_response.status(), StatusCode::CREATED);

    let collection_response = app
        .clone()
        .oneshot(common::authed_post_json(
            "/app/v3/api/assets/collections",
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from(r#"{"title":"Launch Assets"}"#),
        ))
        .await
        .expect("asset collection create should be handled");
    assert_eq!(collection_response.status(), StatusCode::CREATED);
    let collection_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(collection_response.into_body(), usize::MAX)
            .await
            .expect("collection body should be read"),
    )
    .expect("collection response should be json");
    let collection_id = collection_payload["id"]
        .as_str()
        .expect("collection id should be present")
        .to_string();

    let item_response = app
        .clone()
        .oneshot(common::authed_post_json(
            &format!("/app/v3/api/assets/collections/{collection_id}/items"),
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from(r#"{"assetId":"file-asset-001","sortOrder":1}"#),
        ))
        .await
        .expect("asset collection item create should be handled");
    assert_eq!(item_response.status(), StatusCode::CREATED);

    let relation_response = app
        .clone()
        .oneshot(common::authed_post_json(
            "/app/v3/api/assets/file-asset-001/relations",
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from(r#"{"relationType":"references","sourceDomain":"marketing"}"#),
        ))
        .await
        .expect("asset relation create should be handled");
    assert_eq!(relation_response.status(), StatusCode::CREATED);

    let archive_response = app
        .clone()
        .oneshot(common::authed_post_json(
            "/app/v3/api/assets/file-asset-001/archive",
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from(r#"{"reason":"campaign ended"}"#),
        ))
        .await
        .expect("asset archive should be handled");
    assert_eq!(archive_response.status(), StatusCode::OK);
    let archive_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(archive_response.into_body(), usize::MAX)
            .await
            .expect("archive body should be read"),
    )
    .expect("archive response should be json");
    assert_eq!(archive_payload["lifecycleStatus"].as_str(), Some("archived"));

    let archive_reason: Option<String> = sqlx::query_scalar(
        "SELECT property_value
         FROM dr_drive_node_property
         WHERE tenant_id=$1
           AND node_id=$2
           AND property_key='global.asset.archive.reason'
           AND lifecycle_status='active'",
    )
    .bind("tenant-assets")
    .bind("file-asset-001")
    .fetch_optional(&pool)
    .await
    .expect("archive reason property should be readable");
    assert_eq!(archive_reason.as_deref(), Some("campaign ended"));

    let restore_response = app
        .clone()
        .oneshot(common::authed_post_json(
            "/app/v3/api/assets/file-asset-001/restore",
            "tenant-assets",
            "user-assets",
            "appbase",
            Body::from("{}"),
        ))
        .await
        .expect("asset restore should be handled");
    assert_eq!(restore_response.status(), StatusCode::OK);

    let cleared_reason: Option<String> = sqlx::query_scalar(
        "SELECT property_value
         FROM dr_drive_node_property
         WHERE tenant_id=$1
           AND node_id=$2
           AND property_key='global.asset.archive.reason'
           AND lifecycle_status='active'",
    )
    .bind("tenant-assets")
    .bind("file-asset-001")
    .fetch_optional(&pool)
    .await
    .expect("restored archive reason property should be readable");
    assert_eq!(cleared_reason, None);
}
