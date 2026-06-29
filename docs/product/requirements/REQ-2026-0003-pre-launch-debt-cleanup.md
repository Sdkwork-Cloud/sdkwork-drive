---
id: REQ-2026-0003
title: Pre-launch technical debt cleanup for SDKWork Drive
owner: SDKWork maintainers
status: done
source: platform
updated: 2026-06-29
problem: Before commercial GA, Drive must remove dead auth-policy wiring, standardize deployment profile env keys, eliminate stale documentation, and align deploy/API/database framework contracts with sdkwork-specs.
goals:
  - Remove unused `auth_policy` state fields and deprecated `build_router_with_pool_and_iam_policy` builders.
  - Standardize `SDKWORK_DRIVE_DEPLOYMENT_PROFILE` across systemd units and deployment validators.
  - Provide `deployments/deploy.yaml` per SDKWORK_DEPLOY_SPEC.md.
  - Route JWT/download crypto through `sdkwork-utils-rust` instead of direct `sha2`/`hmac` in workspace route crates.
  - Include `api:envelope:check` and `api:schema:check` in the root `pnpm check` gate.
  - Provide an operator pre-launch checklist linked from deployment validation.
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
  - `docs/guides/operator/pre-launch-checklist.md` exists and is referenced by deployment checks.
non_functional_requirements:
  reliability: Metrics and tracing use `deployment_profile` label via `resolve_deployment_profile_label()`.
affected_surfaces:
  - backend
  - deployments
  - docs
  - tests
verification:
  - cargo check --workspace
  - pnpm verify
  - pnpm check
  - pnpm api:envelope:check
  - pnpm api:schema:check
  - pnpm deploy:validate
  - pnpm check:architecture-alignment
---
