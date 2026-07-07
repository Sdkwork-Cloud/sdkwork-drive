---
id: REQ-2026-0003
title: Pre-launch technical debt cleanup for SDKWork Drive
owner: SDKWork maintainers
status: done
source: platform
updated: 2026-07-08
problem: Before commercial GA, Drive must remove dead auth-policy wiring, standardize deployment profile env keys, eliminate stale documentation, align deploy/API/database framework contracts with sdkwork-specs, and prevent legacy HTTP envelope modules from returning.
goals:
  - Remove unused `auth_policy` state fields and deprecated `build_router_with_pool_and_iam_policy` builders.
  - Standardize `SDKWORK_DRIVE_DEPLOYMENT_PROFILE` across systemd units and deployment validators.
  - Provide `deployments/deploy.yaml` per SDKWORK_DEPLOY_SPEC.md.
  - Add a strict deployment validator that fails release-mode checks on `REPLACE_WITH_RELEASE_DIGEST` and non-immutable Kubernetes image references.
  - Route JWT/download crypto through `sdkwork-utils-rust` instead of direct `sha2`/`hmac` in workspace route crates.
  - Include `api:envelope:check` and `api:schema:check` in the root `pnpm check` gate.
  - Provide an operator pre-launch checklist linked from deployment validation.
  - Remove legacy `sdkwork-drive-http` envelope modules (`response.rs`, `problem_detail.rs`); keep `api_problem.rs` as the sole ProblemDetail authority.
  - Keep `.env.postgres.example` on `SDKWORK_DRIVE_DATABASE_*` only (no retired `SDKWORK_CLAW_DATABASE_*` prefixes).
  - Route App SDK uploader composed helpers through `@sdkwork/utils` (`hexEncode`, `uuid`).
  - Align `pnpm-workspace.yaml` and PC `peerDependencies` with sdkwork-specs workspace registry (`verify-repo`).
non_goals:
  - Enabling artifact signing or flipping catalog publish status to ACTIVE.
users:
  - platform operators
  - backend maintainers
acceptance_criteria:
  - No router crate exposes `build_router_with_pool_and_iam_policy`.
  - All systemd units in `deployments/systemd/` set `SDKWORK_DRIVE_DEPLOYMENT_PROFILE`.
  - `deployments/deploy.yaml` exists and passes `check-deploy-standard.mjs`.
  - `pnpm check` includes `api:envelope:check`, `api:schema:check`, and passes.
  - `pnpm deploy:validate` and `pnpm check:architecture-alignment` pass.
  - `node --test tools/check_drive_deployments.test.mjs` proves default-mode warnings, strict-mode placeholder rejection, and strict-mode real digest acceptance.
  - `docs/guides/operator/pre-launch-checklist.md` exists and is referenced by deployment checks.
  - `crates/sdkwork-drive-http/src/response.rs` and `problem_detail.rs` do not exist; `lib.rs` exposes only `api_problem`.
  - `.env.postgres.example` contains no `SDKWORK_CLAW_DATABASE_*` keys.
  - `@sdkwork/drive-app-sdk` depends on `@sdkwork/utils`; `uploaderClient.ts` does not inline hex formatting.
  - `pnpm check:app-composition` (`verify-repo`) passes for workspace package wiring.
non_functional_requirements:
  reliability: Metrics and tracing use `deployment_profile` label via `resolve_deployment_profile_label()`.
affected_surfaces:
  - backend
  - deployments
  - docs
  - sdks
  - tests
verification:
  - cargo check --workspace
  - pnpm verify
  - pnpm check
  - pnpm api:envelope:check
  - pnpm api:schema:check
  - node --test tools/check_drive_deployments.test.mjs
  - pnpm deploy:validate
  - pnpm check:architecture-alignment
---
