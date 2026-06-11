use sdkwork_drive_admin_storage_api::build_router_with_database_config;
use sdkwork_drive_config::DatabaseConfig;

#[tokio::main]
async fn main() {
    let database_config = DatabaseConfig::from_env().expect("resolve drive database config");
    let router = build_router_with_database_config(&database_config)
        .await
        .expect("initialize admin storage api router and database");

    let listener = tokio::net::TcpListener::bind("127.0.0.1:18083")
        .await
        .expect("bind admin storage api listener");
    axum::serve(listener, router)
        .await
        .expect("serve admin storage api");
}
