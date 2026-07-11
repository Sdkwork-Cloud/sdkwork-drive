# Drive Config Templates

`configs/` contains safe checked-in config templates and examples for
`sdkwork-drive`.

Current templates:

- `drive.database.example.toml`: server/runtime database TOML example.
- `sdkwork-drive-standalone-gateway.development.toml.example`: standalone gateway dev profile.
- `sdkwork-drive-standalone-gateway.production.toml.example`: standalone gateway production profile.
- `sdkwork-api-cloud-gateway.drive.development.toml`: cloud unified gateway dev handoff for Drive surfaces.
- `sdkwork-api-cloud-gateway.drive.production.toml`: cloud unified gateway production handoff for Drive surfaces.
- `topology/`: runtime topology profile env files following `<deploymentProfile>.<environment>.env` naming.

Host-local overrides such as `.env.postgres`, `.env.local`, and
`configs/*.local.toml` must stay out of source control. Runtime user-private
config is governed by `../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`.
