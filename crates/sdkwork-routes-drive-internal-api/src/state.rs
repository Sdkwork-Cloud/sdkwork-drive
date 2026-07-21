use sdkwork_drive_object_runtime::DriveObjectStoreRuntime;
use sqlx::AnyPool;

#[derive(Debug, Clone)]
pub struct InternalApiState {
    pub pool: AnyPool,
    pub object_runtime: DriveObjectStoreRuntime,
}

impl InternalApiState {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            object_runtime: DriveObjectStoreRuntime::new(pool.clone()),
            pool,
        }
    }
}
