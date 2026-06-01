use std::path::PathBuf;

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

#[test]
fn observability_event_names_are_stable_across_code_and_spec() {
    let root = workspace_root();
    let observability_lib =
        std::fs::read_to_string(root.join("crates/sdkwork-drive-observability/src/lib.rs"))
            .expect("observability lib should exist");
    let admin_api =
        std::fs::read_to_string(root.join("services/sdkwork-drive-admin-api/src/lib.rs"))
            .expect("admin api should exist");
    let app_api = std::fs::read_to_string(root.join("services/sdkwork-drive-app-api/src/lib.rs"))
        .expect("app api should exist");
    let spec = std::fs::read_to_string(
        root.join("docs/superpowers/specs/2026-06-01-drive-observability-event-dictionary.md"),
    )
    .expect("observability event dictionary spec should exist");

    let events = [
        "drive.audit_events.list",
        "drive.maintenance.jobs.list",
        "drive.maintenance.object_sweep",
        "drive.maintenance.upload_session_sweep",
        "drive.app.spaces.list",
        "drive.app.spaces.create",
        "drive.app.upload_sessions.create",
        "drive.app.download_urls.create",
        "drive.app.download_tokens.resolve",
    ];
    for event_name in events {
        assert!(
            observability_lib.contains(event_name),
            "observability crate missing event constant value: {event_name}"
        );
        assert!(
            spec.contains(event_name),
            "observability event dictionary spec missing event: {event_name}"
        );
    }

    let error_kinds = [
        "validation",
        "conflict",
        "not_found",
        "permission_denied",
        "internal",
    ];
    for error_kind in error_kinds {
        assert!(
            observability_lib.contains(error_kind),
            "observability crate missing error_kind constant value: {error_kind}"
        );
        assert!(
            spec.contains(error_kind),
            "observability event dictionary spec missing error_kind: {error_kind}"
        );
    }

    for expected_reference in [
        "events::ADMIN_AUDIT_EVENTS_LIST",
        "events::ADMIN_MAINTENANCE_JOBS_LIST",
        "events::ADMIN_MAINTENANCE_OBJECT_SWEEP",
        "events::ADMIN_MAINTENANCE_UPLOAD_SESSION_SWEEP",
    ] {
        assert!(
            admin_api.contains(expected_reference),
            "admin api missing observability event reference: {expected_reference}"
        );
    }
    assert!(
        admin_api.contains("error_kinds::"),
        "admin api must reference observability error_kinds constants"
    );

    for expected_reference in [
        "events::APP_SPACES_LIST",
        "events::APP_SPACES_CREATE",
        "events::APP_UPLOAD_SESSIONS_CREATE",
        "events::APP_DOWNLOAD_URLS_CREATE",
        "events::APP_DOWNLOAD_TOKENS_RESOLVE",
    ] {
        assert!(
            app_api.contains(expected_reference),
            "app api missing observability event reference: {expected_reference}"
        );
    }
    assert!(
        app_api.contains("error_kinds::"),
        "app api must reference observability error_kinds constants"
    );
}
