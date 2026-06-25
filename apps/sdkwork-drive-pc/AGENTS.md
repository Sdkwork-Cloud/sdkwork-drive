# Repository Guidelines

<!-- SDKWORK-AGENTS-GENERATED: v2 -->

## SDKWORK Soul

Read `../../../sdkwork-specs/SOUL.md` before executing tasks in this application root. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this application root:

- `../../../sdkwork-specs/README.md`
- `../../../sdkwork-specs/SOUL.md`
- `../../../sdkwork-specs/AGENTS_SPEC.md`
- `../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md`
- `../../../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`
- `../../../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../../../sdkwork-specs/NAMING_SPEC.md`

Do not copy root standard text into this application. If these paths do not resolve, stop and report the broken workspace layout.

## Application Identity

This directory is the SDKWork PC application root for `sdkwork-drive-pc`. Read `sdkwork.app.config.json` only before changing application behavior, runtime config, SDK wiring, release metadata, app-owned capabilities, package identity, or publishing metadata.

## Local Dictionary Structure

- `AGENTS.md`: application agent entrypoint and relative SDKWork spec index.
- `CLAUDE.md`, `GEMINI.md`, `CODEX.md`: compatibility shims that point to `AGENTS.md` and must not duplicate rules.
- `sdkwork.app.config.json`: SDKWork App Manifest v3 identity, release, publish, and environment source of truth.
- `specs/`: application component contract and local narrowing rules.
- `config/`: safe runtime config examples grouped by browser, desktop, server, and container target.
- `packages/`: PC runtime, shared UI, feature, transfer, type, and desktop host packages.
- `src/`: thin application bootstrap, providers, AuthGate wiring, and root composition.
- `package.json`: app-surface command manifest; public command names still follow `PNPM_SCRIPT_SPEC.md`.

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

Repository-wide product and platform docs: [../../docs/README.md](../../docs/README.md).

## Spec Resolution Order

Use dynamic progressive loading:

1. Read this `AGENTS.md`.
2. Read `sdkwork.app.config.json` only for app behavior, runtime config, SDK wiring, release, or package identity changes.
3. Read `specs/README.md` and `specs/component.spec.json` only when local component contracts are touched.
4. Read `.sdkwork/README.md`, `.sdkwork/skills/`, and `.sdkwork/plugins/` only when local agent extensions are relevant.
5. Read `../../../sdkwork-specs/README.md`, then only the task-specific root specs.
6. Inspect implementation files after the relevant standards are clear.

## Required Specs By Task Type

- Agent/workflow changes: `../../../sdkwork-specs/SOUL.md`, `../../../sdkwork-specs/AGENTS_SPEC.md`, `../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`, `../../../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.
- Package script changes: `../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md`, `../../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.
- Any code change: `../../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- TypeScript/Node code: `../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../../sdkwork-specs/FRONTEND_SPEC.md`, `../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, and `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`.
- PC application root and desktop host changes: `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md` and `../../../sdkwork-specs/DESKTOP_APP_ARCHITECTURE_SPEC.md` when desktop/Tauri is touched.
- Runtime config and environment changes: `../../../sdkwork-specs/CONFIG_SPEC.md`, `../../../sdkwork-specs/ENVIRONMENT_SPEC.md`, and `../../../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`.
- SDK wiring changes: `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`, `../../../sdkwork-specs/SDK_SPEC.md`, and `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`.
- File upload/download/storage behavior: `../../../sdkwork-specs/DRIVE_SPEC.md` and `../../../sdkwork-specs/MEDIA_RESOURCE_SPEC.md`.

Language-specific specs are on-demand; do not load unrelated specs for unrelated tasks.

## Code Style Rules

Root `src/` stays thin: bootstrap, providers, global layout, AuthGate wiring, environment selection, and package registration only. UI and feature packages must not construct raw HTTP calls, manual auth headers, manual API key headers, or generated SDK clients for business flows. Runtime/bootstrap owns SDK construction, appbase IAM runtime, and the global TokenManager.

## Build, Test, and Verification

Run commands from this directory unless a command explicitly targets the repository root:

- `pnpm dev`
- `pnpm dev:desktop`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

From the repository root, run `pnpm check:pc-standard`, `pnpm check:pnpm-script-standard`, and `pnpm check:agent-workflow-standard` when changing app root structure, commands, AGENTS, packaging, or workflow metadata.

## Agent Execution Rules

Use dynamic progressive loading and the local convention dictionary before broad source loading. Do not hand-edit generated SDK output. Do not replace generated SDK integration with raw HTTP. Do not add app-local upload, presign, object-key, auth, or session APIs when Drive or appbase already owns the capability. Record exact verification commands and outputs before reporting completion.

## Human Review Rules

Request human review before changing public app identity, breaking package names, changing security/auth behavior, changing generated SDK ownership, altering database migrations, deleting data/files, or publishing release artifacts.
