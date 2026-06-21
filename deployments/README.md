# Drive Deployments

`deployments/` contains deployment descriptors and topology examples for
SDKWork Drive. It is the deployment boundary governed by
`../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md` and
`../sdkwork-specs/DEPLOYMENT_SPEC.md`.

## Allowed Content

- Dockerfile and container build descriptors.
- Kubernetes manifests and Helm charts.
- Terraform or infrastructure-as-code examples.
- Deployment topology examples.

## Forbidden Content

- Runtime config templates (those live in `configs/`).
- Secrets, credentials, or environment-specific overrides.
- Runtime state, databases, logs, or caches.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/DEPLOYMENT_SPEC.md`
- `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`

## Verification

- `pnpm deploy:validate` (validate deployment descriptors)
