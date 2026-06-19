# Sdkwork Drive Runtime Topology

Human summary. Machine contract: `specs/topology.spec.json`.

| Document | Role |
| --- | --- |
| `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md` | Shared adoption path |
| `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_NAMING.md` | Naming authority |
| `configs/topology/README.md` | Profile file index |

## Archetype

**application-http-gateway**

## Default dev profile

**self-hosted.split-services.development** - `pnpm dev`

## Cloud production

**cloud-hosted.split-services.production** - `pnpm build`

Public hosts: application `drive.sdkwork.com`, platform `api.sdkwork.com`.
