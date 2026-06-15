# Drive Jobs

`jobs/` is reserved for Drive background workers, scheduled jobs, queue
consumers, batch processors, and maintenance task packages.

Drive currently keeps product maintenance logic in the Rust service crates.
Add a job package here only when it is independently authored, packaged, or
validated outside request/response API services.
