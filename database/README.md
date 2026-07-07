# DRIVE Database Module

Canonical lifecycle assets for `sdkwork-drive` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `drive`
- serviceCode: `DRIVE`
- tablePrefix: `dr_` (physical tables; manifest module prefix remains `drive_`)

## Initialization state

This module ships a governed **baseline-plus-migrations** lifecycle:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_drive_baseline.sql` contains the greenfield DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/0002` through `0006` materialize folded baseline deltas for upgrade paths and CI validation. Post-GA schema changes append new versioned files here.
3. **Runtime installers** — `crates/sdkwork-drive-workspace-service/src/infrastructure/sql/{postgres,sqlite}_core.sql` remain the authoritative runtime schema for `sqlx::AnyPool` services; SQLite applies incremental column/index upgrades on boot when needed.
4. **Drift** — run `pnpm db:drift:check` before release.

### Seed lifecycle

`database/seeds/seed.manifest.json` declares `i18nVersion`, fallback/default locales, active locale sets, and the current no-op common bootstrap seed. Drive currently has no required reference data.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```
