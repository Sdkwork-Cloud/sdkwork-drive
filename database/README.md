# DRIVE Database Module

Canonical lifecycle assets for `sdkwork-drive` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `drive`
- serviceCode: `DRIVE`
- tablePrefix: `dr_` (physical tables; manifest module prefix remains `drive_`)

## Commands

```bash
pnpm run db:materialize:contract
pnpm run db:validate
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```

## Baseline

Legacy PostgreSQL schema is consolidated in `database/ddl/baseline/postgres/0001_drive_legacy_baseline.sql` from `crates/sdkwork-drive-workspace-service/src/infrastructure/sql/postgres_core.sql`.

## Runtime bootstrap

PostgreSQL services call `sdkwork-drive-workspace-service::bootstrap::bootstrap_drive_database_for_config()` via `connect_any_database_and_install_schema()`.

SQLite tests and local runtimes continue to use `install_any_schema()` with inline `sqlite_core.sql`.
