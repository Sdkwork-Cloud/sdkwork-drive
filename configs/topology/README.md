# Drive topology profiles

Machine contract: `specs/topology.spec.json` (`schemaVersion: 2`, archetype `application-http-gateway`).

Platform standard: `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md`

## Active profiles

| Profile id | Command |
| --- | --- |
| `self-hosted.split-services.development` | `pnpm drive:dev`, `pnpm drive:dev:desktop` |
| `cloud-hosted.split-services.development` | `pnpm drive:dev:cloud` |
| `self-hosted.unified-process.production` | `pnpm drive:build:self-hosted` |
| `cloud-hosted.split-services.production` | `pnpm drive:build` |

Loader: `scripts/lib/drive-topology.mjs` → `@sdkwork/app-topology`.
