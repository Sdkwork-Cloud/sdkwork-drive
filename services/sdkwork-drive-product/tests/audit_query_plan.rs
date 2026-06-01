use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;

#[tokio::test]
async fn audit_event_query_plan_uses_filter_indexes_for_list_and_count_patterns() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    for index in 0..600 {
        let action = if index % 2 == 0 {
            "storage_provider.created"
        } else {
            "storage_provider.updated"
        };
        let request_id = if index % 3 == 0 {
            "request-001"
        } else {
            "request-002"
        };
        let trace_id = if index % 5 == 0 {
            "trace-001"
        } else {
            "trace-002"
        };
        sqlx::query(
            "INSERT INTO drive_audit_event (
                tenant_id, action, resource_type, resource_id, operator_id, request_id, trace_id
            ) VALUES (?1, ?2, 'storage_provider', ?3, 'admin-001', ?4, ?5)",
        )
        .bind("tenant-001")
        .bind(action)
        .bind(format!("provider-{index:04}"))
        .bind(request_id)
        .bind(trace_id)
        .execute(&pool)
        .await
        .expect("seed audit events should succeed");
    }

    assert_query_plan_uses_index(
        &pool,
        "EXPLAIN QUERY PLAN
         SELECT id
         FROM drive_audit_event
         WHERE action = ?1
         ORDER BY id DESC
         LIMIT ?2 OFFSET ?3",
        &["storage_provider.created", "20", "0"],
        "ix_drive_audit_event_action_created",
    )
    .await;

    assert_query_plan_uses_index(
        &pool,
        "EXPLAIN QUERY PLAN
         SELECT COUNT(1)
         FROM drive_audit_event
         WHERE request_id = ?1",
        &["request-001"],
        "ix_drive_audit_event_request_created",
    )
    .await;

    assert_query_plan_uses_index(
        &pool,
        "EXPLAIN QUERY PLAN
         SELECT COUNT(1)
         FROM drive_audit_event
         WHERE trace_id = ?1",
        &["trace-001"],
        "ix_drive_audit_event_trace_created",
    )
    .await;
}

async fn assert_query_plan_uses_index(
    pool: &sqlx::SqlitePool,
    sql: &str,
    binds: &[&str],
    expected_index_name: &str,
) {
    let mut query = sqlx::query(sql);
    for bind in binds {
        query = query.bind(*bind);
    }
    let rows = query
        .fetch_all(pool)
        .await
        .expect("query plan should be available");
    let plan_details = rows
        .iter()
        .map(|row| row.get::<String, _>("detail"))
        .collect::<Vec<_>>();

    assert!(
        plan_details
            .iter()
            .any(|detail| detail.contains(expected_index_name)),
        "expected query plan to use index {expected_index_name}, got: {:?}",
        plan_details
    );
}
