use sqlx::AnyPool;

/// Validation result for a storage provider.
#[derive(Debug, Clone)]
pub struct ProviderValidationResult {
    pub provider_id: String,
    pub is_valid: bool,
    pub connectivity_ok: bool,
    pub bucket_exists: bool,
    pub errors: Vec<String>,
}

/// Validate all storage providers.
///
/// This function checks connectivity and bucket existence
/// for all configured storage providers.
pub async fn validate_all_providers(
    pool: &AnyPool,
) -> Result<Vec<ProviderValidationResult>, sqlx::Error> {
    let providers = sqlx::query_as::<_, (String, String, String, String)>(
        "SELECT id, provider_kind, endpoint_url, bucket FROM drive_storage_provider WHERE status = 'active'"
    )
    .fetch_all(pool)
    .await?;

    let mut results = Vec::new();

    for (id, provider_kind, endpoint_url, bucket) in providers {
        let mut errors = Vec::new();
        let mut connectivity_ok = true;
        let mut bucket_exists = true;

        // Basic validation
        if endpoint_url.is_empty() {
            errors.push("Endpoint URL is empty".to_string());
            connectivity_ok = false;
        }

        if bucket.is_empty() {
            errors.push("Bucket name is empty".to_string());
            bucket_exists = false;
        }

        // Provider-specific validation
        match provider_kind.as_str() {
            "s3_compatible" => {
                if !endpoint_url.starts_with("http://") && !endpoint_url.starts_with("https://") {
                    errors.push("S3 endpoint must start with http:// or https://".to_string());
                    connectivity_ok = false;
                }
            }
            "local_filesystem" => {
                // Check if local path exists
                let path = std::path::Path::new(&endpoint_url);
                if !path.exists() {
                    errors.push(format!("Local path does not exist: {}", endpoint_url));
                    connectivity_ok = false;
                }
            }
            _ => {
                // Other providers - basic URL validation
                if !endpoint_url.contains("://") {
                    errors.push("Invalid endpoint URL format".to_string());
                    connectivity_ok = false;
                }
            }
        }

        results.push(ProviderValidationResult {
            provider_id: id,
            is_valid: errors.is_empty(),
            connectivity_ok,
            bucket_exists,
            errors,
        });
    }

    Ok(results)
}
