---
id: REQ-2026-0002
title: Production security and IAM alignment for SDKWork Drive
owner: SDKWork maintainers
status: done
source: platform
updated: 2026-06-25
problem: Drive production routers must validate IAM sessions through the IAM database resolver, harden webhook dispatch, and align deployment descriptors with SECURITY_SPEC and IAM_LOGIN_INTEGRATION_SPEC without leaving stale documentation.
goals:
  - Protected HTTP routers finalize with IamDatabaseWebRequestContextResolver in production assembly paths.
  - Webhook outbox dispatch validates DNS-resolved addresses before egress.
  - Backend and admin-storage APIs expose in-process rate limiting with documented env keys.
  - Kubernetes, systemd, container, and runbook docs reflect current production defaults.
non_goals:
  - Enabling artifact signing or ACTIVE catalog publication in this requirement.
  - Redis-backed distributed rate limiting.
users:
  - platform operators
  - security reviewers
  - backend maintainers
acceptance_criteria:
  - `build_router_with_database_config` paths call `wrap_router_with_web_framework_from_env`.
  - `validate_webhook_https_url_for_dispatch` runs before outbox webhook POST.
  - Backend and admin-storage APIs reject personal IAM sessions (`login_scope=TENANT`).
  - HTTP 500 responses return generic client-safe problem details; internal errors are logged server-side only.
  - PC bootstrap failure markup escapes user-visible error content.
  - `pnpm check:architecture-alignment` and `pnpm deploy:validate` pass.
  - TECH IAM standard and runbooks document IAM DB resolver wiring and DR procedures.
non_functional_requirements:
  security: IAM DB session validation on protected routers; webhook SSRF DNS checks; install-worker health bind defaults to loopback.
  reliability: PostgreSQL pool acquire/idle/max lifetime timeouts; cloud outbox single-dispatcher guidance documented.
affected_surfaces:
  - backend
  - deployments
  - docs
trace:
  specs:
    - SECURITY_SPEC.md
    - IAM_LOGIN_INTEGRATION_SPEC.md
    - DEPLOYMENT_SPEC.md
    - DOCUMENTATION_SPEC.md
  components:
    - crates/sdkwork-router-drive-app-api
    - crates/sdkwork-router-drive-backend-api
    - crates/sdkwork-router-drive-open-api
    - crates/sdkwork-router-storage-backend-api
    - crates/sdkwork-drive-security
    - deployments/kubernetes/drive-services.yaml
verification:
  - pnpm verify
  - pnpm deploy:validate
  - pnpm check:architecture-alignment
