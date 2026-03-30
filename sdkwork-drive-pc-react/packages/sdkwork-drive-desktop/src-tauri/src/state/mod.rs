use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Default)]
pub struct ShutdownIntent {
    requested: AtomicBool,
}

impl ShutdownIntent {
    pub fn request(&self) {
        self.requested.store(true, Ordering::SeqCst);
    }

    pub fn is_requested(&self) -> bool {
        self.requested.load(Ordering::SeqCst)
    }
}
