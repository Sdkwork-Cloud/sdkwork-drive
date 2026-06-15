use crate::dto::{FlexibleI64, PrepareUploaderUploadRequest};
use crate::error::{validation_problem, ProblemDetail};
use crate::time::current_epoch_ms;
use crate::validators::require_non_empty_text;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::application::uploader_service::{
    PrepareUploaderUploadCommand, UploaderActor, UploaderRetention, UploaderTarget,
};
use sdkwork_drive_workspace_service::domain::uploader::DriveUploadItem;
use sqlx::Row;

pub(crate) fn prepare_uploader_command(
    payload: PrepareUploaderUploadRequest,
) -> Result<PrepareUploaderUploadCommand, (StatusCode, Json<ProblemDetail>)> {
    let app_id = require_non_empty_text(payload.app_id, "appId")?;
    let actor = match payload.user_id {
        Some(user_id) if !user_id.trim().is_empty() => UploaderActor::User {
            user_id: user_id.trim().to_string(),
        },
        _ => UploaderActor::Anonymous {
            anonymous_id: payload
                .anonymous_id
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| format!("app:{app_id}:anonymous")),
        },
    };
    let target = match payload.space_id {
        Some(space_id) if !space_id.trim().is_empty() => UploaderTarget::Space {
            space_id: space_id.trim().to_string(),
            parent_node_id: payload.parent_node_id,
            share_token: payload.share_token,
        },
        _ => UploaderTarget::AutoUploadSpace {
            parent_node_id: payload.parent_node_id,
        },
    };
    let retention = match payload.retention {
        Some(retention) if retention.mode.trim() == "temporary" => UploaderRetention::Temporary {
            ttl_seconds: retention
                .ttl_seconds
                .map(FlexibleI64::into_i64)
                .unwrap_or(86_400),
            cleanup_action: retention
                .cleanup_action
                .unwrap_or_else(|| "soft_delete".to_string()),
            hard_delete_after_seconds: retention
                .hard_delete_after_seconds
                .map(FlexibleI64::into_i64),
        },
        Some(retention) if retention.mode.trim() == "long_term" => UploaderRetention::LongTerm,
        Some(_) => {
            return Err(validation_problem(
                "retention.mode must be temporary or long_term",
            ));
        }
        None => UploaderRetention::LongTerm,
    };

    Ok(PrepareUploaderUploadCommand {
        id: payload.id,
        task_id: payload.task_id,
        tenant_id: payload.tenant_id,
        organization_id: payload.organization_id,
        actor,
        app_id,
        app_resource_type: payload.app_resource_type,
        app_resource_id: payload.app_resource_id,
        scene: payload.scene,
        source: payload.source,
        upload_profile_code: payload
            .upload_profile_code
            .unwrap_or_else(|| "generic".to_string()),
        file_fingerprint: payload.file_fingerprint,
        original_file_name: payload.original_file_name,
        content_type: payload.content_type,
        content_length: payload.content_length.into_i64(),
        chunk_size_bytes: payload.chunk_size_bytes.into_i64(),
        target,
        retention,
        operator_id: payload.operator_id,
        now_epoch_ms: payload
            .now_epoch_ms
            .map(FlexibleI64::into_i64)
            .unwrap_or_else(current_epoch_ms),
    })
}

pub(crate) fn map_uploader_upload_item_row(
    row: &sqlx::any::AnyRow,
) -> Result<DriveUploadItem, (StatusCode, Json<ProblemDetail>)> {
    Ok(DriveUploadItem {
        id: row.get("id"),
        task_id: row.get("task_id"),
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        user_id: row.get("user_id"),
        actor_type: row.get("actor_type"),
        actor_id: row.get("actor_id"),
        app_id: row.get("app_id"),
        app_resource_type: row.get("app_resource_type"),
        app_resource_id: row.get("app_resource_id"),
        scene: row.get("scene"),
        source: row.get("source"),
        upload_profile_code: row.get("upload_profile_code"),
        file_fingerprint: row.get("file_fingerprint"),
        space_id: row.get("space_id"),
        node_id: row.get("node_id"),
        upload_session_id: row.get("upload_session_id"),
        storage_provider_id: row.get("storage_provider_id"),
        storage_upload_id: row.get("storage_upload_id"),
        object_bucket: row.try_get("object_bucket").ok(),
        object_key: row.try_get("object_key").ok(),
        original_file_name: row.get("original_file_name"),
        file_extension: row.get("file_extension"),
        content_type: row.get("content_type"),
        content_type_group: row.get("content_type_group"),
        detected_content_type: row.get("detected_content_type"),
        content_length: row.get("content_length"),
        checksum_sha256_hex: row.get("checksum_sha256_hex"),
        chunk_size_bytes: row.get("chunk_size_bytes"),
        total_parts: i64::from(row.get::<i32, _>("total_parts")),
        uploaded_parts_count: i64::from(row.get::<i32, _>("uploaded_parts_count")),
        uploaded_bytes: row.get("uploaded_bytes"),
        status: row.get("status"),
        retention_mode: row.get("retention_mode"),
        retention_expires_at_epoch_ms: row.get("retention_expires_at_epoch_ms"),
        cleanup_action: row.get("cleanup_action"),
        hard_delete_after_epoch_ms: row.get("hard_delete_after_epoch_ms"),
        cleanup_status: row.get("cleanup_status"),
        post_process_status: row.get("post_process_status"),
    })
}
