# Drive topology profiles

Machine contract: `specs/topology.spec.json` (`schemaVersion: 2`, archetype `application-http-gateway`).

Platform standard: `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md`

## Active profiles

| Profile id | Command |
| --- | --- |
| `standalone.split-services.development` | `pnpm dev`, `pnpm dev:desktop` |
| `cloud.split-services.development` | `pnpm dev:browser:postgres:split-services:cloud` |
| `standalone.unified-process.production` | `pnpm build:standalone` |
| `cloud.split-services.production` | `pnpm build` |

Loader: `scripts/lib/drive-topology.mjs` → `@sdkwork/app-topology`.
