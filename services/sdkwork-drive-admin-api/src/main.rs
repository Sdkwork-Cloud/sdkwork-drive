use sdkwork_drive_admin_api::build_router_with_sqlite_database_url;

#[tokio::main]
async fn main() {
    let database_url = std::env::var("SDKWORK_DRIVE_ADMIN_DB_URL")
        .unwrap_or_else(|_| "sqlite://sdkwork-drive-admin-api.db?mode=rwc".to_string());
    let router = build_router_with_sqlite_database_url(&database_url)
        .await
        .expect("initialize admin api router and database");

    let listener = tokio::net::TcpListener::bind("127.0.0.1:18081")
        .await
        .expect("bind admin api listener");
    axum::serve(listener, router)
        .await
        .expect("serve admin api");
}
