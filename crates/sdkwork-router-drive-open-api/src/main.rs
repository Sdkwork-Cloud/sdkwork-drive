use sdkwork_drive_config::DatabaseConfig;
use sdkwork_router_drive_open_api::build_router_with_database_config;

#[tokio::main]
async fn main() {
    let database_config = DatabaseConfig::from_env().expect("resolve drive database config");
    let router = build_router_with_database_config(&database_config)
        .await
        .expect("initialize open api router and database");

    let listener = tokio::net::TcpListener::bind("127.0.0.1:18082")
        .await
        .expect("bind open api listener");
    axum::serve(listener, router).await.expect("serve open api");
}
