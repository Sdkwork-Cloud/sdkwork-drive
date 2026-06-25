use std::path::PathBuf;

use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root_with_env_and_fallback,
};

pub async fn ensure_drive_tenant_application_bootstrap(environment: &str) -> Result<(), String> {
    let app_root = resolve_drive_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
    ensure_tenant_application_from_app_root_with_env_and_fallback(
        environment,
        app_root,
        None,
        &[],
    )
    .await
}

fn resolve_drive_app_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drive_app_root_resolves_to_repository_root() {
        let root = resolve_drive_app_root();
        assert!(root.join("sdkwork.app.config.json").is_file());
    }
}
