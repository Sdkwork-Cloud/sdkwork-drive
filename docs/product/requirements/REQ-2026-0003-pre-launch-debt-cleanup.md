---
id: REQ-2026-0003
title: Pre-launch technical debt cleanup for SDKWork Drive
owner: SDKWork maintainers
status: done
source: platform
updated: 2026-06-25
problem: Before commercial GA, Drive must remove dead auth-policy wiring, standardize deployment profile env keys, and eliminate stale documentation that references superseded APIs or migration stubs.
goals:
  - Remove unused `auth_policy` state fields and deprecated `build_router_with_pool_and_iam_policy` builders.
  - Standardize `SDKWORK_DRIVE_DEPLOYMENT_PROFILE` across systemd units and deployment validators.
  - Redirect legacy `docs/superpowers/**` content to canonical TECH shards.
  - Provide an operator pre-launch checklist linked from deployment validation.
non_goals:
  - Enabling artifact signing or flipping catalog publish status to ACTIVE.
  - Distributed Redis rate limiting.
users:
  - platform operators
  - backend maintainers
acceptance_criteria:
  - No router crate exposes `build_router_with_pool_and_iam_policy`.
  - All systemd units in `deployments/systemd/` set `SDKWORK_DRIVE_DEPLOYMENT_PROFILE`.
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
  - pnpm deploy:validate
  - pnpm check:architecture-alignment
---
