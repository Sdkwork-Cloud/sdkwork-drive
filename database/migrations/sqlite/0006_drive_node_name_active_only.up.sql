DROP INDEX IF EXISTS ux_dr_drive_node_root_name_live;
DROP INDEX IF EXISTS ux_dr_drive_node_child_name_live;

CREATE UNIQUE INDEX ux_dr_drive_node_root_name_live
    ON dr_drive_node (tenant_id, space_id, node_name)
    WHERE parent_node_id IS NULL AND lifecycle_status = 'active';

CREATE UNIQUE INDEX ux_dr_drive_node_child_name_live
    ON dr_drive_node (tenant_id, space_id, parent_node_id, node_name)
    WHERE parent_node_id IS NOT NULL AND lifecycle_status = 'active';
