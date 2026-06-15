# Drive SDK Workspace

`sdks/` contains SDK family workspaces and generated SDK output for
`sdkwork-drive`.

Boundary rules:

- `apis/` contains Drive-owned API contract sources and materialized OpenAPI
  inputs.
- `sdks/` contains SDK family metadata, SDK generation manifests, generated
  language workspaces, composed facades, and generated transport output.
- Generated transport output remains under `generated/server-openapi` inside
  each SDK family language workspace.

Use `tools/drive_sdk_generate.mjs` for Drive SDK generation. The wrapper must
call the canonical sibling `../sdkwork-sdk-generator/bin/sdkgen.js` generator.
