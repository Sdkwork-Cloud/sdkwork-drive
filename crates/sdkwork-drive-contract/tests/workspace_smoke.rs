use std::path::{Path, PathBuf};

fn read_rust_source_tree(path: impl AsRef<Path>) -> String {
    let path = path.as_ref();
    let mut entries = std::fs::read_dir(path)
        .unwrap_or_else(|error| {
            panic!(
                "failed to read source directory {}: {error}",
                path.display()
            )
        })
        .map(|entry| {
            entry
                .expect("source directory entry should be readable")
                .path()
        })
        .collect::<Vec<_>>();
    entries.sort();

    let mut source = String::new();
    for entry in entries {
        if entry.is_dir() {
            source.push_str(&read_rust_source_tree(entry));
        } else if entry.extension().is_some_and(|extension| extension == "rs") {
            source.push_str(
                &std::fs::read_to_string(&entry)
                    .unwrap_or_else(|error| panic!("failed to read {}: {error}", entry.display())),
            );
            source.push('\n');
        }
    }
    source
}

#[test]
fn workspace_declares_expected_members() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let manifest_path = root.join("Cargo.toml");
    let manifest = std::fs::read_to_string(manifest_path).expect("Cargo.toml must exist");
    assert!(manifest.contains("crates/sdkwork-drive-contract"));
    assert!(manifest.contains("services/sdkwork-drive-product"));
    assert!(manifest.contains("services/sdkwork-drive-open-api"));
    assert!(manifest.contains("services/sdkwork-drive-app-api"));
    assert!(manifest.contains("services/sdkwork-drive-backend-api"));
    assert!(manifest.contains("crates/sdkwork-drive-storage-opendal"));
    assert!(manifest.contains("services/sdkwork-drive-admin-storage-api"));
    assert!(!manifest.contains("services/sdkwork-drive-admin-api"));
}

#[test]
fn opendal_storage_plugin_is_not_enabled_by_default_in_api_crates() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();

    for manifest in [
        root.join("services/sdkwork-drive-app-api/Cargo.toml"),
        root.join("services/sdkwork-drive-open-api/Cargo.toml"),
        root.join("services/sdkwork-drive-backend-api/Cargo.toml"),
    ] {
        let source = std::fs::read_to_string(&manifest)
            .unwrap_or_else(|error| panic!("{} must be readable: {error}", manifest.display()));
        assert!(
            !source.contains("sdkwork-drive-storage-opendal"),
            "{} must not depend on the OpenDAL plugin unless an explicit feature wires it in",
            manifest.display()
        );
    }
}

#[test]
fn s3_architecture_document_defines_plugin_and_admin_storage_boundaries() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let doc_path = root.join("docs/storage-s3-architecture.md");
    let doc = std::fs::read_to_string(&doc_path)
        .unwrap_or_else(|error| panic!("{} must be readable: {error}", doc_path.display()));

    for required in [
        "crates/sdkwork-drive-storage-opendal",
        "OpenDAL S3 plugin is optional",
        "default disabled",
        "opendal-s3-plugin",
        "SDKWORK_DRIVE_ADMIN_STORAGE_OBJECT_STORE_ADAPTER",
        "Bucket administration remains on the AWS SDK S3 adapter",
        "services/sdkwork-drive-admin-storage-api",
        "/admin/v3/api/drive/storage/providers",
        "Volcengine TOS",
        "sdkwork-drive-admin-xxx",
    ] {
        assert!(
            doc.contains(required),
            "S3 architecture document must define {required}"
        );
    }
}

#[test]
fn admin_storage_router_exposes_explicit_plugin_config_entrypoints() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();

    let source = read_rust_source_tree(root.join("services/sdkwork-drive-admin-storage-api/src"));

    for required in [
        "pub struct AdminStorageConfig",
        "DriveAdminStorageObjectStoreAdapter",
        "build_router_with_pool_and_config",
        "build_router_with_database_url_and_admin_storage_config",
        "build_router_with_database_config_and_admin_storage_config",
        "AdminStorageConfig::from_env()",
    ] {
        assert!(
            source.contains(required),
            "admin-storage router must expose explicit plugin config entrypoint {required}"
        );
    }
}

#[test]
fn admin_storage_api_has_standalone_binary_entrypoint() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();

    let main_path = root.join("services/sdkwork-drive-admin-storage-api/src/main.rs");
    let source = std::fs::read_to_string(&main_path)
        .unwrap_or_else(|error| panic!("{} must be readable: {error}", main_path.display()));

    for required in [
        "sdkwork_drive_admin_storage_api::build_router_with_database_config",
        "sdkwork_drive_config::DatabaseConfig",
        r#""127.0.0.1:18083""#,
        "serve admin storage api",
    ] {
        assert!(
            source.contains(required),
            "admin-storage binary entrypoint must include {required}"
        );
    }
}

#[test]
fn admin_storage_opendal_dependency_is_optional_and_feature_gated() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();

    let manifest_path = root.join("services/sdkwork-drive-admin-storage-api/Cargo.toml");
    let manifest = std::fs::read_to_string(&manifest_path)
        .unwrap_or_else(|error| panic!("{} must be readable: {error}", manifest_path.display()));

    for required in [
        "default = []",
        r#"opendal-s3-plugin = ["dep:sdkwork-drive-storage-opendal"]"#,
        "sdkwork-drive-storage-opendal",
        "optional = true",
    ] {
        assert!(
            manifest.contains(required),
            "admin-storage manifest must keep OpenDAL feature gated by {required}"
        );
    }
}

#[test]
fn admin_storage_iam_runtime_boundary_is_documented() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();

    let read = |relative_path: &str| {
        let path = root.join(relative_path);
        std::fs::read_to_string(&path)
            .unwrap_or_else(|error| panic!("{} must be readable: {error}", path.display()))
            .replace("\r\n", "\n")
    };

    let readme = read("README.md");
    for required in [
        "Protected app, backend, and admin storage routes require:",
        "Open API share-link",
        "admin storage `/healthz` remain explicitly public",
        "app, backend, and admin storage\nservices only accept trusted gateway AppContext projections",
    ] {
        assert!(
            readme.contains(required),
            "README IAM section must document admin-storage runtime auth boundary: {required}"
        );
    }

    let iam_standard = read("docs/drive-iam-integration-standard.md");
    for required in [
        "App, backend, and admin-storage Drive routes must validate the same dual-token and AppContext projection contract.",
        "Admin-storage `/healthz` is public; `/admin/v3/api/drive/storage/*` is protected.",
    ] {
        assert!(
            iam_standard.contains(required),
            "IAM standard must document admin-storage runtime auth boundary: {required}"
        );
    }

    let s3_architecture = read("docs/storage-s3-architecture.md");
    for required in [
        "Admin-storage runtime routes under `/admin/v3/api/drive/storage/*` require the same dual-token and AppContext projection as app and backend APIs.",
        "`/healthz` is the only public admin-storage runtime route.",
    ] {
        assert!(
            s3_architecture.contains(required),
            "S3 architecture must document admin-storage runtime auth boundary: {required}"
        );
    }
}

#[test]
fn observability_event_dictionary_spec_exists() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let spec_path =
        root.join("docs/superpowers/specs/2026-06-01-drive-observability-event-dictionary.md");
    let spec = std::fs::read_to_string(spec_path)
        .expect("observability event dictionary spec should exist");
    assert!(spec.contains("sdkwork.drive"));
    assert!(spec.contains("drive.audit_events.list"));
    assert!(spec.contains("drive.app.download_tokens.resolve"));
}

#[test]
fn drive_services_do_not_expose_product_local_iam_login_routes() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let roots = [
        root.join("services"),
        root.join("crates/sdkwork-drive-core/src"),
        root.join("crates/sdkwork-drive-http/src"),
        root.join("crates/sdkwork-drive-security/src"),
        root.join("crates/sdkwork-drive-observability/src"),
    ];
    let forbidden = [
        "/app/v3/api/auth",
        "/backend/v3/api/auth",
        "/auth/login",
        "/auth/refresh",
        "user-center/session",
    ];

    let mut offenders = Vec::new();
    for scan_root in roots {
        collect_forbidden_auth_route_refs(&scan_root, &forbidden, &mut offenders);
    }

    assert_eq!(
        offenders,
        Vec::<String>::new(),
        "Drive must integrate IAM login instead of exposing product-local auth/session routes"
    );
}

fn collect_forbidden_auth_route_refs(
    root: &std::path::Path,
    forbidden: &[&str],
    offenders: &mut Vec<String>,
) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if path.file_name().and_then(|value| value.to_str()) == Some("target") {
                continue;
            }
            collect_forbidden_auth_route_refs(&path, forbidden, offenders);
            continue;
        }
        if path.extension().and_then(|value| value.to_str()) != Some("rs") {
            continue;
        }
        let source = std::fs::read_to_string(&path).expect("source file should be readable");
        for forbidden_ref in forbidden {
            if source.contains(forbidden_ref) {
                offenders.push(format!("{} contains {forbidden_ref}", path.display()));
            }
        }
    }
}
