use sdkwork_drive_backend_api::build_router_with_database_config;
use sdkwork_drive_config::DatabaseConfig;

#[tokio::main]
async fn main() {
    let database_config = DatabaseConfig::from_env().expect("resolve drive database config");
    let router = build_router_with_database_config(&database_config)
        .await
        .expect("initialize backend api router and database");

    let listener = tokio::net::TcpListener::bind("127.0.0.1:18081")
        .await
        .expect("bind backend api listener");
    axum::serve(listener, router)
        .await
        .expect("serve backend api");
}
