//! ACL SQL predicates for list and change-feed queries.
//!
//! Keep in sync with `sdkwork-routes-drive-app-api/src/acl_sql.rs`.

const READER_SATISFYING_ROLES: &[&str] = &["owner", "writer", "commenter", "reader"];

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

#[cfg(test)]
mod tests {
    use super::reader_inherited_permission_exists_sql;

    #[test]
    fn reader_predicate_uses_recursive_ancestor_walk() {
        let sql = reader_inherited_permission_exists_sql("n", "$4", "$5");
        assert!(sql.contains("WITH RECURSIVE node_ancestors"));
        assert!(sql.contains("permission_row.subject_type = $4"));
        assert!(sql.contains("'reader'"));
    }
}
