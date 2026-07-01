# Deprecated runtime SQL entrypoints

`postgres_core.sql` and `sqlite_core.sql` remain for SQLite test/runtime parity and schema contract tests.

PostgreSQL production bootstrap MUST use `sdkwork-drive-database-host` via `bootstrap_drive_database_for_config()` instead of calling `install_postgres_schema()` directly.

Canonical baseline: `database/ddl/baseline/postgres/0001_drive_baseline.sql`.
