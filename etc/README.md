# SDKWork Drive Source Configuration

`sdkwork.deployment.config.json` is the source-controlled profile index for
SDKWork Drive. It selects a typed profile from `topology/`; the topology
contract is `../specs/topology.spec.json` and the global authority is
`../sdkwork-specs/SOURCE_CONFIG_SPEC.md`.

Supported source profiles are `standalone.development`,
`standalone.production`, `cloud.development`, and `cloud.production`.
Standalone development owns the local Drive standalone gateway. Cloud
development starts clients only and consumes the deployed
`sdkwork-api-cloud-gateway` URL.

Additional safe templates:

- `drive.database.example.toml`: server/runtime database TOML example.
- `sdkwork-api-drive-standalone-gateway.development.toml.example`: standalone gateway development profile.
- `sdkwork-api-drive-standalone-gateway.production.toml.example`: standalone gateway production profile.
- `sdkwork-api-cloud-gateway.drive.development.toml`: cloud gateway composition handoff.
- `sdkwork-api-cloud-gateway.drive.production.toml`: cloud gateway production composition handoff.

Host-local overrides such as `.env.postgres`, `.env.local`, and
`etc/*.local.toml` must stay out of source control. Secrets are injected by the
deployment platform or mounted from ignored secret files; they are never
committed under `etc/`. Installed runtime config is materialized to the paths
governed by `../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`.

Validate this authority with:

```powershell
node ../sdkwork-specs/tools/check-source-config-standard.mjs --root .
pnpm topology:validate
```
