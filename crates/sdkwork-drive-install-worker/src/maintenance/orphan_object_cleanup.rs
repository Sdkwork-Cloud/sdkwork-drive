use sqlx::AnyPool;

/// Cleanup result for orphan objects.
#[derive(Debug, Clone)]
pub struct OrphanCleanupResult {
    pub orphaned_nodes: i64,
    pub cleaned_objects: i64,
}

/// Clean up orphan objects.
///
/// This function removes nodes that reference non-existent spaces
/// or have no parent in the node hierarchy.
pub async fn cleanup_orphan_objects(pool: &AnyPool) -> Result<OrphanCleanupResult, sqlx::Error> {
    // Find nodes with non-existent spaces
    let orphaned_nodes = sqlx::query_scalar::<_, i64>(
        "DELETE FROM drive_node WHERE space_id NOT IN (SELECT id FROM drive_space) RETURNING COUNT(*)"
    )
    .fetch_one(pool)
    .await?;

    // Find nodes with non-existent parents (except root nodes)
    let orphaned_children = sqlx::query_scalar::<_, i64>(
        "DELETE FROM drive_node WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM drive_node) RETURNING COUNT(*)"
    )
    .fetch_one(pool)
    .await?;

    Ok(OrphanCleanupResult {
        orphaned_nodes: orphaned_nodes + orphaned_children,
        cleaned_objects: 0,
    })
}
