use async_trait::async_trait;
use sqlx::{Any, AnyPool, QueryBuilder, Row};

use crate::domain::sandbox::{AuthorizedSandboxMount, DriveSandboxGrant, DriveSandboxVolume};
use crate::ports::sandbox_principal_resolver::EffectiveSandboxPrincipal;
use crate::ports::sandbox_store::DriveSandboxStore;
use crate::DriveServiceError;

#[derive(Clone, Debug)]
pub struct SqlSandboxStore {
    pool: AnyPool,
}

impl SqlSandboxStore {
    pub fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveSandboxStore for SqlSandboxStore {
    async fn list_accessible_for_principals(
        &self,
        tenant_id: &str,
        principals: &[EffectiveSandboxPrincipal],
        offset: i64,
        limit: i64,
    ) -> Result<(Vec<DriveSandboxVolume>, i64), DriveServiceError> {
        if principals.is_empty() {
            return Ok((Vec::new(), 0));
        }
        let mut query = QueryBuilder::<Any>::new(
            "SELECT v.id, v.tenant_id, v.organization_id, v.display_name, v.root_entry_id, v.provider_kind, v.lifecycle_status, v.default_access, CASE WHEN MAX(CASE WHEN g.access_level = 'full' THEN 1 ELSE 0 END) = 1 THEN 'full' ELSE 'read_only' END AS effective_access, v.version FROM dr_drive_sandbox_volume v JOIN dr_drive_sandbox_grant g ON g.sandbox_id = v.id WHERE v.tenant_id = "
        );
        query
            .push_bind(tenant_id)
            .push(" AND v.lifecycle_status <> 'disabled' AND (");
        let mut predicate = query.separated(" OR ");
        for principal in principals {
            predicate
                .push("(g.subject_type = ")
                .push_bind_unseparated(&principal.subject_type)
                .push_unseparated(" AND g.subject_id = ")
                .push_bind_unseparated(&principal.subject_id)
                .push_unseparated(")");
        }
        query
            .push(") GROUP BY v.id, v.tenant_id, v.organization_id, v.display_name, v.root_entry_id, v.provider_kind, v.lifecycle_status, v.default_access, v.version ORDER BY v.display_name ASC, v.id ASC LIMIT ")
            .push_bind(limit)
            .push(" OFFSET ")
            .push_bind(offset);
        let rows = query.build().fetch_all(&self.pool).await.map_err(|error| {
            DriveServiceError::Internal(format!("list accessible sandbox volumes failed: {error}"))
        })?;
        let mut count_query = QueryBuilder::<Any>::new(
            "SELECT COUNT(DISTINCT v.id) AS total FROM dr_drive_sandbox_volume v JOIN dr_drive_sandbox_grant g ON g.sandbox_id = v.id WHERE v.tenant_id = "
        );
        count_query
            .push_bind(tenant_id)
            .push(" AND v.lifecycle_status <> 'disabled' AND (");
        let mut count_predicate = count_query.separated(" OR ");
        for principal in principals {
            count_predicate
                .push("(g.subject_type = ")
                .push_bind_unseparated(&principal.subject_type)
                .push_unseparated(" AND g.subject_id = ")
                .push_bind_unseparated(&principal.subject_id)
                .push_unseparated(")");
        }
        count_query.push(")");
        let total: i64 = count_query
            .build_query_scalar()
            .fetch_one(&self.pool)
            .await
            .map_err(|error| {
                DriveServiceError::Internal(format!(
                    "count accessible sandbox volumes failed: {error}"
                ))
            })?;
        Ok((rows.into_iter().map(map_volume).collect(), total))
    }

    async fn list_accessible(
        &self,
        tenant_id: &str,
        subject_type: &str,
        subject_id: &str,
        offset: i64,
        limit: i64,
    ) -> Result<Vec<DriveSandboxVolume>, DriveServiceError> {
        let rows = sqlx::query(
            "SELECT v.id, v.tenant_id, v.organization_id, v.display_name, v.root_entry_id, v.provider_kind, v.lifecycle_status, v.default_access, g.access_level AS effective_access, v.version
             FROM dr_drive_sandbox_volume v
             LEFT JOIN dr_drive_sandbox_grant g ON g.sandbox_id = v.id AND g.subject_type = $2 AND g.subject_id = $3
             WHERE v.tenant_id = $1 AND v.lifecycle_status <> 'disabled' AND g.id IS NOT NULL
             ORDER BY v.display_name ASC, v.id ASC LIMIT $4 OFFSET $5"
        ).bind(tenant_id).bind(subject_type).bind(subject_id).bind(limit).bind(offset).fetch_all(&self.pool).await
            .map_err(|error| DriveServiceError::Internal(format!("list sandbox volumes failed: {error}")))?;
        Ok(rows.into_iter().map(map_volume).collect())
    }

    async fn get_grant(
        &self,
        tenant_id: &str,
        sandbox_id: &str,
        subject_type: &str,
        subject_id: &str,
    ) -> Result<Option<DriveSandboxGrant>, DriveServiceError> {
        let row = sqlx::query(
            "SELECT g.sandbox_id, g.subject_type, g.subject_id, g.access_level, v.lifecycle_status
             FROM dr_drive_sandbox_grant g JOIN dr_drive_sandbox_volume v ON v.id = g.sandbox_id
             WHERE v.tenant_id = $1 AND g.sandbox_id = $2 AND g.subject_type = $3 AND g.subject_id = $4 AND v.lifecycle_status <> 'disabled'"
        ).bind(tenant_id).bind(sandbox_id).bind(subject_type).bind(subject_id).fetch_optional(&self.pool).await
            .map_err(|error| DriveServiceError::Internal(format!("get sandbox grant failed: {error}")))?;
        Ok(row.map(|row| DriveSandboxGrant {
            sandbox_id: row.get("sandbox_id"),
            subject_type: row.get("subject_type"),
            subject_id: row.get("subject_id"),
            access_level: row.get("access_level"),
            lifecycle_status: row.get("lifecycle_status"),
        }))
    }

    async fn get_authorized_mount_for_principals(
        &self,
        tenant_id: &str,
        sandbox_id: &str,
        principals: &[EffectiveSandboxPrincipal],
    ) -> Result<Option<AuthorizedSandboxMount>, DriveServiceError> {
        if principals.is_empty() {
            return Ok(None);
        }

        let mut query = QueryBuilder::<Any>::new(
            "SELECT v.id, v.root_entry_id, v.provider_kind, v.provider_root_ref, \
                    v.lifecycle_status, v.version, \
                    CASE WHEN MAX(CASE WHEN g.access_level = 'full' THEN 1 ELSE 0 END) = 1 \
                         THEN 'full' ELSE 'read_only' END AS effective_access \
             FROM dr_drive_sandbox_volume v \
             JOIN dr_drive_sandbox_grant g ON g.sandbox_id = v.id \
             WHERE v.tenant_id = ",
        );
        query
            .push_bind(tenant_id)
            .push(" AND v.id = ")
            .push_bind(sandbox_id)
            .push(" AND v.lifecycle_status <> 'disabled' AND (");
        let mut predicate = query.separated(" OR ");
        for principal in principals {
            predicate
                .push("(g.subject_type = ")
                .push_bind_unseparated(&principal.subject_type)
                .push_unseparated(" AND g.subject_id = ")
                .push_bind_unseparated(&principal.subject_id)
                .push_unseparated(")");
        }
        query.push(
            ") GROUP BY v.id, v.root_entry_id, v.provider_kind, v.provider_root_ref, \
                        v.lifecycle_status, v.version",
        );

        let row = query
            .build()
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| {
                DriveServiceError::Internal(format!("get authorized sandbox mount failed: {error}"))
            })?;

        Ok(row.map(|row| {
            AuthorizedSandboxMount::new(
                row.get("id"),
                row.get("root_entry_id"),
                row.get("provider_kind"),
                row.get("provider_root_ref"),
                row.get("lifecycle_status"),
                row.get("effective_access"),
                row.get("version"),
            )
        }))
    }
}

fn map_volume(row: sqlx::any::AnyRow) -> DriveSandboxVolume {
    DriveSandboxVolume {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        display_name: row.get("display_name"),
        root_entry_id: row.get("root_entry_id"),
        provider_kind: row.get("provider_kind"),
        lifecycle_status: row.get("lifecycle_status"),
        default_access: row.get("default_access"),
        effective_access: row.get("effective_access"),
        version: row.get("version"),
    }
}
