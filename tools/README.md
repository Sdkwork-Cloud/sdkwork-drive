# Developer Tools

`tools/` contains developer, validation, generation, migration, and operator tools for `sdkwork-drive`.

Current layout:

- `drive_sdk_generate.mjs`: SDK generation entrypoint.
- `drive_sdk_generator_runner.mjs`: SDK generator runner.
- `drive_openapi_export.mjs`: OpenAPI export and composition.
- `drive_schema_quality_gate.mjs`: Schema quality gate validation.
- `sdkwork_sdk_generator_stub.mjs`: SDK generator stub for testing.
- `check_sdkwork_drive_dependency_management.mjs`: Dependency management check.
- `check_drive_app_sdk_consumer_integration.mjs`: App SDK consumer integration check.
- `check_sdkwork_drive_pc_standard.mjs`: PC standard compliance check.
- `check_sdkwork_drive_package_standard.mjs`: Package standard compliance check.
