# Drive topology profiles

Machine contract: `specs/topology.spec.json` (`schemaVersion: 4`, archetype `application-http-gateway`).

Platform standard: `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`

## Active profiles

| Profile id | Command |
| --- | --- |
| `standalone.development` | `pnpm dev`, `pnpm dev:desktop` |
| `cloud.development` | `pnpm dev:browser:postgres:cloud` |
| `standalone.production` | `pnpm build:standalone` |
| `cloud.production` | `pnpm build` |

Loader: `scripts/lib/drive-topology.mjs` → `@sdkwork/app-topology`.
