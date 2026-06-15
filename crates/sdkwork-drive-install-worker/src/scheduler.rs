use std::time::Duration;
use tokio::task::JoinHandle;

/// Scheduler configuration.
#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    /// Interval for upload session cleanup.
    pub upload_cleanup_interval: Duration,
    /// Interval for orphan object cleanup.
    pub orphan_cleanup_interval: Duration,
    /// Interval for quota recalculation.
    pub quota_recalculation_interval: Duration,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            upload_cleanup_interval: Duration::from_secs(3600), // 1 hour
            orphan_cleanup_interval: Duration::from_secs(86400), // 24 hours
            quota_recalculation_interval: Duration::from_secs(3600), // 1 hour
        }
    }
}

/// Background task scheduler.
pub struct Scheduler {
    config: SchedulerConfig,
    handles: Vec<JoinHandle<()>>,
}

impl Scheduler {
    /// Create a new scheduler with the given configuration.
    pub fn new(config: SchedulerConfig) -> Self {
        Self {
            config,
            handles: Vec::new(),
        }
    }

    /// Start all scheduled tasks.
    pub fn start(&mut self, pool: sqlx::AnyPool) {
        let pool_clone = pool.clone();
        let interval = self.config.upload_cleanup_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                match crate::maintenance::upload_session_cleanup::cleanup_expired_sessions(
                    &pool_clone,
                )
                .await
                {
                    Ok(result) => {
                        tracing::info!(
                            "Upload session cleanup: expired={}, parts={}",
                            result.expired_sessions,
                            result.cleaned_parts
                        );
                    }
                    Err(e) => {
                        tracing::error!("Upload session cleanup failed: {}", e);
                    }
                }
            }
        }));

        let pool_clone = pool.clone();
        let interval = self.config.orphan_cleanup_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                match crate::maintenance::orphan_object_cleanup::cleanup_orphan_objects(&pool_clone)
                    .await
                {
                    Ok(result) => {
                        tracing::info!("Orphan cleanup: nodes={}", result.orphaned_nodes);
                    }
                    Err(e) => {
                        tracing::error!("Orphan cleanup failed: {}", e);
                    }
                }
            }
        }));

        let pool_clone = pool;
        let interval = self.config.quota_recalculation_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                match crate::maintenance::quota_recalculation::recalculate_quotas(&pool_clone).await
                {
                    Ok(result) => {
                        tracing::info!(
                            "Quota recalculation: tenants={}, spaces={}",
                            result.tenants_processed,
                            result.spaces_processed
                        );
                    }
                    Err(e) => {
                        tracing::error!("Quota recalculation failed: {}", e);
                    }
                }
            }
        }));
    }

    /// Stop all scheduled tasks.
    pub fn stop(&mut self) {
        for handle in self.handles.drain(..) {
            handle.abort();
        }
    }
}

impl Drop for Scheduler {
    fn drop(&mut self) {
        self.stop();
    }
}
