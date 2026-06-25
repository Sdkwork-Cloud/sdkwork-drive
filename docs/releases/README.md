# SDKWork Drive Releases

Release notes and promotion evidence for SDKWork Drive follow `../../sdkwork-specs/RELEASE_SPEC.md` and `../product/prd/PRD.md`.

## Current train

| Channel | Version | Status | Notes |
| --- | --- | --- | --- |
| STABLE | 0.1.0 | BETA / DRAFT | Merge and verification gates pass; GA blocked on signing, catalog CDN, and multi-platform artifact evidence |

## GA promotion checklist

Before setting `publish.status` to `ACTIVE` in `sdkwork.app.config.json`:

1. Run `pnpm verify` and `pnpm deploy:validate` on the release commit.
2. Materialize signed release artifacts for every enabled install package.
3. Upload catalog media to CDN and clear `generatedPlaceholder` metadata.
4. Replace Kubernetes `REPLACE_WITH_RELEASE_DIGEST` placeholders with immutable digests.
5. Run `SDKWORK_RELEASE_VALIDATION=strict node tools/check_sdkwork_drive_release_readiness.mjs` with zero blocking failures.
6. Record staging smoke evidence from `.github/workflows/staging-e2e.yml`.

See [pre-launch-checklist.md](../guides/operator/pre-launch-checklist.md) for the operator-facing checklist.

## Version history

Release notes are recorded in `sdkwork.app.config.json` → `release.notes` until a tagged GA train publishes dedicated notes in this directory.
