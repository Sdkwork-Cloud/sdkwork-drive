use sqlx::AnyPool;

/// Cleanup result for orphan nodes.
#[derive(Debug, Clone)]
pub struct OrphanCleanupResult {
    pub orphaned_nodes: i64,
    pub cleaned_objects: i64,
}

/// Clean up orphan nodes that reference missing spaces or parents.
pub async fn cleanup_orphan_objects(pool: &AnyPool) -> Result<OrphanCleanupResult, sqlx::Error> {
    let orphaned_without_space = sqlx::query_scalar::<_, i64>(
        "DELETE FROM dr_drive_node
         WHERE space_id NOT IN (SELECT id FROM dr_drive_space)
         RETURNING 1",
    )
    .fetch_all(pool)
    .await?
    .len() as i64;

    let orphaned_children = sqlx::query_scalar::<_, i64>(
        "DELETE FROM dr_drive_node
         WHERE parent_node_id IS NOT NULL
           AND parent_node_id NOT IN (SELECT id FROM dr_drive_node)
         RETURNING 1",
    )
    .fetch_all(pool)
    .await?
    .len() as i64;

    let cleaned_objects = sqlx::query_scalar::<_, i64>(
        "DELETE FROM dr_drive_storage_object
         WHERE node_id NOT IN (SELECT id FROM dr_drive_node)
         RETURNING 1",
    )
    .fetch_all(pool)
    .await?
    .len() as i64;

    Ok(OrphanCleanupResult {
        orphaned_nodes: orphaned_without_space + orphaned_children,
        cleaned_objects,
    })
}
