use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_install_worker::scheduler::{Scheduler, SchedulerConfig};
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use std::time::Duration;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let args: Vec<String> = std::env::args().collect();
    let database_config =
        DatabaseConfig::from_env_and_cli_args(&args).expect("resolve drive database config");
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .expect("connect drive database for install worker");

    let mut scheduler = Scheduler::new(read_scheduler_config());
    scheduler.start(pool);
    tracing::info!(
        target: "sdkwork.drive",
        event = "drive.install_worker.started",
        upload_cleanup_seconds = scheduler_upload_interval_secs(),
        orphan_cleanup_seconds = scheduler_orphan_interval_secs(),
        quota_recalculation_seconds = scheduler_quota_interval_secs(),
        outbox_dispatch_seconds = scheduler_outbox_dispatch_interval_secs(),
        "sdkwork-drive-install-worker started"
    );

    shutdown_signal().await;
    scheduler.stop();
    tracing::info!(
        target: "sdkwork.drive",
        event = "drive.install_worker.stopped",
        "sdkwork-drive-install-worker stopped"
    );
}

fn read_scheduler_config() -> SchedulerConfig {
    SchedulerConfig {
        upload_cleanup_interval: read_duration_seconds(
            "SDKWORK_DRIVE_WORKER_UPLOAD_CLEANUP_INTERVAL_SECONDS",
            3600,
        ),
        orphan_cleanup_interval: read_duration_seconds(
            "SDKWORK_DRIVE_WORKER_ORPHAN_CLEANUP_INTERVAL_SECONDS",
            86_400,
        ),
        quota_recalculation_interval: read_duration_seconds(
            "SDKWORK_DRIVE_WORKER_QUOTA_RECALC_INTERVAL_SECONDS",
            3600,
        ),
        domain_outbox_dispatch_interval: read_duration_seconds(
            "SDKWORK_DRIVE_WORKER_OUTBOX_DISPATCH_INTERVAL_SECONDS",
            30,
        ),
    }
}

fn read_duration_seconds(env_key: &str, default_seconds: u64) -> Duration {
    std::env::var(env_key)
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok())
        .filter(|seconds| *seconds > 0)
        .map(Duration::from_secs)
        .unwrap_or_else(|| Duration::from_secs(default_seconds))
}

fn scheduler_upload_interval_secs() -> u64 {
    read_duration_seconds("SDKWORK_DRIVE_WORKER_UPLOAD_CLEANUP_INTERVAL_SECONDS", 3600).as_secs()
}

fn scheduler_orphan_interval_secs() -> u64 {
    read_duration_seconds(
        "SDKWORK_DRIVE_WORKER_ORPHAN_CLEANUP_INTERVAL_SECONDS",
        86_400,
    )
    .as_secs()
}

fn scheduler_quota_interval_secs() -> u64 {
    read_duration_seconds("SDKWORK_DRIVE_WORKER_QUOTA_RECALC_INTERVAL_SECONDS", 3600).as_secs()
}

fn scheduler_outbox_dispatch_interval_secs() -> u64 {
    read_duration_seconds("SDKWORK_DRIVE_WORKER_OUTBOX_DISPATCH_INTERVAL_SECONDS", 30).as_secs()
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install worker ctrl-c handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install worker SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
