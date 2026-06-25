use std::sync::Arc;

use crate::api::paths::custom_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{CopyProviderObjectRequest, CreateStorageProviderRequest, DeleteStorageProviderBindingResponse, DeleteStorageProviderResponse, ListStorageProvidersResponse, OperatorRequest, ProviderBucket, ProviderBucketList, ProviderBucketMutation, ProviderObject, ProviderObjectList, ProviderObjectMutation, RotateStorageProviderCredentialRequest, SetDefaultStorageProviderBindingRequest, StorageProvider, StorageProviderBinding, StorageProviderBindingListResponse, StorageProviderCapabilities, TestStorageProviderRequest, TestStorageProviderResponse, UpdateStorageProviderRequest};

#[derive(Clone)]
pub struct DriveApi {
    client: Arc<SdkworkHttpClient>,
}

impl DriveApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    pub async fn storage_provider_bindings_default_get(&self, space_id: Option<&str>, space_type: Option<&str>) -> Result<StorageProviderBinding, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("spaceType", space_type, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&"/drive/storage/bindings/default".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn storage_provider_bindings_default_set(&self, body: &SetDefaultStorageProviderBindingRequest) -> Result<StorageProviderBinding, SdkworkError> {
        let path = custom_path(&"/drive/storage/bindings/default".to_string());
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Delete a Drive default storage provider binding
    pub async fn storage_provider_bindings_default_delete(&self, operator_id: &str, space_id: Option<&str>) -> Result<DeleteStorageProviderBindingResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("operatorId", operator_id, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&"/drive/storage/bindings/default".to_string()), &query);
        self.client.delete(&path, None, None).await
    }

    pub async fn storage_providers_list(&self, status: Option<&str>) -> Result<ListStorageProvidersResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("status", status, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&"/drive/storage/providers".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_create(&self, body: &CreateStorageProviderRequest) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&"/drive/storage/providers".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_update(&self, provider_id: &str, body: &UpdateStorageProviderRequest) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_delete(&self, provider_id: &str) -> Result<DeleteStorageProviderResponse, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn storage_providers_get(&self, provider_id: &str) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_activate(&self, provider_id: &str, body: &OperatorRequest) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/activate", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_capabilities_get(&self, provider_id: &str) -> Result<StorageProviderCapabilities, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/capabilities", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_credentials_rotate(&self, provider_id: &str, body: &RotateStorageProviderCredentialRequest) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/credentials/rotate", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_deactivate(&self, provider_id: &str, body: &OperatorRequest) -> Result<StorageProvider, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/deactivate", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_test(&self, provider_id: &str, body: &TestStorageProviderRequest) -> Result<TestStorageProviderResponse, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/test", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn storage_providers_bucket_head(&self, provider_id: &str) -> Result<ProviderBucket, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/bucket", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_bucket_create(&self, provider_id: &str, operator_id: &str) -> Result<ProviderBucketMutation, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("operatorId", operator_id, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&format!("/drive/storage/providers/{}/bucket", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false)))), &query);
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    pub async fn storage_providers_bucket_delete(&self, provider_id: &str, operator_id: &str) -> Result<ProviderBucketMutation, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("operatorId", operator_id, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&format!("/drive/storage/providers/{}/bucket", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false)))), &query);
        self.client.delete(&path, None, None).await
    }

    pub async fn storage_providers_objects_list(&self, provider_id: &str, prefix: Option<&str>, delimiter: Option<&str>, page_token: Option<&str>, page_size: Option<i64>) -> Result<ProviderObjectList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("prefix", prefix, "form", true, false, None),
            QueryParameterSpec::new("delimiter", delimiter, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&format!("/drive/storage/providers/{}/objects", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_objects_head(&self, provider_id: &str, object_key: &str) -> Result<ProviderObject, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/objects/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false)), serialize_path_parameter(object_key, PathParameterSpec::new("objectKey", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn storage_providers_objects_delete(&self, provider_id: &str, object_key: &str, operator_id: &str) -> Result<ProviderObjectMutation, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("operatorId", operator_id, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&format!("/drive/storage/providers/{}/objects/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false)), serialize_path_parameter(object_key, PathParameterSpec::new("objectKey", "simple", false)))), &query);
        self.client.delete(&path, None, None).await
    }

    pub async fn storage_providers_objects_copy(&self, provider_id: &str, body: &CopyProviderObjectRequest) -> Result<ProviderObjectMutation, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/objects/copy", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// List buckets visible to a Drive storage provider account
    pub async fn storage_providers_buckets_list(&self, provider_id: &str) -> Result<ProviderBucketList, SdkworkError> {
        let path = custom_path(&format!("/drive/storage/providers/{}/buckets", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// List Drive storage provider bindings
    pub async fn storage_provider_bindings_list(&self, space_id: Option<&str>, provider_id: Option<&str>, lifecycle_status: Option<&str>) -> Result<StorageProviderBindingListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("providerId", provider_id, "form", true, false, None),
            QueryParameterSpec::new("lifecycleStatus", lifecycle_status, "form", true, false, None),
        ]);
        let path = append_query_string(custom_path(&"/drive/storage/bindings".to_string()), &query);
        self.client.get(&path, None, None).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}


struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() { "form" } else { parameter.style };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        serde_json::Value::Object(values) if style == "deepObject" => append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved),
        serde_json::Value::Object(values) => append_object_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        value => pairs.push(format!("{}={}", percent_encode(parameter.name), encode_query_value(&primitive_to_string(value), parameter.allow_reserved))),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values.iter().filter(|value| !value.is_null()).map(primitive_to_string).collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&item, allow_reserved)));
        }
        return;
    }
    pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!("{}={}", percent_encode(key), encode_query_value(&primitive_to_string(value), allow_reserved)));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!("{}={}", percent_encode(&format!("{}[{}]", name, key)), encode_query_value(&primitive_to_string(value), allow_reserved)));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"), ("%2F", "/"), ("%3F", "?"), ("%23", "#"),
        ("%5B", "["), ("%5D", "]"), ("%40", "@"), ("%21", "!"),
        ("%24", "$"), ("%26", "&"), ("%27", "'"), ("%28", "("),
        ("%29", ")"), ("%2A", "*"), ("%2B", "+"), ("%2C", ","),
        ("%3B", ";"), ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
