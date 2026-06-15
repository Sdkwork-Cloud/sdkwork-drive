use sqlx::AnyPool;

#[derive(Debug, Clone)]
pub struct OpenState {
    pub(crate) pool: AnyPool,
}

impl OpenState {
    pub fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}
