use crate::context::DriveAppContext;

pub const DRIVE_STORAGE_ADMIN_PERMISSION: &str = "drive.storage.admin";

pub fn can_access_drive_admin_storage(context: &DriveAppContext) -> bool {
    context
        .permission_scope
        .iter()
        .any(|scope| scope == DRIVE_STORAGE_ADMIN_PERMISSION || is_drive_admin_scope(scope))
}

fn is_drive_admin_scope(scope: &str) -> bool {
    if scope == "drive.*" {
        return true;
    }
    scope.starts_with("drive.") && scope.ends_with(".admin")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn context_with_scopes(scopes: &[&str]) -> DriveAppContext {
        DriveAppContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            organization_id: None,
            session_id: None,
            app_id: Some("appbase".to_string()),
            environment: Some("prod".to_string()),
            deployment_mode: Some("saas".to_string()),
            auth_level: Some("password".to_string()),
            data_scope: Vec::new(),
            permission_scope: scopes.iter().map(|scope| (*scope).to_string()).collect(),
            actor_id: "user-001".to_string(),
            actor_kind: "user".to_string(),
            device_id: None,
            request_id: "request-001".to_string(),
            trace_id: "trace-001".to_string(),
        }
    }

    #[test]
    fn allows_drive_storage_admin_permission() {
        let context = context_with_scopes(&[DRIVE_STORAGE_ADMIN_PERMISSION]);
        assert!(can_access_drive_admin_storage(&context));
    }

    #[test]
    fn allows_drive_wildcard_permission() {
        let context = context_with_scopes(&["drive.*"]);
        assert!(can_access_drive_admin_storage(&context));
    }

    #[test]
    fn rejects_missing_admin_permission() {
        let context = context_with_scopes(&["drive.read"]);
        assert!(!can_access_drive_admin_storage(&context));
    }
}
