# Drive Config Templates

`configs/` contains safe checked-in config templates and examples for
`sdkwork-drive`.

Current templates:

- `drive.database.example.toml`: server/runtime database TOML example.

Host-local overrides such as `.env.postgres`, `.env.local`, and
`configs/*.local.toml` must stay out of source control. Runtime user-private
config is governed by `../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`.
