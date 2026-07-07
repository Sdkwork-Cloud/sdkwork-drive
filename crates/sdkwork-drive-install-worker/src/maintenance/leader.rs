use sdkwork_drive_config::DatabaseEngine;
use sqlx::AnyPool;
use sqlx::Row;
use std::sync::OnceLock;
use std::time::Duration;

const DRIVE_MAINTENANCE_LEADER_STALE_SECS: i64 = 30 * 60;
const LEADER_HEARTBEAT_INTERVAL_SECS: u64 = 120;

fn maintenance_leader_lock_key(task_name: &str) -> String {
    format!("install-worker:{task_name}")
}

/// Unique holder id per process so stale recovery can distinguish replicas.
fn maintenance_holder_id() -> &'static str {
    static HOLDER: OnceLock<String> = OnceLock::new();
    HOLDER.get_or_init(|| {
        let host = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "unknown-host".to_string());
        format!("install-worker:{host}:{}", std::process::id())
    })
}

pub async fn run_if_maintenance_leader<F, Fut>(
    pool: &AnyPool,
    engine: DatabaseEngine,
    task_name: &str,
    task: F,
) where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    let holder_id = maintenance_holder_id();
    let acquired = acquire_table_maintenance_leader(pool, engine, task_name, holder_id).await;

    if !acquired {
        tracing::debug!(
            target: "sdkwork.drive",
            event = "drive.install_worker.leader_skipped",
            task = task_name,
            engine = ?engine,
            holder_id = holder_id,
            "another install-worker replica holds the maintenance lock"
        );
        return;
    }

    let pool_for_heartbeat = pool.clone();
    let task_name_owned = task_name.to_string();
    let holder_id_owned = holder_id.to_string();
    let heartbeat = tokio::spawn(async move {
        let mut interval =
            tokio::time::interval(Duration::from_secs(LEADER_HEARTBEAT_INTERVAL_SECS));
        interval.tick().await;
        loop {
            interval.tick().await;
            renew_maintenance_leader_lease(&pool_for_heartbeat, &task_name_owned, &holder_id_owned)
                .await;
        }
    });

    task().await;

    heartbeat.abort();
    let _ = heartbeat.await;

    release_table_maintenance_leader(pool, task_name, holder_id).await;
}

async fn acquire_table_maintenance_leader(
    pool: &AnyPool,
    engine: DatabaseEngine,
    task_name: &str,
    holder_id: &str,
) -> bool {
    let mut connection = match pool.acquire().await {
        Ok(connection) => connection,
        Err(error) => {
            tracing::warn!(
                target: "sdkwork.drive",
                event = "drive.install_worker.leader_connection_failed",
                task = task_name,
                error = %error,
                "maintenance leader connection acquire failed"
            );
            return false;
        }
    };

    let begin_sql = match engine {
        DatabaseEngine::Sqlite => "BEGIN IMMEDIATE",
        DatabaseEngine::Postgresql => "BEGIN",
    };
    if let Err(error) = sqlx::query(begin_sql).execute(&mut *connection).await {
        tracing::warn!(
            target: "sdkwork.drive",
            event = "drive.install_worker.leader_acquire_failed",
            task = task_name,
            error = %error,
            "maintenance leader transaction begin failed"
        );
        return false;
    }

    let acquired = match evaluate_table_maintenance_leader(
        &mut connection,
        engine,
        task_name,
        holder_id,
    )
    .await
    {
        Ok(value) => value,
        Err(error) => {
            tracing::warn!(
                target: "sdkwork.drive",
                event = "drive.install_worker.leader_acquire_failed",
                task = task_name,
                error = %error,
                "maintenance leader evaluation failed"
            );
            false
        }
    };

    let finish_result = if acquired {
        sqlx::query("COMMIT").execute(&mut *connection).await
    } else {
        sqlx::query("ROLLBACK").execute(&mut *connection).await
    };
    if let Err(error) = finish_result {
        tracing::warn!(
            target: "sdkwork.drive",
            event = "drive.install_worker.leader_acquire_failed",
            task = task_name,
            error = %error,
            "maintenance leader transaction finish failed"
        );
        return false;
    }

    acquired
}

async fn evaluate_table_maintenance_leader(
    connection: &mut sqlx::pool::PoolConnection<sqlx::Any>,
    engine: DatabaseEngine,
    task_name: &str,
    holder_id: &str,
) -> Result<bool, sqlx::Error> {
    let lock_key = maintenance_leader_lock_key(task_name);
    let existing = match engine {
        DatabaseEngine::Postgresql => {
            sqlx::query(
                "SELECT holder_id, CAST(acquired_at AS TEXT) AS acquired_at
                 FROM dr_drive_maintenance_leader
                 WHERE lock_key = $1
                 FOR UPDATE",
            )
            .bind(&lock_key)
            .fetch_optional(&mut **connection)
            .await?
        }
        DatabaseEngine::Sqlite => {
            sqlx::query(
                "SELECT holder_id, acquired_at
                 FROM dr_drive_maintenance_leader
                 WHERE lock_key = $1",
            )
            .bind(&lock_key)
            .fetch_optional(&mut **connection)
            .await?
        }
    };

    if let Some(row) = existing {
        let current_holder: String = row.get("holder_id");
        if current_holder != holder_id && !leader_lock_is_stale(&row) {
            return Ok(false);
        }
    }

    sqlx::query(
        "INSERT INTO dr_drive_maintenance_leader (lock_key, holder_id, acquired_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT(lock_key) DO UPDATE SET
            holder_id = excluded.holder_id,
            acquired_at = excluded.acquired_at",
    )
    .bind(&lock_key)
    .bind(holder_id)
    .execute(&mut **connection)
    .await?;

    Ok(true)
}

async fn renew_maintenance_leader_lease(pool: &AnyPool, task_name: &str, holder_id: &str) {
    let lock_key = maintenance_leader_lock_key(task_name);
    if let Err(error) = sqlx::query(
        "UPDATE dr_drive_maintenance_leader
         SET acquired_at = CURRENT_TIMESTAMP
         WHERE lock_key = $1 AND holder_id = $2",
    )
    .bind(&lock_key)
    .bind(holder_id)
    .execute(pool)
    .await
    {
        tracing::warn!(
            target: "sdkwork.drive",
            event = "drive.install_worker.leader_heartbeat_failed",
            task = task_name,
            holder_id = holder_id,
            error = %error,
            "maintenance leader heartbeat failed"
        );
    }
}

fn leader_lock_is_stale(row: &sqlx::any::AnyRow) -> bool {
    let acquired_at: String = row.get("acquired_at");
    let parsed = chrono::DateTime::parse_from_rfc3339(&acquired_at)
        .map(|value| value.with_timezone(&chrono::Utc))
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(&acquired_at, "%Y-%m-%d %H:%M:%S")
                .map(|value| value.and_utc())
        });
    match parsed {
        Ok(value) => {
            chrono::Utc::now()
                .signed_duration_since(value)
                .num_seconds()
                >= DRIVE_MAINTENANCE_LEADER_STALE_SECS
        }
        Err(_) => true,
    }
}

async fn release_table_maintenance_leader(pool: &AnyPool, task_name: &str, holder_id: &str) {
    let lock_key = maintenance_leader_lock_key(task_name);
    if let Err(error) = sqlx::query(
        "DELETE FROM dr_drive_maintenance_leader
         WHERE lock_key = $1 AND holder_id = $2",
    )
    .bind(&lock_key)
    .bind(holder_id)
    .execute(pool)
    .await
    {
        tracing::warn!(
            target: "sdkwork.drive",
            event = "drive.install_worker.leader_release_failed",
            holder_id = holder_id,
            error = %error,
            "maintenance leader lock release failed"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_drive_config::DatabaseEngine;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn maintenance_leader_lock_keys_include_task_name() {
        assert_eq!(
            maintenance_leader_lock_key("upload_session_cleanup"),
            "install-worker:upload_session_cleanup"
        );
    }

    #[test]
    fn maintenance_holder_id_is_unique_per_process() {
        let first = maintenance_holder_id();
        let second = maintenance_holder_id();
        assert_eq!(first, second);
        assert!(first.contains(&format!("{}", std::process::id())));
    }

    #[tokio::test]
    async fn sqlite_table_leader_lock_supports_back_to_back_runs() {
        use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;

        sqlx::any::install_default_drivers();
        let pool = sqlx::any::AnyPoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        install_any_schema(&pool, DatabaseEngine::Sqlite)
            .await
            .expect("sqlite schema should install");

        static RUNS: AtomicUsize = AtomicUsize::new(0);
        for _ in 0..2 {
            run_if_maintenance_leader(
                &pool,
                DatabaseEngine::Sqlite,
                "upload_session_cleanup",
                || async {
                    RUNS.fetch_add(1, Ordering::SeqCst);
                },
            )
            .await;
        }

        assert_eq!(RUNS.load(Ordering::SeqCst), 2);
    }
}
