# SDKWork Drive Controlled Pilot Deployment

Use this guide after `pnpm check` passes on the release commit. Pilot validates production topology and operator workflows before commercial GA (`publish.status=ACTIVE`).

## Prerequisites

| Item | Requirement |
| --- | --- |
| Code gates | `pnpm check` and `pnpm verify` pass on the target commit |
| Database | PostgreSQL provisioned; `pnpm db:migrate` applied against pilot schema |
| IAM | Tenant org-scoped admin credentials; IAM DB session resolver reachable |
| Secrets | `SDKWORK_DRIVE_DATABASE_*`, JWT/HMAC secrets, download token HMAC (production profile) |
| Topology | Profile selected from `configs/topology/` (pilot: `standalone.unified-process.development` or staging production profile) |

## Phase 1 — Local / staging smoke

From repository root:

```bash
pnpm check
pnpm deploy:validate
pnpm topology:validate
pnpm gateway:assembly:validate
pnpm db:validate
pnpm api:envelope:check
pnpm api:schema:check
```

Start standalone gateway (development profile):

```bash
pnpm gateway:run:standalone
```

Or browser dev workflow:

```bash
pnpm dev:browser
```

Validate:

- Login via appbase IAM; protected routes return `401` without token
- Upload through `@sdkwork/drive-app-sdk` uploader (no raw presign HTTP)
- Download grant and share-link resolve flows
- Admin routes reject personal IAM sessions (`login_scope=TENANT`)

## Phase 2 — Deploy to pilot environment

1. Select profile in `deployments/deploy.yaml` (e.g. `standalone.unified-process.production` or `cloud.split-services.production`).
2. Apply topology env from `configs/topology/<profile>.env`.
3. Run database lifecycle:

```bash
pnpm db:bootstrap
pnpm db:status
```

4. Deploy gateway + install-worker per [drive-production-operations.md](../../runbooks/drive-production-operations.md).
5. Configure observability: scrape `/metrics`, OTEL exporter, structured logs with `traceId`.

Production profile hardening:

- `SDKWORK_DRIVE_RUNTIME_PROFILE=production`
- `SDKWORK_DRIVE_UPLOAD_CONTENT_POLICY_MODE=enforce`
- `SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET` or tenant JSON keys configured
- Multi-instance: `SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis` with Redis URL

## Phase 3 — Operator acceptance

Complete [pre-launch-checklist.md](./pre-launch-checklist.md) **Admin Operations Smoke** section against the pilot backend.

Record evidence:

- `pnpm check` output (commit SHA)
- Staging smoke test results
- Audit/maintenance dry-run job IDs

## Phase 4 — CI release artifacts (pre-GA)

Trigger GitHub Actions **Package Application** (`.github/workflows/package.yml`):

- **workflow_dispatch** with target platforms, or
- Push semver tag `v*`

After CI completes:

```bash
pnpm release:evidence
pnpm release:validate
SDKWORK_RELEASE_VALIDATION=strict pnpm check:release-readiness
```

Remaining GA blockers (CI/ops only):

- Artifact signing (`security.signatureRequired`)
- macOS DMG / Linux AppImage checksums from cross-platform runners
- Catalog media CDN upload (local staging via `pnpm release:catalog-media`)

## Phase 5 — GA promotion

Only after Phase 3–4 evidence is recorded:

1. Upload catalog media to CDN; clear `catalogMediaDeferred` in `sdkwork.app.config.json`.
2. Set immutable K8s digests (replace `REPLACE_WITH_RELEASE_DIGEST`).
3. Set `publish.status=ACTIVE` in `sdkwork.app.config.json`.
4. Re-run strict release readiness with zero blocking failures.

See [releases/README.md](../../releases/README.md) for release train governance.

## Related documents

- [Pre-launch checklist](./pre-launch-checklist.md) — GA gate before public catalog
- [Production operations runbook](../../runbooks/drive-production-operations.md)
- [Alignment evidence](../../reviews/FULL_CODE_REVIEW_REPORT.md)
