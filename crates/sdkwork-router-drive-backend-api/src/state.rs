use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct BackendState {
    pub(crate) pool: AnyPool,
}

impl BackendState {
    pub(crate) fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}
