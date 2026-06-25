# Drive Documentation

Documentation for SDKWork Drive follows `../sdkwork-specs/DOCUMENTATION_SPEC.md`.

## Canon

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) |
| Production operations | [runbooks/drive-production-operations.md](runbooks/drive-production-operations.md) |
| Backup and DR | [runbooks/drive-backup-disaster-recovery.md](runbooks/drive-backup-disaster-recovery.md) |

## Standards (TECH shards)

- [TECH-drive-iam-integration-standard.md](architecture/tech/TECH-drive-iam-integration-standard.md)
- [TECH-drive-sdk-integration-standard.md](architecture/tech/TECH-drive-sdk-integration-standard.md)
- [TECH-drive-topology-standard.md](architecture/tech/TECH-drive-topology-standard.md)
- [TECH-drive-uploader-standard.md](architecture/tech/TECH-drive-uploader-standard.md)
- [TECH-database-architecture.md](architecture/tech/TECH-database-architecture.md)
- [TECH-storage-s3-architecture.md](architecture/tech/TECH-storage-s3-architecture.md)

## Requirements

- [REQ-2026-0001-production-readiness.md](product/requirements/REQ-2026-0001-production-readiness.md)
- [REQ-2026-0002-production-security-alignment.md](product/requirements/REQ-2026-0002-production-security-alignment.md)
- [REQ-2026-0003-pre-launch-debt-cleanup.md](product/requirements/REQ-2026-0003-pre-launch-debt-cleanup.md)

## Evidence and operator guides

| Document | Path |
| --- | --- |
| Pre-launch checklist | [guides/operator/pre-launch-checklist.md](guides/operator/pre-launch-checklist.md) |
| Operator guide index | [guides/operator/README.md](guides/operator/README.md) |
| Releases and GA promotion | [releases/README.md](releases/README.md) |
| Changelog index | [changelogs/README.md](changelogs/README.md) |

## Release maturity

Drive is **Beta / DRAFT** for catalog publication. Code and verification gates pass for controlled pilot deployment. Commercial GA requires signed multi-platform artifacts, CDN catalog media, immutable K8s digests, and staging smoke evidence — see [releases/README.md](releases/README.md).

## Verification

- `pnpm verify`
- `pnpm deploy:validate`
- `pnpm check:docs-standard`

Legacy root-level filenames under `docs/` redirect to the TECH shards above. Do not add new content outside the canon paths.
