use async_trait::async_trait;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Redirect;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use sdkwork_drive_observability::{elapsed_ms, error_kinds, events, has_value, start_timer};
use sdkwork_drive_product::application::download_service::{
    CreateDownloadUrlCommand, DriveDownloadService, ResolveDownloadTokenCommand,
};
use sdkwork_drive_product::application::space_service::{CreateSpaceCommand, DriveSpaceService};
use sdkwork_drive_product::application::upload_service::{
    CreateUploadSessionCommand, DriveUploadService,
};
use sdkwork_drive_product::domain::space::DriveSpaceType;
use sdkwork_drive_product::domain::storage_provider::DriveStorageProviderKind;
use sdkwork_drive_product::domain::upload::DriveUploadSessionState;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::space_store::SqlSpaceStore;
use sdkwork_drive_product::infrastructure::sql::storage_object_store::SqlStorageObjectStore;
use sdkwork_drive_product::infrastructure::sql::upload_session_store::SqlUploadSessionStore;
use sdkwork_drive_product::ports::storage_object_store::{
    DownloadSignCommand, DriveDownloadSigner, SignedDownloadPayload,
};
use sdkwork_drive_product::DriveProductError;
use sdkwork_drive_storage_contract::{
    DriveObjectLocator, DriveObjectStore, DriveObjectStoreError, DriveObjectStoreErrorKind,
    PresignDownloadRequest,
};
use sdkwork_drive_storage_s3::{S3DriveObjectStore, S3ProviderProfile, S3StoreConfig};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::Row;
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_DOWNLOAD_PUBLIC_BASE_URL: &str = "http://127.0.0.1:18080/app/v3/api/drive";
const DEFAULT_DOWNLOAD_SOURCE_BASE_URL: &str = "https://s3.example.com";

#[derive(Debug, Clone)]
pub struct AppState {
    pool: SqlitePool,
    download_public_base_url: String,
    download_source_base_url: String,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            download_public_base_url: DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string(),
            download_source_base_url: DEFAULT_DOWNLOAD_SOURCE_BASE_URL.to_string(),
        }
    }

    pub fn with_urls(
        pool: SqlitePool,
        download_public_base_url: impl Into<String>,
        download_source_base_url: impl Into<String>,
    ) -> Self {
        Self {
            pool,
            download_public_base_url: download_public_base_url.into(),
            download_source_base_url: download_source_base_url.into(),
        }
    }
}

pub fn build_router() -> Router {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_lazy(":memory:")
        .expect("create in-memory sqlite pool for app api");
    build_router_with_state(AppState::new(pool))
}

pub fn build_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    build_router_with_state(AppState::new(pool))
}

pub async fn build_router_with_sqlite_database_url(
    database_url: &str,
) -> Result<Router, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;
    install_sqlite_schema(&pool).await?;
    Ok(build_router_with_state(AppState::with_urls(
        pool,
        std::env::var("SDKWORK_DRIVE_PUBLIC_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string()),
        std::env::var("SDKWORK_DRIVE_SOURCE_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_DOWNLOAD_SOURCE_BASE_URL.to_string()),
    )))
}

fn build_router_with_state(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route(
            "/app/v3/api/drive/spaces",
            get(list_spaces).post(create_space),
        )
        .route(
            "/app/v3/api/drive/upload_sessions",
            post(create_upload_session),
        )
        .route("/app/v3/api/drive/download_urls", post(create_download_url))
        .route(
            "/app/v3/api/drive/download_tokens/:token",
            get(resolve_download_token),
        )
        .with_state(state)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSpaceRequest {
    id: String,
    tenant_id: String,
    owner_subject_type: String,
    owner_subject_id: String,
    display_name: String,
    space_type: String,
    operator_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateSpaceResponse {
    id: String,
    tenant_id: String,
    owner_subject_type: String,
    owner_subject_id: String,
    display_name: String,
    space_type: String,
    lifecycle_status: String,
    version: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadSessionRequest {
    session_id: String,
    tenant_id: String,
    space_id: String,
    node_id: String,
    bucket: String,
    object_key: String,
    idempotency_key: String,
    operator_id: String,
    expires_at_epoch_ms: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadSessionResponse {
    id: String,
    tenant_id: String,
    space_id: String,
    node_id: String,
    bucket: String,
    object_key: String,
    idempotency_key: String,
    state: String,
    expires_at_epoch_ms: i64,
    version: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateDownloadUrlRequest {
    tenant_id: String,
    node_id: String,
    requested_ttl_seconds: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateDownloadUrlResponse {
    download_url: String,
    expires_at_epoch_ms: i64,
    method: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListSpacesQuery {
    tenant_id: Option<String>,
    owner_subject_type: Option<String>,
    owner_subject_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ListSpacesResponse {
    items: Vec<CreateSpaceResponse>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResolveDownloadTokenQuery {
    tenant_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProblemDetail {
    r#type: String,
    title: String,
    status: u16,
    detail: String,
    code: String,
    trace_id: String,
    request_id: String,
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "sdkwork-drive-app-api" }))
}

async fn list_spaces(
    State(state): State<AppState>,
    Query(query): Query<ListSpacesQuery>,
) -> Result<Json<ListSpacesResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let filter_has_owner_subject_type = has_value(&query.owner_subject_type);
    let filter_has_owner_subject_id = has_value(&query.owner_subject_id);
    let tenant_id = match query.tenant_id {
        Some(tenant_id) => tenant_id.trim().to_string(),
        None => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_LIST,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                filter_has_owner_subject_type = filter_has_owner_subject_type,
                filter_has_owner_subject_id = filter_has_owner_subject_id
            );
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "tenantId is required",
                "drive.validation.tenant_id_required",
            ));
        }
    };

    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let listed = service
        .list_spaces(
            sdkwork_drive_product::application::space_service::ListSpacesCommand {
                tenant_id,
                owner_subject_type: query.owner_subject_type,
                owner_subject_id: query.owner_subject_id,
            },
        )
        .await
        .map_err(map_product_error)?;
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_LIST,
        result = "ok",
        latency_ms = latency_ms,
        filter_has_owner_subject_type = filter_has_owner_subject_type,
        filter_has_owner_subject_id = filter_has_owner_subject_id,
        returned_items = listed.len() as u64
    );

    Ok(Json(ListSpacesResponse {
        items: listed
            .into_iter()
            .map(|item| CreateSpaceResponse {
                id: item.id,
                tenant_id: item.tenant_id,
                owner_subject_type: item.owner_subject_type,
                owner_subject_id: item.owner_subject_id,
                display_name: item.display_name,
                space_type: item.space_type.as_str().to_string(),
                lifecycle_status: item.lifecycle_status,
                version: item.version,
            })
            .collect(),
    }))
}

async fn create_space(
    State(state): State<AppState>,
    Json(payload): Json<CreateSpaceRequest>,
) -> Result<(StatusCode, Json<CreateSpaceResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let space_type = match DriveSpaceType::try_from_str(payload.space_type.trim()) {
        Some(space_type) => space_type,
        None => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                input_space_type = payload.space_type.as_str()
            );
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "invalid space type",
                "space_type is invalid",
                "drive.validation.space_type_invalid",
            ));
        }
    };

    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let created_result = service
        .create_space(CreateSpaceCommand {
            id: payload.id,
            tenant_id: payload.tenant_id,
            owner_subject_type: payload.owner_subject_type,
            owner_subject_id: payload.owner_subject_id,
            display_name: payload.display_name,
            space_type,
            operator_id: payload.operator_id,
        })
        .await;
    let created = match created_result {
        Ok(created) => created,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = product_error_kind(&error)
            );
            return Err(map_product_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        space_type = created.space_type.as_str(),
        lifecycle_status = created.lifecycle_status.as_str(),
        version = created.version
    );

    Ok((
        StatusCode::CREATED,
        Json(CreateSpaceResponse {
            id: created.id,
            tenant_id: created.tenant_id,
            owner_subject_type: created.owner_subject_type,
            owner_subject_id: created.owner_subject_id,
            display_name: created.display_name,
            space_type: created.space_type.as_str().to_string(),
            lifecycle_status: created.lifecycle_status,
            version: created.version,
        }),
    ))
}

async fn create_upload_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateUploadSessionRequest>,
) -> Result<(StatusCode, Json<CreateUploadSessionResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let service = DriveUploadService::new(SqlUploadSessionStore::new(state.pool.clone()));
    let created_result = service
        .create_upload_session(CreateUploadSessionCommand {
            session_id: payload.session_id,
            tenant_id: payload.tenant_id,
            space_id: payload.space_id,
            node_id: payload.node_id,
            bucket: payload.bucket,
            object_key: payload.object_key,
            idempotency_key: payload.idempotency_key,
            operator_id: payload.operator_id,
            expires_at_epoch_ms: payload.expires_at_epoch_ms,
        })
        .await;
    let created = match created_result {
        Ok(created) => created,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_UPLOAD_SESSIONS_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = product_error_kind(&error)
            );
            return Err(map_product_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    let state = upload_session_state_as_str(&created.state);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_UPLOAD_SESSIONS_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        state = state,
        expires_at_epoch_ms = created.expires_at_epoch_ms,
        version = created.version
    );

    Ok((
        StatusCode::CREATED,
        Json(CreateUploadSessionResponse {
            id: created.id,
            tenant_id: created.tenant_id,
            space_id: created.space_id,
            node_id: created.node_id,
            bucket: created.bucket,
            object_key: created.object_key,
            idempotency_key: created.idempotency_key,
            state: state.to_string(),
            expires_at_epoch_ms: created.expires_at_epoch_ms,
            version: created.version,
        }),
    ))
}

async fn create_download_url(
    State(state): State<AppState>,
    Json(payload): Json<CreateDownloadUrlRequest>,
) -> Result<(StatusCode, Json<CreateDownloadUrlResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let service = build_download_service(&state);
    let requested_ttl_seconds = payload.requested_ttl_seconds.unwrap_or(120);
    let result_value = service
        .create_download_url(CreateDownloadUrlCommand {
            tenant_id: payload.tenant_id,
            node_id: payload.node_id,
            requested_ttl_seconds,
            request_base_url: state.download_public_base_url.clone(),
        })
        .await;
    let result = match result_value {
        Ok(result) => result,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_DOWNLOAD_URLS_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = product_error_kind(&error),
                requested_ttl_seconds = requested_ttl_seconds
            );
            return Err(map_product_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_DOWNLOAD_URLS_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        requested_ttl_seconds = requested_ttl_seconds,
        expires_at_epoch_ms = result.expires_at_epoch_ms,
        method = result.method.as_str()
    );

    Ok((
        StatusCode::CREATED,
        Json(CreateDownloadUrlResponse {
            download_url: result.download_url,
            expires_at_epoch_ms: result.expires_at_epoch_ms,
            method: result.method,
        }),
    ))
}

async fn resolve_download_token(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Query(query): Query<ResolveDownloadTokenQuery>,
) -> Result<Response, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let tenant_id = match query.tenant_id {
        Some(tenant_id) => tenant_id.trim().to_string(),
        None => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                method = "GET"
            );
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "tenantId is required",
                "drive.validation.tenant_id_required",
            ));
        }
    };
    if tenant_id.is_empty() {
        sdkwork_drive_observability::observe_route!(
            event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
            result = "err",
            latency_ms = elapsed_ms(started),
            error_kind = error_kinds::VALIDATION,
            method = "GET"
        );
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "tenantId is required",
            "drive.validation.tenant_id_required",
        ));
    }

    let service = build_download_service(&state);
    let result_value = service
        .resolve_download_token(ResolveDownloadTokenCommand { tenant_id, token })
        .await;
    let result = match result_value {
        Ok(result) => result,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = product_error_kind(&error),
                method = "GET"
            );
            return Err(map_download_token_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
        result = "ok",
        latency_ms = latency_ms,
        method = "GET"
    );

    Ok(Redirect::temporary(&result.signed_source_url).into_response())
}

fn map_product_error(error: DriveProductError) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveProductError::Validation(detail) => problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            detail,
            "drive.validation.failed",
        ),
        DriveProductError::Conflict(detail) => {
            problem(StatusCode::CONFLICT, "conflict", detail, "drive.conflict")
        }
        DriveProductError::NotFound(detail) => problem(
            StatusCode::NOT_FOUND,
            "not found",
            detail,
            "drive.not_found",
        ),
        DriveProductError::PermissionDenied(detail) => problem(
            StatusCode::FORBIDDEN,
            "permission denied",
            detail,
            "drive.permission_denied",
        ),
        DriveProductError::Internal(detail) => problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal error",
            detail,
            "drive.internal_error",
        ),
    }
}

fn map_download_token_error(error: DriveProductError) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveProductError::NotFound(detail) if detail.contains("expired") => problem(
            StatusCode::GONE,
            "download token expired",
            detail,
            "drive.download_token.expired",
        ),
        other => map_product_error(other),
    }
}

fn product_error_kind(error: &DriveProductError) -> &'static str {
    match error {
        DriveProductError::Validation(_) => error_kinds::VALIDATION,
        DriveProductError::Conflict(_) => error_kinds::CONFLICT,
        DriveProductError::NotFound(_) => error_kinds::NOT_FOUND,
        DriveProductError::PermissionDenied(_) => error_kinds::PERMISSION_DENIED,
        DriveProductError::Internal(_) => error_kinds::INTERNAL,
    }
}

fn problem(
    status: StatusCode,
    title: &str,
    detail: impl Into<String>,
    code: &str,
) -> (StatusCode, Json<ProblemDetail>) {
    (
        status,
        Json(ProblemDetail {
            r#type: "about:blank".to_string(),
            title: title.to_string(),
            status: status.as_u16(),
            detail: detail.into(),
            code: code.to_string(),
            trace_id: "trace-unset".to_string(),
            request_id: "request-unset".to_string(),
        }),
    )
}

fn build_download_service(
    state: &AppState,
) -> DriveDownloadService<SqlStorageObjectStore, AppDownloadSigner> {
    DriveDownloadService::new(
        SqlStorageObjectStore::new(state.pool.clone()),
        AppDownloadSigner::new(state.pool.clone(), state.download_source_base_url.clone()),
    )
}

fn upload_session_state_as_str(state: &DriveUploadSessionState) -> &'static str {
    match state {
        DriveUploadSessionState::Created => "created",
        DriveUploadSessionState::Uploading => "uploading",
        DriveUploadSessionState::Completed => "completed",
        DriveUploadSessionState::Aborted => "aborted",
        DriveUploadSessionState::Expired => "expired",
    }
}

#[derive(Debug, Clone)]
struct AppDownloadSigner {
    pool: SqlitePool,
    source_base_url: String,
}

impl AppDownloadSigner {
    fn new(pool: SqlitePool, source_base_url: String) -> Self {
        Self {
            pool,
            source_base_url,
        }
    }

    async fn find_active_provider_by_bucket(
        &self,
        bucket: &str,
    ) -> Result<Option<ActiveStorageProviderRecord>, DriveProductError> {
        let row = sqlx::query(
            "SELECT provider_kind, endpoint_url, region, bucket, path_style, credential_ref
             FROM drive_storage_provider
             WHERE status='active' AND bucket=?1
             ORDER BY updated_at DESC, id ASC
             LIMIT 1",
        )
        .bind(bucket)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "query active drive_storage_provider failed: {error}"
            ))
        })?;

        let Some(row) = row else {
            return Ok(None);
        };
        let raw_kind: String = row.get("provider_kind");
        let provider_kind = DriveStorageProviderKind::try_from_str(&raw_kind).ok_or_else(|| {
            DriveProductError::Internal(format!("storage provider kind is invalid: {raw_kind}"))
        })?;
        Ok(Some(ActiveStorageProviderRecord {
            provider_kind,
            endpoint_url: row.get("endpoint_url"),
            region: row.get("region"),
            bucket: row.get("bucket"),
            path_style: row.get("path_style"),
            credential_ref: row.get("credential_ref"),
        }))
    }

    fn read_bool_env(key: &str, default_value: bool) -> bool {
        let Ok(value) = std::env::var(key) else {
            return default_value;
        };
        match value.trim().to_ascii_lowercase().as_str() {
            "1" | "true" | "yes" | "on" => true,
            "0" | "false" | "no" | "off" => false,
            _ => default_value,
        }
    }

    fn resolve_s3_credentials(
        credential_ref: Option<&str>,
    ) -> Result<S3CredentialSnapshot, DriveProductError> {
        if let Some(raw) = credential_ref {
            let trimmed = raw.trim();
            if let Some(payload) = trimmed.strip_prefix("plain:") {
                let parts: Vec<&str> = payload.split(':').collect();
                if !(2..=3).contains(&parts.len()) {
                    return Err(DriveProductError::Validation(
                        "credential_ref plain format is invalid".to_string(),
                    ));
                }
                let access_key_id = parts[0].trim().to_string();
                let secret_access_key = parts[1].trim().to_string();
                if access_key_id.is_empty() || secret_access_key.is_empty() {
                    return Err(DriveProductError::Validation(
                        "credential_ref plain credentials are empty".to_string(),
                    ));
                }
                let session_token = parts
                    .get(2)
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty());
                return Ok(S3CredentialSnapshot {
                    access_key_id,
                    secret_access_key,
                    session_token,
                });
            }
            if let Some(payload) = trimmed.strip_prefix("env:") {
                let parts: Vec<&str> = payload.split(':').collect();
                if !(2..=3).contains(&parts.len()) {
                    return Err(DriveProductError::Validation(
                        "credential_ref env format is invalid".to_string(),
                    ));
                }
                let access_key_name = parts[0].trim();
                let secret_key_name = parts[1].trim();
                if access_key_name.is_empty() || secret_key_name.is_empty() {
                    return Err(DriveProductError::Validation(
                        "credential_ref env variable names are empty".to_string(),
                    ));
                }
                let access_key_id = std::env::var(access_key_name).map_err(|_| {
                    DriveProductError::Internal(format!(
                        "missing env variable for credential_ref access key: {access_key_name}"
                    ))
                })?;
                let secret_access_key = std::env::var(secret_key_name).map_err(|_| {
                    DriveProductError::Internal(format!(
                        "missing env variable for credential_ref secret key: {secret_key_name}"
                    ))
                })?;
                let session_token = parts.get(2).and_then(|name| {
                    let trimmed = name.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        std::env::var(trimmed)
                            .ok()
                            .filter(|value| !value.trim().is_empty())
                    }
                });
                return Ok(S3CredentialSnapshot {
                    access_key_id,
                    secret_access_key,
                    session_token,
                });
            }
        }

        let access_key_id = std::env::var("SDKWORK_DRIVE_S3_ACCESS_KEY_ID").map_err(|_| {
            DriveProductError::Internal(
                "missing SDKWORK_DRIVE_S3_ACCESS_KEY_ID for s3-compatible signing".to_string(),
            )
        })?;
        let secret_access_key =
            std::env::var("SDKWORK_DRIVE_S3_SECRET_ACCESS_KEY").map_err(|_| {
                DriveProductError::Internal(
                    "missing SDKWORK_DRIVE_S3_SECRET_ACCESS_KEY for s3-compatible signing"
                        .to_string(),
                )
            })?;
        let session_token = std::env::var("SDKWORK_DRIVE_S3_SESSION_TOKEN")
            .ok()
            .filter(|value| !value.trim().is_empty());
        Ok(S3CredentialSnapshot {
            access_key_id,
            secret_access_key,
            session_token,
        })
    }

    fn build_fallback_payload(&self, command: DownloadSignCommand) -> SignedDownloadPayload {
        let base = self.source_base_url.trim_end_matches('/');
        let object_key = command.object_key.trim_start_matches('/');
        let url = format!(
            "{base}/{}/{}?expiresAt={}&signature=local-placeholder",
            command.bucket, object_key, command.expires_at_epoch_ms
        );
        SignedDownloadPayload {
            method: "GET".to_string(),
            raw_url: url,
            headers: BTreeMap::new(),
            expires_at_epoch_ms: command.expires_at_epoch_ms,
        }
    }
}

#[async_trait]
impl DriveDownloadSigner for AppDownloadSigner {
    async fn sign_download(
        &self,
        command: DownloadSignCommand,
    ) -> Result<SignedDownloadPayload, DriveProductError> {
        let provider = self.find_active_provider_by_bucket(&command.bucket).await?;
        let Some(provider) = provider else {
            return Ok(self.build_fallback_payload(command));
        };
        match &provider.provider_kind {
            DriveStorageProviderKind::S3Compatible
            | DriveStorageProviderKind::AliyunOss
            | DriveStorageProviderKind::GoogleCloudStorage
            | DriveStorageProviderKind::Custom(_) => {
                let creds = Self::resolve_s3_credentials(provider.credential_ref.as_deref())?;
                let provider_profile = S3ProviderProfile::from_provider_kind(
                    provider.provider_kind.as_str(),
                    Some(provider.endpoint_url.as_str()),
                );
                let region = provider
                    .region
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToString::to_string)
                    .or_else(|| {
                        std::env::var("SDKWORK_DRIVE_S3_REGION")
                            .ok()
                            .map(|value| value.trim().to_string())
                            .filter(|value| !value.is_empty())
                    })
                    .unwrap_or_else(|| provider_profile.default_region().to_string());
                let force_path_style = provider.path_style;
                let strict_tls = Self::read_bool_env("SDKWORK_DRIVE_S3_STRICT_TLS", true);
                let object_store = S3DriveObjectStore::new(S3StoreConfig {
                    provider_profile,
                    endpoint: Some(provider.endpoint_url.clone()),
                    region,
                    default_bucket: provider.bucket.clone(),
                    access_key_id: creds.access_key_id,
                    secret_access_key: creds.secret_access_key,
                    session_token: creds.session_token,
                    force_path_style,
                    strict_tls,
                })
                .await
                .map_err(|error| {
                    DriveProductError::Internal(format!(
                        "build s3-compatible object store failed: {error}"
                    ))
                })?;

                let now_epoch_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_millis() as i64)
                    .unwrap_or(0);
                let ttl_seconds =
                    ((command.expires_at_epoch_ms - now_epoch_ms) / 1000).clamp(1, 3600) as u32;
                let signed = object_store
                    .presign_download(PresignDownloadRequest {
                        locator: DriveObjectLocator {
                            bucket: command.bucket,
                            object_key: command.object_key,
                        },
                        expires_in_seconds: ttl_seconds,
                    })
                    .await
                    .map_err(map_object_store_error)?;
                Ok(SignedDownloadPayload {
                    method: signed.method,
                    raw_url: signed.url,
                    headers: signed.headers,
                    expires_at_epoch_ms: signed.expires_at_epoch_ms,
                })
            }
            _ => Ok(self.build_fallback_payload(command)),
        }
    }
}

#[derive(Debug, Clone)]
struct ActiveStorageProviderRecord {
    provider_kind: DriveStorageProviderKind,
    endpoint_url: String,
    region: Option<String>,
    bucket: String,
    path_style: bool,
    credential_ref: Option<String>,
}

#[derive(Debug, Clone)]
struct S3CredentialSnapshot {
    access_key_id: String,
    secret_access_key: String,
    session_token: Option<String>,
}

fn map_object_store_error(error: DriveObjectStoreError) -> DriveProductError {
    match error.kind {
        DriveObjectStoreErrorKind::NotFound => DriveProductError::NotFound(error.message),
        DriveObjectStoreErrorKind::InvalidRequest => DriveProductError::Validation(error.message),
        DriveObjectStoreErrorKind::Conflict => DriveProductError::Conflict(error.message),
        DriveObjectStoreErrorKind::PermissionDenied => {
            DriveProductError::PermissionDenied(error.message)
        }
        _ => DriveProductError::Internal(error.message),
    }
}
