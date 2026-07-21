use axum::body::{to_bytes, Body};
use axum::Router;
use http::{Method, Request, Response, StatusCode};
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use serde_json::{json, Value};
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use tempfile::TempDir;
use tower::ServiceExt;

const WEBSITE_ROOT_UUID: &str = "11111111-1111-4111-8111-111111111111";

async fn setup() -> (AnyPool, Router, TempDir) {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");
    let temp = tempfile::tempdir().expect("temp object root should be created");
    let app = sdkwork_routes_drive_internal_api::build_router_with_pool(pool.clone());
    (pool, app, temp)
}

fn ingress_token(tenant_id: &str, user_id: &str, app_id: &str) -> String {
    format!("api_key_id=internal-test;tenant_id={tenant_id};user_id={user_id};app_id={app_id}")
}

fn request(
    method: Method,
    uri: impl AsRef<str>,
    tenant_id: Option<&str>,
    body: Body,
) -> Request<Body> {
    let mut builder = Request::builder().method(method).uri(uri.as_ref());
    if let Some(tenant_id) = tenant_id {
        builder = builder.header(
            "x-api-key",
            ingress_token(tenant_id, "service-publisher", "knowledgebase"),
        );
    }
    builder.body(body).expect("request should be built")
}

fn json_request(
    method: Method,
    uri: impl AsRef<str>,
    tenant_id: Option<&str>,
    payload: Value,
) -> Request<Body> {
    let mut request = request(method, uri, tenant_id, Body::from(payload.to_string()));
    request.headers_mut().insert(
        http::header::CONTENT_TYPE,
        http::HeaderValue::from_static("application/json"),
    );
    request
}

async fn response_json(response: Response<Body>) -> Value {
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");
    serde_json::from_slice(&body).expect("response body should be JSON")
}

async fn insert_knowledgebase_tree(pool: &AnyPool) {
    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
         ) VALUES ('space-kb', 'tenant-kb', 'app', 'knowledge-base-1', 'knowledge_base',
                   'Knowledgebase', 'active', 1, 'service-kb', 'service-kb')",
    )
    .execute(pool)
    .await
    .expect("knowledgebase Space should be inserted");
    for (id, parent_id, name) in [
        ("root-kb", None, "Knowledgebase"),
        ("sources-kb", Some("root-kb"), "sources"),
        ("raw-kb", Some("sources-kb"), "raw"),
    ] {
        sqlx::query(
            "INSERT INTO dr_drive_node (
                id, tenant_id, space_id, space_type, parent_node_id, node_type, node_name,
                content_state, lifecycle_status, version, created_by, updated_by
             ) VALUES ($1, 'tenant-kb', 'space-kb', 'knowledge_base', $2, 'folder', $3,
                       'ready', 'active', 1, 'service-kb', 'service-kb')",
        )
        .bind(id)
        .bind(parent_id)
        .bind(name)
        .execute(pool)
        .await
        .expect("knowledgebase folder should be inserted");
    }
}

async fn insert_website_resource(pool: &AnyPool, temp: &TempDir) -> String {
    let content = b"hello world";
    let checksum = format!("sha256:{}", sdkwork_utils_rust::sha256_hash(content));
    let endpoint = url::Url::from_directory_path(temp.path())
        .expect("temp root should become file URL")
        .to_string();
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, region, bucket, path_style,
            strict_tls, credential_ref, status, version, created_by, updated_by
         ) VALUES ('provider-local', 'local_filesystem', 'Local', $1, NULL,
                   'website-bucket', 1, 0, NULL, 'active', 1, 'test', 'test')",
    )
    .bind(endpoint)
    .execute(pool)
    .await
    .expect("local provider should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
         ) VALUES ('space-web', 'tenant-web', 'user', 'owner-web', 'website',
                   'Website', 'active', 1, 'owner-web', 'owner-web')",
    )
    .execute(pool)
    .await
    .expect("website Space should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, space_type, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
         ) VALUES ('root-web', 'tenant-web', 'space-web', 'website', NULL, 'folder',
                   'Website', 'ready', 'active', 1, 'owner-web', 'owner-web')",
    )
    .execute(pool)
    .await
    .expect("website root node should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, space_type, parent_node_id, node_type, node_name,
            content_state, head_content_type, head_content_type_group, head_content_length,
            head_version_no, head_checksum_sha256_hex, lifecycle_status, version,
            created_by, updated_by
         ) VALUES ('file-index', 'tenant-web', 'space-web', 'website', 'root-web', 'file',
                   'index.html', 'ready', 'text/html', 'document', 11, 1, $1,
                   'active', 1, 'owner-web', 'owner-web')",
    )
    .bind(&checksum)
    .execute(pool)
    .await
    .expect("website file should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES ('object-index', 'tenant-web', 'file-index', 1, 'provider-local',
                   'website-bucket', 'site/index.html', 'text/html', 11, $1,
                   'active', 'owner-web', 'owner-web')",
    )
    .bind(&checksum)
    .execute(pool)
    .await
    .expect("website object should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_node_version (
            id, tenant_id, space_id, node_id, version_no, storage_object_id,
            content_type, content_length, checksum_sha256_hex, version_kind,
            change_source, lifecycle_status, created_by, updated_by
         ) VALUES ('version-index', 'tenant-web', 'space-web', 'file-index', 1,
                   'object-index', 'text/html', 11, $1, 'auto', 'uploader',
                   'active', 'owner-web', 'owner-web')",
    )
    .bind(&checksum)
    .execute(pool)
    .await
    .expect("website node version should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_website_root (
            id, uuid, tenant_id, space_id, root_key, display_name, source_root_mode,
            selected_folder_node_id, selector_key, content_mode, active_node_id,
            active_generation, root_status, last_switch_by, version, created_by, updated_by
         ) VALUES ('root-record', $1, 'tenant-web', 'space-web', 'default', 'Default',
                   'space_root', NULL, 'space_root', 'live_tree', 'root-web', 1,
                   'active', 'owner-web', 1, 'owner-web', 'owner-web')",
    )
    .bind(WEBSITE_ROOT_UUID)
    .execute(pool)
    .await
    .expect("WebsiteRoot should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_website_root_generation (
            id, tenant_id, website_root_id, generation_no, root_node_id,
            generation_status, activated_by
         ) VALUES ('generation-1', 'tenant-web', 'root-record', 1, 'root-web',
                   'current', 'owner-web')",
    )
    .execute(pool)
    .await
    .expect("WebsiteRoot generation should be inserted");

    let object_path = temp.path().join("website-bucket").join("site/index.html");
    std::fs::create_dir_all(object_path.parent().expect("object parent"))
        .expect("object directory should be created");
    std::fs::write(object_path, content).expect("object bytes should be written");
    checksum
}

#[tokio::test]
async fn subscription_routes_require_ingress_auth_replay_and_isolate_tenants() {
    let (pool, app, _temp) = setup().await;
    insert_knowledgebase_tree(&pool).await;
    let payload = json!({
        "spaceId": "space-kb",
        "knowledgeBaseId": "knowledge-base-1",
        "rawFolderNodeId": "raw-kb"
    });

    let unauthenticated = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/internal/v3/api/drive/root_scope_subscriptions",
            None,
            payload.clone(),
        ))
        .await
        .expect("request should be handled");
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let created = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/internal/v3/api/drive/root_scope_subscriptions",
            Some("tenant-kb"),
            payload.clone(),
        ))
        .await
        .expect("create request should be handled");
    assert_eq!(created.status(), StatusCode::CREATED);
    let created_json = response_json(created).await;
    let uuid = created_json["data"]["item"]["uuid"]
        .as_str()
        .expect("subscription uuid")
        .to_string();
    assert_eq!(
        created_json["data"]["item"]["consumerKind"],
        "KNOWLEDGEBASE_RAW"
    );

    let replay = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/internal/v3/api/drive/root_scope_subscriptions",
            Some("tenant-kb"),
            payload,
        ))
        .await
        .expect("replay request should be handled");
    assert_eq!(replay.status(), StatusCode::OK);

    let cross_tenant = app
        .clone()
        .oneshot(request(
            Method::GET,
            format!("/internal/v3/api/drive/root_scope_subscriptions/{uuid}"),
            Some("tenant-other"),
            Body::empty(),
        ))
        .await
        .expect("cross-tenant request should be handled");
    assert_eq!(cross_tenant.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn resolution_and_content_routes_hide_locators_and_implement_http_semantics() {
    let (pool, app, temp) = setup().await;
    let checksum = insert_website_resource(&pool, &temp).await;
    let resolution = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/internal/v3/api/drive/resource_resolutions",
            Some("tenant-web"),
            json!({
                "scopeType": "WEBSITE_ROOT",
                "scopeUuid": WEBSITE_ROOT_UUID,
                "relativePath": "index.html"
            }),
        ))
        .await
        .expect("resolution request should be handled");
    assert_eq!(resolution.status(), StatusCode::OK);
    let resolution_json = response_json(resolution).await;
    let item = &resolution_json["data"]["item"];
    assert_eq!(item["logicalNodeVersionId"], "version-index");
    assert_eq!(item["checksumSha256Hex"], checksum);
    let serialized = resolution_json.to_string();
    assert!(!serialized.contains("website-bucket"));
    assert!(!serialized.contains("site/index.html"));
    assert!(!serialized.contains("storageProvider"));

    let content_uri = format!(
        "/internal/v3/api/drive/node_versions/version-index/content?scopeType=WEBSITE_ROOT&scopeUuid={WEBSITE_ROOT_UUID}&relativePath=index.html"
    );
    let full = app
        .clone()
        .oneshot(request(
            Method::GET,
            &content_uri,
            Some("tenant-web"),
            Body::empty(),
        ))
        .await
        .expect("content request should be handled");
    assert_eq!(full.status(), StatusCode::OK);
    assert_eq!(full.headers()[http::header::ACCEPT_RANGES], "bytes");
    assert_eq!(full.headers()[http::header::CONTENT_TYPE], "text/html");
    let etag = full.headers()[http::header::ETAG]
        .to_str()
        .expect("etag header")
        .to_string();
    let full_body = to_bytes(full.into_body(), usize::MAX)
        .await
        .expect("full body should stream");
    assert_eq!(&full_body[..], b"hello world");

    let mut range_request = request(Method::GET, &content_uri, Some("tenant-web"), Body::empty());
    range_request.headers_mut().insert(
        http::header::RANGE,
        http::HeaderValue::from_static("bytes=1-4"),
    );
    let range = app
        .clone()
        .oneshot(range_request)
        .await
        .expect("range request should be handled");
    assert_eq!(range.status(), StatusCode::PARTIAL_CONTENT);
    assert_eq!(range.headers()[http::header::CONTENT_RANGE], "bytes 1-4/11");
    let range_body = to_bytes(range.into_body(), usize::MAX)
        .await
        .expect("range body should stream");
    assert_eq!(&range_body[..], b"ello");

    let mut conditional = request(Method::GET, &content_uri, Some("tenant-web"), Body::empty());
    conditional.headers_mut().insert(
        http::header::IF_NONE_MATCH,
        http::HeaderValue::from_str(&etag).expect("etag should be a header"),
    );
    let not_modified = app
        .clone()
        .oneshot(conditional)
        .await
        .expect("conditional request should be handled");
    assert_eq!(not_modified.status(), StatusCode::NOT_MODIFIED);

    let wrong_scope_uri =
        content_uri.replace(WEBSITE_ROOT_UUID, "22222222-2222-4222-8222-222222222222");
    let wrong_scope = app
        .clone()
        .oneshot(request(
            Method::GET,
            wrong_scope_uri,
            Some("tenant-web"),
            Body::empty(),
        ))
        .await
        .expect("wrong-scope request should be handled");
    assert_eq!(wrong_scope.status(), StatusCode::NOT_FOUND);
}

#[test]
fn route_manifest_is_internal_and_ingress_token_only() {
    let manifest = sdkwork_routes_drive_internal_api::internal_route_manifest();
    assert_eq!(manifest.routes().len(), 4);
    for route in manifest.routes() {
        assert!(route.path.starts_with("/internal/v3/api/"));
        assert_eq!(route.auth, sdkwork_web_core::RouteAuth::IngressToken);
    }
}
