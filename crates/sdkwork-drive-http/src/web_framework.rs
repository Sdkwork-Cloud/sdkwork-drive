use sdkwork_web_core::{SecurityPolicy, WebEnvironment};

fn parse_environment(value: Option<String>) -> WebEnvironment {
    match value
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "dev" | "development" => WebEnvironment::Dev,
        "test" | "testing" => WebEnvironment::Test,
        _ => WebEnvironment::Prod,
    }
}

fn first_nonempty_env(keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        std::env::var(key)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    })
}

/// Resolve the canonical SDKWork web environment for Drive HTTP services.
pub fn resolve_drive_web_environment_from_process_env() -> WebEnvironment {
    parse_environment(first_nonempty_env(&[
        "SDKWORK_DRIVE_ENVIRONMENT",
        "SDKWORK_DRIVE_STANDALONE_GATEWAY_ENVIRONMENT",
        "SDKWORK_IM_ENVIRONMENT",
        "SDKWORK_ENV",
    ]))
}

/// Drive HTTP service security policy aligned with IM dev bootstrap behavior.
pub fn drive_service_security_policy(environment: &WebEnvironment) -> SecurityPolicy {
    let mut security_policy = if matches!(environment, WebEnvironment::Dev | WebEnvironment::Test) {
        SecurityPolicy::default()
    } else {
        SecurityPolicy::production()
    };
    if matches!(environment, WebEnvironment::Dev | WebEnvironment::Test) {
        security_policy.cors = sdkwork_web_core::CorsPolicy::development_private_network();
        security_policy
            .cross_site
            .reject_untrusted_state_changing_origins = false;
        security_policy.cross_site.reject_cookie_auth_without_origin = false;
    }
    security_policy
}

#[cfg(test)]
mod tests {
    use super::{drive_service_security_policy, resolve_drive_web_environment_from_process_env};
    use sdkwork_web_core::WebEnvironment;

    #[test]
    fn dev_security_policy_allows_browser_origins() {
        let policy = drive_service_security_policy(&WebEnvironment::Dev);
        assert!(!policy.cors.allow_all_origins);
        assert!(!policy.cross_site.reject_untrusted_state_changing_origins);
    }

    #[test]
    fn production_security_policy_rejects_permissive_cors() {
        let policy = drive_service_security_policy(&WebEnvironment::Prod);
        assert!(!policy.cors.allow_all_origins);
    }

    #[test]
    fn resolve_environment_from_drive_env_key() {
        unsafe {
            std::env::set_var("SDKWORK_DRIVE_ENVIRONMENT", "development");
        }
        assert_eq!(
            resolve_drive_web_environment_from_process_env(),
            WebEnvironment::Dev
        );
        unsafe {
            std::env::remove_var("SDKWORK_DRIVE_ENVIRONMENT");
        }
    }
}
