//! SQL helpers for ACL-aware list queries.
//!
//! Encodes inherited reader permission checks in the database so list endpoints
//! do not need per-row `resolve_effective_node_access` round trips.

pub(crate) const READER_SATISFYING_ROLES: &[&str] = &["owner", "writer", "commenter", "reader"];

fn reader_roles_sql() -> String {
    READER_SATISFYING_ROLES
        .iter()
        .map(|role| format!("'{role}'"))
        .collect::<Vec<_>>()
        .join(", ")
}

fn node_ancestors_cte(node_alias: &str) -> String {
    format!(
        "WITH RECURSIVE node_ancestors(id) AS (
            SELECT {node_alias}.id
            UNION ALL
            SELECT current_node.parent_node_id
            FROM dr_drive_node current_node
            INNER JOIN node_ancestors ancestor ON current_node.id = ancestor.id
            WHERE current_node.tenant_id = {node_alias}.tenant_id
              AND current_node.parent_node_id IS NOT NULL
        )"
    )
}

/// Returns an `EXISTS` predicate that is true when `node_alias` is readable by
/// the subject bound to `subject_type_bind` and `subject_id_bind`.
pub(crate) fn reader_inherited_permission_exists_sql(
    node_alias: &str,
    subject_type_bind: &str,
    subject_id_bind: &str,
) -> String {
    let roles = reader_roles_sql();
    format!(
        "EXISTS (
            {ancestors}
            SELECT 1
            FROM dr_drive_node_permission permission_row
            INNER JOIN node_ancestors ancestor ON permission_row.node_id = ancestor.id
            WHERE permission_row.tenant_id = {node_alias}.tenant_id
              AND permission_row.subject_type = {subject_type_bind}
              AND permission_row.subject_id = {subject_id_bind}
              AND permission_row.lifecycle_status = 'active'
              AND permission_row.role IN ({roles})
            LIMIT 1
        )",
        ancestors = node_ancestors_cte(node_alias),
        node_alias = node_alias,
        subject_type_bind = subject_type_bind,
        subject_id_bind = subject_id_bind,
        roles = roles,
    )
}

/// Returns a predicate that matches nodes visible in the shared-with-me view.
pub(crate) fn shared_with_me_visible_sql(
    node_alias: &str,
    subject_type_bind: &str,
    subject_id_bind: &str,
    now_epoch_ms_bind: &str,
) -> String {
    let roles = reader_roles_sql();
    let reader_predicate =
        reader_inherited_permission_exists_sql(node_alias, subject_type_bind, subject_id_bind);
    format!(
        "(
            NOT EXISTS (
                SELECT 1
                FROM dr_drive_space space_row
                WHERE space_row.tenant_id = {node_alias}.tenant_id
                  AND space_row.id = {node_alias}.space_id
                  AND space_row.lifecycle_status = 'active'
                  AND space_row.owner_subject_type = {subject_type_bind}
                  AND space_row.owner_subject_id = {subject_id_bind}
            )
            AND {reader_predicate}
            AND (
                EXISTS (
                    {permission_ancestors}
                    SELECT 1
                    FROM dr_drive_node_permission permission_row
                    INNER JOIN node_ancestors ancestor ON permission_row.node_id = ancestor.id
                    WHERE permission_row.tenant_id = {node_alias}.tenant_id
                      AND permission_row.subject_type = {subject_type_bind}
                      AND permission_row.subject_id = {subject_id_bind}
                      AND permission_row.lifecycle_status = 'active'
                      AND permission_row.role IN ({roles})
                      AND permission_row.created_by != {subject_id_bind}
                    LIMIT 1
                )
                OR EXISTS (
                    {share_link_ancestors}
                    SELECT 1
                    FROM dr_drive_node_share_link share_link_row
                    INNER JOIN node_ancestors ancestor ON share_link_row.node_id = ancestor.id
                    WHERE share_link_row.tenant_id = {node_alias}.tenant_id
                      AND share_link_row.lifecycle_status = 'active'
                      AND share_link_row.created_by != {subject_id_bind}
                      AND (
                        share_link_row.expires_at_epoch_ms IS NULL
                        OR share_link_row.expires_at_epoch_ms > {now_epoch_ms_bind}
                      )
                    LIMIT 1
                )
            )
        )",
        node_alias = node_alias,
        subject_type_bind = subject_type_bind,
        subject_id_bind = subject_id_bind,
        reader_predicate = reader_predicate,
        roles = roles,
        permission_ancestors = node_ancestors_cte(node_alias),
        share_link_ancestors = node_ancestors_cte(node_alias),
        now_epoch_ms_bind = now_epoch_ms_bind,
    )
}

#[cfg(test)]
mod tests {
    use super::{reader_inherited_permission_exists_sql, shared_with_me_visible_sql};

    #[test]
    fn reader_predicate_uses_recursive_ancestor_walk() {
        let sql = reader_inherited_permission_exists_sql("n", "$4", "$5");
        assert!(sql.contains("WITH RECURSIVE node_ancestors"));
        assert!(sql.contains("permission_row.subject_type = $4"));
        assert!(sql.contains("'reader'"));
    }

    #[test]
    fn shared_with_me_predicate_checks_grant_creator_and_share_links() {
        let sql = shared_with_me_visible_sql("n", "$2", "$3", "$4");
        assert!(sql.contains("permission_row.created_by != $3"));
        assert!(sql.contains("dr_drive_node_share_link"));
        assert!(sql.contains("owner_subject_id = $3"));
    }
}
