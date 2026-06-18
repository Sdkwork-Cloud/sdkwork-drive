use std::fs;
use std::path::Path;

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct GatewayFileConfig {
    pub service: ServiceSection,
    pub server: ServerSection,
    pub cors: CorsSection,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServiceSection {
    pub name: String,
    pub environment: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerSection {
    pub bind: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorsSection {
    #[serde(default)]
    pub allow_any_origin: bool,
    #[serde(default)]
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ResolvedGatewayConfig {
    pub service_name: String,
    pub environment: String,
    pub bind: String,
    pub allow_any_origin: bool,
    pub allowed_origins: Vec<String>,
}

pub fn load_gateway_config(config_path: &Path) -> Result<GatewayFileConfig, String> {
    let raw = fs::read_to_string(config_path).map_err(|error| {
        format!(
            "failed to read standalone gateway config {}: {error}",
            config_path.display()
        )
    })?;
    toml::from_str(&raw).map_err(|error| {
        format!(
            "failed to parse standalone gateway config {}: {error}",
            config_path.display()
        )
    })
}

pub fn resolve_gateway_config(
    file_config: GatewayFileConfig,
) -> Result<ResolvedGatewayConfig, String> {
    Ok(ResolvedGatewayConfig {
        service_name: file_config.service.name,
        environment: file_config.service.environment,
        bind: read_env_override("SDKWORK_DRIVE_STANDALONE_GATEWAY_BIND")
            .unwrap_or(file_config.server.bind),
        allow_any_origin: file_config.cors.allow_any_origin,
        allowed_origins: file_config.cors.allowed_origins,
    })
}

fn read_env_override(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(|value| value.trim_end_matches('/').to_string())
}

pub fn resolve_config_path(args: &[String]) -> Result<String, String> {
    if let Ok(path) = std::env::var("SDKWORK_DRIVE_STANDALONE_GATEWAY_CONFIG") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    for (index, arg) in args.iter().enumerate() {
        if arg == "--config" {
            let value = args
                .get(index + 1)
                .ok_or_else(|| "--config requires a path".to_string())?;
            return Ok(value.clone());
        }
    }

    let environment = std::env::var("SDKWORK_DRIVE_STANDALONE_GATEWAY_ENVIRONMENT")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "development".to_string());

    Ok(format!(
        "configs/sdkwork-drive-standalone-gateway.{environment}.toml"
    ))
}
