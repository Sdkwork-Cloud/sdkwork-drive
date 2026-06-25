use sdkwork_drive_config::DatabaseEngine;
use sqlx::AnyPool;

const DRIVE_MAINTENANCE_ADVISORY_LOCK_KEY: i64 = 9_001_002_003;

pub async fn run_if_maintenance_leader<F, Fut>(
    pool: &AnyPool,
    engine: DatabaseEngine,
    task_name: &str,
    task: F,
) where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    if engine == DatabaseEngine::Postgresql {
        match pool.acquire().await {
            Ok(mut connection) => match sqlx::query_scalar("SELECT pg_try_advisory_lock($1)")
                .bind(DRIVE_MAINTENANCE_ADVISORY_LOCK_KEY)
                .fetch_one(&mut *connection)
                .await
            {
                Ok(true) => {
                    task().await;
                    if let Err(error) = sqlx::query("SELECT pg_advisory_unlock($1)")
                        .bind(DRIVE_MAINTENANCE_ADVISORY_LOCK_KEY)
                        .execute(&mut *connection)
                        .await
                    {
                        tracing::warn!(
                            target: "sdkwork.drive",
                            event = "drive.install_worker.leader_release_failed",
                            task = task_name,
                            error = %error,
                            "maintenance leader lock release failed"
                        );
                    }
                }
                Ok(false) => {
                    tracing::debug!(
                        target: "sdkwork.drive",
                        event = "drive.install_worker.leader_skipped",
                        task = task_name,
                        "another install-worker replica holds the maintenance lock"
                    );
                }
                Err(error) => {
                    tracing::warn!(
                        target: "sdkwork.drive",
                        event = "drive.install_worker.leader_acquire_failed",
                        task = task_name,
                        error = %error,
                        "maintenance leader lock acquire failed"
                    );
                }
            },
            Err(error) => {
                tracing::warn!(
                    target: "sdkwork.drive",
                    event = "drive.install_worker.leader_connection_failed",
                    task = task_name,
                    error = %error,
                    "maintenance leader connection acquire failed"
                );
            }
        }
        return;
    }

    task().await;
}
