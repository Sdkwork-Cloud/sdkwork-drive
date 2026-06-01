use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

fn assert_node_script_succeeds(args: &[PathBuf]) {
    let root = workspace_root();
    let mut command = Command::new("node");
    command.current_dir(&root);
    for arg in args {
        command.arg(arg);
    }
    let output = command.output().expect("node command should start");
    assert!(
        output.status.success(),
        "stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn openapi_export_supports_explicit_input_flags() {
    let root = workspace_root();
    assert_node_script_succeeds(&[
        root.join("tools/drive_openapi_export.mjs"),
        PathBuf::from("--check"),
        PathBuf::from("--app-input"),
        root.join("generated/openapi/drive-app-api.openapi.json"),
        PathBuf::from("--backend-input"),
        root.join("generated/openapi/drive-backend-api.openapi.json"),
    ]);
}

#[test]
fn schema_quality_gate_supports_explicit_input_flags() {
    let root = workspace_root();
    assert_node_script_succeeds(&[
        root.join("tools/drive_schema_quality_gate.mjs"),
        PathBuf::from("--app-openapi"),
        root.join("generated/openapi/drive-app-api.openapi.json"),
        PathBuf::from("--backend-openapi"),
        root.join("generated/openapi/drive-backend-api.openapi.json"),
        PathBuf::from("--special-spaces-schema"),
        root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml"),
        PathBuf::from("--security-audit-schema"),
        root.join("docs/schema-registry/tables/004-drive-security-audit.yaml"),
        PathBuf::from("--storage-schema"),
        root.join("docs/schema-registry/tables/003-drive-storage.yaml"),
    ]);
}

#[test]
fn sdk_generate_check_supports_explicit_openapi_and_language_flags() {
    let root = workspace_root();
    assert_node_script_succeeds(&[
        root.join("tools/drive_sdk_generate.mjs"),
        PathBuf::from("--check"),
        PathBuf::from("--language"),
        PathBuf::from("rust"),
        PathBuf::from("--app-input"),
        root.join("generated/openapi/drive-app-api.openapi.json"),
        PathBuf::from("--backend-input"),
        root.join("generated/openapi/drive-backend-api.openapi.json"),
    ]);
}

#[test]
fn local_sdk_generator_stub_can_generate_typescript_output() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let output_dir = std::env::temp_dir().join(format!("sdkwork-drive-sdkgen-{nonce}"));

    assert_node_script_succeeds(&[
        root.join("tools/sdkwork_sdk_generator_stub.mjs"),
        PathBuf::from("generate"),
        PathBuf::from("--input"),
        root.join("generated/openapi/drive-app-api.openapi.json"),
        PathBuf::from("--output"),
        output_dir.clone(),
        PathBuf::from("--name"),
        PathBuf::from("drive-app-sdk"),
        PathBuf::from("--type"),
        PathBuf::from("app"),
        PathBuf::from("--language"),
        PathBuf::from("typescript"),
        PathBuf::from("--base-url"),
        PathBuf::from("http://127.0.0.1:18080"),
        PathBuf::from("--api-prefix"),
        PathBuf::from("/app/v3/api"),
        PathBuf::from("--fixed-sdk-version"),
        PathBuf::from("0.1.0"),
        PathBuf::from("--sdk-root"),
        root.join("sdks/drive-app-sdk"),
        PathBuf::from("--sdk-name"),
        PathBuf::from("drive-app-sdk"),
        PathBuf::from("--package-name"),
        PathBuf::from("sdkwork-drive-app-api-generated-typescript"),
        PathBuf::from("--standard-profile"),
        PathBuf::from("sdkwork-v3"),
    ]);

    assert!(
        output_dir.join("sdk-manifest.json").exists(),
        "manifest should be generated",
    );
    assert!(
        output_dir.join("source-openapi.json").exists(),
        "openapi snapshot should be generated",
    );
    assert!(
        output_dir.join("src/index.ts").exists(),
        "typescript entry should be generated",
    );
}

#[test]
fn schema_quality_gate_fails_when_maintenance_job_enum_is_missing() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir = std::env::temp_dir().join(format!("sdkwork-drive-schema-gate-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");

    let backend_raw =
        std::fs::read_to_string(&backend_src).expect("backend openapi should be readable");
    let mut backend_json: serde_json::Value =
        serde_json::from_str(&backend_raw).expect("backend openapi should be valid json");
    let job_type = backend_json
        .get_mut("components")
        .and_then(|value| value.get_mut("schemas"))
        .and_then(|value| value.get_mut("MaintenanceJob"))
        .and_then(|value| value.get_mut("properties"))
        .and_then(|value| value.get_mut("jobType"))
        .expect("MaintenanceJob.jobType schema should exist");
    if let Some(object) = job_type.as_object_mut() {
        object.remove("enum");
    }
    let patched = serde_json::to_string_pretty(&backend_json)
        .expect("patched backend openapi should be serializable");
    std::fs::write(&backend_dst, format!("{patched}\n"))
        .expect("patched backend openapi should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml"))
        .arg("--security-audit-schema")
        .arg(root.join("docs/schema-registry/tables/004-drive-security-audit.yaml"))
        .arg("--storage-schema")
        .arg(root.join("docs/schema-registry/tables/003-drive-storage.yaml"))
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when enum is missing, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn schema_quality_gate_fails_when_maintenance_jobs_query_enum_is_missing() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir = std::env::temp_dir().join(format!("sdkwork-drive-schema-gate-query-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");

    let backend_raw =
        std::fs::read_to_string(&backend_src).expect("backend openapi should be readable");
    let mut backend_json: serde_json::Value =
        serde_json::from_str(&backend_raw).expect("backend openapi should be valid json");
    let parameters = backend_json
        .get_mut("paths")
        .and_then(|value| value.get_mut("/backend/v3/api/drive/maintenance/jobs"))
        .and_then(|value| value.get_mut("get"))
        .and_then(|value| value.get_mut("parameters"))
        .and_then(serde_json::Value::as_array_mut)
        .expect("maintenance jobs get parameters should exist");
    let status_param = parameters
        .iter_mut()
        .find(|item| item.get("name").and_then(serde_json::Value::as_str) == Some("status"))
        .expect("maintenance jobs status query parameter should exist");
    if let Some(schema) = status_param
        .get_mut("schema")
        .and_then(serde_json::Value::as_object_mut)
    {
        schema.remove("enum");
    }
    let patched = serde_json::to_string_pretty(&backend_json)
        .expect("patched backend openapi should be serializable");
    std::fs::write(&backend_dst, format!("{patched}\n"))
        .expect("patched backend openapi should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml"))
        .arg("--security-audit-schema")
        .arg(root.join("docs/schema-registry/tables/004-drive-security-audit.yaml"))
        .arg("--storage-schema")
        .arg(root.join("docs/schema-registry/tables/003-drive-storage.yaml"))
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when maintenance jobs query enum is missing, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn schema_quality_gate_fails_when_maintenance_jobs_operator_id_pattern_is_missing() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir = std::env::temp_dir().join(format!("sdkwork-drive-schema-gate-pattern-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");

    let backend_raw =
        std::fs::read_to_string(&backend_src).expect("backend openapi should be readable");
    let mut backend_json: serde_json::Value =
        serde_json::from_str(&backend_raw).expect("backend openapi should be valid json");
    let parameters = backend_json
        .get_mut("paths")
        .and_then(|value| value.get_mut("/backend/v3/api/drive/maintenance/jobs"))
        .and_then(|value| value.get_mut("get"))
        .and_then(|value| value.get_mut("parameters"))
        .and_then(serde_json::Value::as_array_mut)
        .expect("maintenance jobs get parameters should exist");
    let operator_param = parameters
        .iter_mut()
        .find(|item| item.get("name").and_then(serde_json::Value::as_str) == Some("operatorId"))
        .expect("maintenance jobs operatorId query parameter should exist");
    if let Some(schema) = operator_param
        .get_mut("schema")
        .and_then(serde_json::Value::as_object_mut)
    {
        schema.remove("pattern");
    }
    let patched = serde_json::to_string_pretty(&backend_json)
        .expect("patched backend openapi should be serializable");
    std::fs::write(&backend_dst, format!("{patched}\n"))
        .expect("patched backend openapi should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml"))
        .arg("--security-audit-schema")
        .arg(root.join("docs/schema-registry/tables/004-drive-security-audit.yaml"))
        .arg("--storage-schema")
        .arg(root.join("docs/schema-registry/tables/003-drive-storage.yaml"))
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when operatorId pattern is missing, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn schema_quality_gate_fails_when_audit_events_request_id_pattern_is_missing() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir =
        std::env::temp_dir().join(format!("sdkwork-drive-audit-schema-gate-pattern-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");

    let backend_raw =
        std::fs::read_to_string(&backend_src).expect("backend openapi should be readable");
    let mut backend_json: serde_json::Value =
        serde_json::from_str(&backend_raw).expect("backend openapi should be valid json");
    let parameters = backend_json
        .get_mut("paths")
        .and_then(|value| value.get_mut("/backend/v3/api/drive/audit_events"))
        .and_then(|value| value.get_mut("get"))
        .and_then(|value| value.get_mut("parameters"))
        .and_then(serde_json::Value::as_array_mut)
        .expect("audit events get parameters should exist");
    let request_id_param = parameters
        .iter_mut()
        .find(|item| item.get("name").and_then(serde_json::Value::as_str) == Some("requestId"))
        .expect("audit events requestId query parameter should exist");
    if let Some(schema) = request_id_param
        .get_mut("schema")
        .and_then(serde_json::Value::as_object_mut)
    {
        schema.remove("pattern");
    }
    let patched = serde_json::to_string_pretty(&backend_json)
        .expect("patched backend openapi should be serializable");
    std::fs::write(&backend_dst, format!("{patched}\n"))
        .expect("patched backend openapi should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml"))
        .arg("--security-audit-schema")
        .arg(root.join("docs/schema-registry/tables/004-drive-security-audit.yaml"))
        .arg("--storage-schema")
        .arg(root.join("docs/schema-registry/tables/003-drive-storage.yaml"))
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when audit_events requestId pattern is missing, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn schema_quality_gate_fails_when_audit_index_is_missing_in_registry() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir = std::env::temp_dir().join(format!("sdkwork-drive-audit-index-gate-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let special_spaces_src = root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml");
    let security_audit_src = root.join("docs/schema-registry/tables/004-drive-security-audit.yaml");
    let storage_schema_src = root.join("docs/schema-registry/tables/003-drive-storage.yaml");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    let special_spaces_dst = temp_dir.join("002-drive-special-spaces.yaml");
    let security_audit_dst = temp_dir.join("004-drive-security-audit.yaml");
    let storage_schema_dst = temp_dir.join("003-drive-storage.yaml");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");
    std::fs::copy(&backend_src, &backend_dst).expect("backend openapi should be copied");
    std::fs::copy(&special_spaces_src, &special_spaces_dst)
        .expect("special spaces schema should be copied");
    std::fs::copy(&storage_schema_src, &storage_schema_dst)
        .expect("storage schema should be copied");

    let audit_schema_raw = std::fs::read_to_string(&security_audit_src)
        .expect("security audit schema should be readable");
    let patched = audit_schema_raw.replace(
        "ix_drive_audit_event_trace_created",
        "ix_drive_audit_event_trace_removed",
    );
    std::fs::write(&security_audit_dst, patched)
        .expect("patched security audit schema should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(&special_spaces_dst)
        .arg("--security-audit-schema")
        .arg(&security_audit_dst)
        .arg("--storage-schema")
        .arg(&storage_schema_dst)
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when audit index is missing in registry, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn schema_quality_gate_fails_when_storage_provider_kind_pattern_is_missing() {
    let root = workspace_root();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_millis();
    let temp_dir = std::env::temp_dir().join(format!("sdkwork-drive-storage-kind-gate-{nonce}"));
    std::fs::create_dir_all(&temp_dir).expect("temp directory should be created");

    let app_src = root.join("generated/openapi/drive-app-api.openapi.json");
    let backend_src = root.join("generated/openapi/drive-backend-api.openapi.json");
    let special_spaces_src = root.join("docs/schema-registry/tables/002-drive-special-spaces.yaml");
    let security_audit_src = root.join("docs/schema-registry/tables/004-drive-security-audit.yaml");
    let storage_schema_src = root.join("docs/schema-registry/tables/003-drive-storage.yaml");
    let app_dst = temp_dir.join("drive-app-api.openapi.json");
    let backend_dst = temp_dir.join("drive-backend-api.openapi.json");
    let special_spaces_dst = temp_dir.join("002-drive-special-spaces.yaml");
    let security_audit_dst = temp_dir.join("004-drive-security-audit.yaml");
    let storage_schema_dst = temp_dir.join("003-drive-storage.yaml");
    std::fs::copy(&app_src, &app_dst).expect("app openapi should be copied");
    std::fs::copy(&backend_src, &backend_dst).expect("backend openapi should be copied");
    std::fs::copy(&special_spaces_src, &special_spaces_dst)
        .expect("special spaces schema should be copied");
    std::fs::copy(&security_audit_src, &security_audit_dst)
        .expect("security audit schema should be copied");
    std::fs::copy(&storage_schema_src, &storage_schema_dst)
        .expect("storage schema should be copied");

    let backend_raw =
        std::fs::read_to_string(&backend_dst).expect("backend openapi should be readable");
    let mut backend_json: serde_json::Value =
        serde_json::from_str(&backend_raw).expect("backend openapi should be valid json");
    let provider_kind = backend_json
        .get_mut("components")
        .and_then(|value| value.get_mut("schemas"))
        .and_then(|value| value.get_mut("CreateStorageProviderRequest"))
        .and_then(|value| value.get_mut("properties"))
        .and_then(|value| value.get_mut("providerKind"))
        .expect("CreateStorageProviderRequest.providerKind schema should exist");
    if let Some(object) = provider_kind.as_object_mut() {
        object.remove("pattern");
    }
    let patched = serde_json::to_string_pretty(&backend_json)
        .expect("patched backend openapi should be serializable");
    std::fs::write(&backend_dst, format!("{patched}\n"))
        .expect("patched backend openapi should be writable");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("tools/drive_schema_quality_gate.mjs"))
        .arg("--app-openapi")
        .arg(&app_dst)
        .arg("--backend-openapi")
        .arg(&backend_dst)
        .arg("--special-spaces-schema")
        .arg(&special_spaces_dst)
        .arg("--security-audit-schema")
        .arg(&security_audit_dst)
        .arg("--storage-schema")
        .arg(&storage_schema_dst)
        .output()
        .expect("schema quality gate command should start");
    assert!(
        !output.status.success(),
        "schema quality gate should fail when storage provider kind pattern is missing, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}
