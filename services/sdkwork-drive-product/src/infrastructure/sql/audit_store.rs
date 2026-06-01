use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::sqlite::SqliteRow;
use sqlx::QueryBuilder;
use sqlx::Row;
use sqlx::Sqlite;

use crate::domain::audit::DriveAuditEvent;
use crate::ports::audit_store::{
    AuditEventPage, DriveAuditStore, ListAuditEventsQuery, NewDriveAuditEvent,
};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlAuditStore {
    pool: SqlitePool,
}

impl SqlAuditStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveAuditStore for SqlAuditStore {
    async fn append_event(
        &self,
        new_event: &NewDriveAuditEvent,
    ) -> Result<DriveAuditEvent, DriveProductError> {
        let result = sqlx::query(
            "INSERT INTO drive_audit_event (
                tenant_id, action, resource_type, resource_id, operator_id, request_id, trace_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )
        .bind(&new_event.tenant_id)
        .bind(&new_event.action)
        .bind(&new_event.resource_type)
        .bind(&new_event.resource_id)
        .bind(&new_event.operator_id)
        .bind(&new_event.request_id)
        .bind(&new_event.trace_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("insert drive_audit_event failed: {error}"))
        })?;

        let row = sqlx::query(
            "SELECT id, tenant_id, action, resource_type, resource_id, operator_id, request_id, trace_id, created_at
             FROM drive_audit_event
             WHERE id=?1",
        )
        .bind(result.last_insert_rowid())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("read inserted drive_audit_event failed: {error}"))
        })?;
        map_row_to_audit_event(&row)
    }

    async fn list_events(
        &self,
        query: &ListAuditEventsQuery,
    ) -> Result<AuditEventPage, DriveProductError> {
        let offset = i64::from((query.page - 1) * query.page_size);
        let limit = i64::from(query.page_size);

        let mut list_query = QueryBuilder::<Sqlite>::new(
            "SELECT id, tenant_id, action, resource_type, resource_id, operator_id, request_id, trace_id, created_at
             FROM drive_audit_event",
        );
        let mut has_where = false;
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "tenant_id",
            query.tenant_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "action",
            query.action.as_deref(),
        );
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "resource_type",
            query.resource_type.as_deref(),
        );
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "resource_id",
            query.resource_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "request_id",
            query.request_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut list_query,
            &mut has_where,
            "trace_id",
            query.trace_id.as_deref(),
        );
        list_query
            .push(" ORDER BY id DESC LIMIT ")
            .push_bind(limit)
            .push(" OFFSET ")
            .push_bind(offset);

        let rows = list_query
            .build()
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!("list drive_audit_event failed: {error}"))
            })?;

        let mut count_query = QueryBuilder::<Sqlite>::new(
            "SELECT COUNT(1) AS total_count
             FROM drive_audit_event",
        );
        let mut has_where = false;
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "tenant_id",
            query.tenant_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "action",
            query.action.as_deref(),
        );
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "resource_type",
            query.resource_type.as_deref(),
        );
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "resource_id",
            query.resource_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "request_id",
            query.request_id.as_deref(),
        );
        push_optional_equals_filter(
            &mut count_query,
            &mut has_where,
            "trace_id",
            query.trace_id.as_deref(),
        );

        let total: i64 = count_query
            .build_query_scalar()
            .fetch_one(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!("count drive_audit_event failed: {error}"))
            })?;

        let items = rows
            .iter()
            .map(map_row_to_audit_event)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(AuditEventPage {
            items,
            page: query.page,
            page_size: query.page_size,
            total,
        })
    }
}

fn map_row_to_audit_event(row: &SqliteRow) -> Result<DriveAuditEvent, DriveProductError> {
    let action: String = row.get("action");
    if action.trim().is_empty() {
        return Err(DriveProductError::Internal(
            "drive_audit_event.action is empty".to_string(),
        ));
    }

    Ok(DriveAuditEvent {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        action,
        resource_type: row.get("resource_type"),
        resource_id: row.get("resource_id"),
        operator_id: row.get("operator_id"),
        request_id: row.get("request_id"),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
    })
}

fn push_optional_equals_filter(
    query_builder: &mut QueryBuilder<'_, Sqlite>,
    has_where: &mut bool,
    column_name: &str,
    value: Option<&str>,
) {
    let Some(value) = value else {
        return;
    };

    if !*has_where {
        query_builder.push(" WHERE ");
        *has_where = true;
    } else {
        query_builder.push(" AND ");
    }

    query_builder
        .push(column_name)
        .push(" = ")
        .push_bind(value.to_string());
}
