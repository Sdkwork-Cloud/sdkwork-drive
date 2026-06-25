use std::time::Duration;

use sdkwork_drive_config::DatabaseEngine;
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
    /// Interval for domain outbox dispatch.
    pub domain_outbox_dispatch_interval: Duration,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            upload_cleanup_interval: Duration::from_secs(3600),
            orphan_cleanup_interval: Duration::from_secs(86400),
            quota_recalculation_interval: Duration::from_secs(3600),
            domain_outbox_dispatch_interval: Duration::from_secs(30),
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
    pub fn start(&mut self, pool: sqlx::AnyPool, engine: DatabaseEngine) {
        let pool_clone = pool.clone();
        let interval = self.config.upload_cleanup_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                let pool_for_task = pool_clone.clone();
                crate::maintenance::leader::run_if_maintenance_leader(
                    &pool_clone,
                    engine,
                    "upload_session_cleanup",
                    || async move {
                        match crate::maintenance::upload_session_cleanup::cleanup_expired_sessions(
                            &pool_for_task,
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
                            Err(error) => {
                                tracing::error!("Upload session cleanup failed: {}", error);
                            }
                        }
                    },
                )
                .await;
            }
        }));

        let pool_clone = pool.clone();
        let interval = self.config.orphan_cleanup_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                let pool_for_task = pool_clone.clone();
                crate::maintenance::leader::run_if_maintenance_leader(
                    &pool_clone,
                    engine,
                    "orphan_object_cleanup",
                    || async move {
                        match crate::maintenance::orphan_object_cleanup::cleanup_orphan_objects(
                            &pool_for_task,
                        )
                        .await
                        {
                            Ok(result) => {
                                tracing::info!("Orphan cleanup: nodes={}", result.orphaned_nodes);
                            }
                            Err(error) => {
                                tracing::error!("Orphan cleanup failed: {}", error);
                            }
                        }
                    },
                )
                .await;
            }
        }));

        let pool_clone = pool.clone();
        let interval = self.config.quota_recalculation_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                let pool_for_task = pool_clone.clone();
                crate::maintenance::leader::run_if_maintenance_leader(
                    &pool_clone,
                    engine,
                    "quota_recalculation",
                    || async move {
                        match crate::maintenance::quota_recalculation::recalculate_quotas(&pool_for_task)
                            .await
                        {
                            Ok(result) => {
                                tracing::info!(
                                    "Quota recalculation: tenants={}, spaces={}",
                                    result.tenants_processed,
                                    result.spaces_processed
                                );
                            }
                            Err(error) => {
                                tracing::error!("Quota recalculation failed: {}", error);
                            }
                        }
                    },
                )
                .await;
            }
        }));

        let pool_clone = pool.clone();
        let interval = self.config.domain_outbox_dispatch_interval;
        self.handles.push(tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                let pool_for_task = pool_clone.clone();
                crate::maintenance::leader::run_if_maintenance_leader(
                    &pool_clone,
                    engine,
                    "domain_outbox_dispatch",
                    || async move {
                        match crate::maintenance::domain_outbox_dispatch::dispatch_pending_outbox_events(
                            &pool_for_task,
                        )
                        .await
                        {
                            Ok(result) => {
                                if result.processed > 0 {
                                    tracing::info!(
                                        "Domain outbox dispatch: processed={}, delivered={}, failed={}",
                                        result.processed,
                                        result.delivered,
                                        result.failed
                                    );
                                }
                            }
                            Err(error) => {
                                tracing::error!("Domain outbox dispatch failed: {}", error);
                            }
                        }
                    },
                )
                .await;
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
