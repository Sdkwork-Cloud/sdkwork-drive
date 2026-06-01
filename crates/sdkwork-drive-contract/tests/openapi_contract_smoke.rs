use std::path::PathBuf;

use serde_json::Value;

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

#[test]
fn openapi_paths_follow_sdkwork_v3_prefixes() {
    let app = std::fs::read_to_string(
        workspace_root().join("generated/openapi/drive-app-api.openapi.json"),
    )
    .expect("app openapi missing");
    let backend = std::fs::read_to_string(
        workspace_root().join("generated/openapi/drive-backend-api.openapi.json"),
    )
    .expect("backend openapi missing");
    assert!(app.contains("/app/v3/api/drive/spaces"));
    assert!(backend.contains("/backend/v3/api/drive/storage_providers"));
    assert!(app.contains("\"operationId\": \"spaces.list\""));
    assert!(app.contains("\"name\": \"tenantId\""));
    assert!(app.contains("\"201\""));
    assert!(app.contains("/app/v3/api/drive/download_tokens/{token}"));
    assert!(app.contains("\"operationId\": \"downloadUrls.create\""));
    assert!(backend.contains("/backend/v3/api/drive/quotas"));
    assert!(backend.contains("\"operationId\": \"quotas.summary\""));
    assert!(backend.contains("/backend/v3/api/drive/storage_providers/{providerId}"));
    assert!(backend.contains("\"operationId\": \"storageProviders.update\""));
    assert!(backend.contains("\"operationId\": \"storageProviders.delete\""));
    assert!(backend.contains("\"operationId\": \"storageProviders.test\""));
    assert!(backend.contains("/backend/v3/api/drive/audit_events"));
    assert!(backend.contains("\"operationId\": \"auditEvents.list\""));
    assert!(backend.contains("/backend/v3/api/drive/maintenance/object_sweep"));
    assert!(backend.contains("\"operationId\": \"maintenance.objectSweep.start\""));
    assert!(backend.contains("/backend/v3/api/drive/maintenance/upload_session_sweep"));
    assert!(backend.contains("\"operationId\": \"maintenance.uploadSessionSweep.start\""));
    assert!(backend.contains("/backend/v3/api/drive/maintenance/jobs"));
    assert!(backend.contains("\"operationId\": \"maintenance.jobs.list\""));

    let backend_json: Value =
        serde_json::from_str(&backend).expect("backend openapi must be valid json");
    let schemas = backend_json
        .get("components")
        .and_then(|value| value.get("schemas"))
        .expect("backend openapi components.schemas should exist");
    let maintenance_job = schemas
        .get("MaintenanceJob")
        .expect("MaintenanceJob schema should exist");
    let properties = maintenance_job
        .get("properties")
        .expect("MaintenanceJob.properties should exist");
    for field_name in ["startedAt", "finishedAt", "createdAt"] {
        let field = properties
            .get(field_name)
            .unwrap_or_else(|| panic!("MaintenanceJob.{} should exist", field_name));
        assert_eq!(
            field.get("format").and_then(Value::as_str),
            Some("date-time"),
            "MaintenanceJob.{} should use date-time format",
            field_name
        );
    }
    assert_enum_values(
        properties,
        "jobType",
        &["object_sweep", "upload_session_sweep"],
    );
    assert_enum_values(properties, "status", &["completed", "failed"]);
    assert_query_parameter_enum(
        &backend_json,
        "/backend/v3/api/drive/maintenance/jobs",
        "get",
        "jobType",
        &["object_sweep", "upload_session_sweep"],
    );
    assert_query_parameter_enum(
        &backend_json,
        "/backend/v3/api/drive/maintenance/jobs",
        "get",
        "status",
        &["completed", "failed"],
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/maintenance/jobs",
        "get",
        "operatorId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/audit_events",
        "get",
        "action",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/audit_events",
        "get",
        "resourceType",
        64,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/audit_events",
        "get",
        "resourceId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/audit_events",
        "get",
        "requestId",
        64,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_query_parameter_string_constraints(
        &backend_json,
        "/backend/v3/api/drive/audit_events",
        "get",
        "traceId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );

    let sweep_object_properties = schemas
        .get("SweepObjectStoreRequest")
        .and_then(|value| value.get("properties"))
        .expect("SweepObjectStoreRequest.properties should exist");
    assert_property_string_constraints(
        sweep_object_properties,
        "operatorId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_property_string_constraints(
        sweep_object_properties,
        "requestId",
        64,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_property_string_constraints(
        sweep_object_properties,
        "traceId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );

    let sweep_upload_properties = schemas
        .get("SweepUploadSessionsRequest")
        .and_then(|value| value.get("properties"))
        .expect("SweepUploadSessionsRequest.properties should exist");
    assert_property_string_constraints(
        sweep_upload_properties,
        "operatorId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_property_string_constraints(
        sweep_upload_properties,
        "requestId",
        64,
        "^[A-Za-z0-9._:@-]+$",
    );
    assert_property_string_constraints(
        sweep_upload_properties,
        "traceId",
        128,
        "^[A-Za-z0-9._:@-]+$",
    );

    assert_property_string_constraints(properties, "operatorId", 128, "^[A-Za-z0-9._:@-]+$");
    assert_property_string_constraints(properties, "requestId", 64, "^[A-Za-z0-9._:@-]+$");
    assert_property_string_constraints(properties, "traceId", 128, "^[A-Za-z0-9._:@-]+$");

    let create_storage_provider_properties = schemas
        .get("CreateStorageProviderRequest")
        .and_then(|value| value.get("properties"))
        .expect("CreateStorageProviderRequest.properties should exist");
    let update_storage_provider_properties = schemas
        .get("UpdateStorageProviderRequest")
        .and_then(|value| value.get("properties"))
        .expect("UpdateStorageProviderRequest.properties should exist");
    let storage_provider_properties = schemas
        .get("StorageProvider")
        .and_then(|value| value.get("properties"))
        .expect("StorageProvider.properties should exist");
    let provider_kind_enum = [
        "local_filesystem",
        "s3_compatible",
        "azure_blob",
        "google_cloud_storage",
        "aliyun_oss",
    ];
    let provider_kind_pattern =
        "^(local_filesystem|s3_compatible|azure_blob|google_cloud_storage|aliyun_oss|custom:[a-z0-9_-]{2,32})$";
    assert_enum_values(
        create_storage_provider_properties,
        "providerKind",
        &provider_kind_enum,
    );
    assert_eq!(
        create_storage_provider_properties
            .get("providerKind")
            .and_then(|value| value.get("pattern"))
            .and_then(Value::as_str),
        Some(provider_kind_pattern),
        "CreateStorageProviderRequest.providerKind pattern should match"
    );
    for field_name in [
        "name",
        "region",
        "pathStyle",
        "serverSideEncryptionMode",
        "defaultStorageClass",
    ] {
        assert!(
            create_storage_provider_properties.get(field_name).is_some(),
            "CreateStorageProviderRequest.{} should exist",
            field_name
        );
        assert!(
            update_storage_provider_properties.get(field_name).is_some(),
            "UpdateStorageProviderRequest.{} should exist",
            field_name
        );
        assert!(
            storage_provider_properties.get(field_name).is_some(),
            "StorageProvider.{} should exist",
            field_name
        );
    }
    assert_enum_values(
        storage_provider_properties,
        "providerKind",
        &provider_kind_enum,
    );
    assert_eq!(
        storage_provider_properties
            .get("providerKind")
            .and_then(|value| value.get("pattern"))
            .and_then(Value::as_str),
        Some(provider_kind_pattern),
        "StorageProvider.providerKind pattern should match"
    );
}

fn assert_enum_values(properties: &Value, field_name: &str, expected_values: &[&str]) {
    let field = properties
        .get(field_name)
        .unwrap_or_else(|| panic!("MaintenanceJob.{} should exist", field_name));
    let enum_values = field
        .get("enum")
        .and_then(Value::as_array)
        .unwrap_or_else(|| panic!("MaintenanceJob.{} enum should exist", field_name));
    let mut actual = enum_values
        .iter()
        .filter_map(Value::as_str)
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    actual.sort();

    let mut expected = expected_values
        .iter()
        .map(|value| value.to_string())
        .collect::<Vec<_>>();
    expected.sort();

    assert_eq!(
        actual, expected,
        "MaintenanceJob.{} enum values should match",
        field_name
    );
}

fn assert_query_parameter_enum(
    openapi: &Value,
    path_key: &str,
    method: &str,
    parameter_name: &str,
    expected_values: &[&str],
) {
    let parameters = openapi
        .get("paths")
        .and_then(|value| value.get(path_key))
        .and_then(|value| value.get(method))
        .and_then(|value| value.get("parameters"))
        .and_then(Value::as_array)
        .unwrap_or_else(|| panic!("{} {} parameters should exist", method, path_key));
    let parameter = parameters
        .iter()
        .find(|item| {
            item.get("in").and_then(Value::as_str) == Some("query")
                && item.get("name").and_then(Value::as_str) == Some(parameter_name)
        })
        .unwrap_or_else(|| {
            panic!(
                "{} {} query parameter {} should exist",
                method, path_key, parameter_name
            )
        });
    let enum_values = parameter
        .get("schema")
        .and_then(|value| value.get("enum"))
        .and_then(Value::as_array)
        .unwrap_or_else(|| {
            panic!(
                "{} {} query parameter {} enum should exist",
                method, path_key, parameter_name
            )
        });

    let mut actual = enum_values
        .iter()
        .filter_map(Value::as_str)
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    actual.sort();

    let mut expected = expected_values
        .iter()
        .map(|value| value.to_string())
        .collect::<Vec<_>>();
    expected.sort();

    assert_eq!(
        actual, expected,
        "{} {} query parameter {} enum values should match",
        method, path_key, parameter_name
    );
}

fn assert_property_string_constraints(
    properties: &Value,
    field_name: &str,
    max_length: u64,
    pattern: &str,
) {
    let field = properties
        .get(field_name)
        .unwrap_or_else(|| panic!("{}.{} should exist", "properties", field_name));
    assert_eq!(
        field.get("maxLength").and_then(Value::as_u64),
        Some(max_length),
        "{} maxLength should be {}",
        field_name,
        max_length
    );
    assert_eq!(
        field.get("pattern").and_then(Value::as_str),
        Some(pattern),
        "{} pattern should be {}",
        field_name,
        pattern
    );
}

fn assert_query_parameter_string_constraints(
    openapi: &Value,
    path_key: &str,
    method: &str,
    parameter_name: &str,
    max_length: u64,
    pattern: &str,
) {
    let parameters = openapi
        .get("paths")
        .and_then(|value| value.get(path_key))
        .and_then(|value| value.get(method))
        .and_then(|value| value.get("parameters"))
        .and_then(Value::as_array)
        .unwrap_or_else(|| panic!("{} {} parameters should exist", method, path_key));
    let parameter = parameters
        .iter()
        .find(|item| {
            item.get("in").and_then(Value::as_str) == Some("query")
                && item.get("name").and_then(Value::as_str) == Some(parameter_name)
        })
        .unwrap_or_else(|| {
            panic!(
                "{} {} query parameter {} should exist",
                method, path_key, parameter_name
            )
        });
    let schema = parameter.get("schema").unwrap_or_else(|| {
        panic!(
            "{} {} query parameter {} schema should exist",
            method, path_key, parameter_name
        )
    });
    assert_eq!(
        schema.get("maxLength").and_then(Value::as_u64),
        Some(max_length),
        "{} {} query parameter {} maxLength should be {}",
        method,
        path_key,
        parameter_name,
        max_length
    );
    assert_eq!(
        schema.get("pattern").and_then(Value::as_str),
        Some(pattern),
        "{} {} query parameter {} pattern should be {}",
        method,
        path_key,
        parameter_name,
        pattern
    );
}
