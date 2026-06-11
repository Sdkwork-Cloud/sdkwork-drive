# Repository Guidelines

<!-- SDKWORK-AGENTS-GENERATED: v1 -->

## SDKWORK Soul

Read `../../../sdkwork-specs/SOUL.md` before executing tasks in this application root. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this application root:

- `../../../sdkwork-specs/README.md`
- `../../../sdkwork-specs/SOUL.md`
- `../../../sdkwork-specs/AGENTS_SPEC.md`
- `../../../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../../../sdkwork-specs/NAMING_SPEC.md`

Do not copy root standard text into this application. If these relative paths do not resolve, stop and report the broken workspace layout.

## Application Identity

This directory is the SDKWork PC application root for `sdkwork-drive-pc`.

Read `sdkwork.app.config.json` before changing application behavior, runtime config, SDK wiring, release metadata, app-owned capabilities, package identity, or publishing metadata.

## Local Dictionary Structure

- `AGENTS.md`: application agent entrypoint and relative SDKWORK spec index.
- `CLAUDE.md`: Claude Code compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `GEMINI.md`: Gemini CLI compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `CODEX.md`: Codex compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `sdkwork.app.config.json`: SDKWork App Manifest v3 identity, release, publish, and environment source of truth.
- `.sdkwork/`: source-controlled application workspace metadata; not runtime state.
- `specs/`: application component contract.
- `config/`: checked-in safe runtime config examples grouped by browser, desktop, server, and container target.
- `packages/`: PC runtime, shared UI, feature, transfer, type, and desktop host packages.
- `src/`: thin application bootstrap, providers, AuthGate wiring, and root composition.

## Spec Resolution Order

1. Read this `AGENTS.md`.
2. Read `sdkwork.app.config.json`.
3. Read `specs/README.md` and `specs/component.spec.json` when present.
4. Read `.sdkwork/README.md`, `.sdkwork/skills/`, and `.sdkwork/plugins/` when relevant.
5. Read `../../../sdkwork-specs/README.md` and the task-specific root specs.
6. Inspect implementation files only after the relevant dictionary entries are clear.

## Required Specs By Task Type

- Any code change: `../../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- TypeScript/Node code: `../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../../sdkwork-specs/FRONTEND_SPEC.md`, `../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, and exactly one detailed UI architecture spec.
- PC application root and package changes: `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`, `../../../sdkwork-specs/DESKTOP_APP_ARCHITECTURE_SPEC.md` when desktop/Tauri is touched.
- Runtime config and environment changes: `../../../sdkwork-specs/CONFIG_SPEC.md`, `../../../sdkwork-specs/ENVIRONMENT_SPEC.md`, and `../../../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`.
- App manifest/release changes: `../../../sdkwork-specs/APP_MANIFEST_SPEC.md`.
- SDK wiring changes: `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`, `../../../sdkwork-specs/SDK_SPEC.md`, and `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`.
- File upload/download/storage behavior: `../../../sdkwork-specs/DRIVE_SPEC.md` and `../../../sdkwork-specs/MEDIA_RESOURCE_SPEC.md`.

## Code Style Rules

Root `src/` stays thin: bootstrap, providers, global layout, AuthGate wiring, environment selection, and package registration only.

PC packages must use canonical names:

- `sdkwork-drive-pc-core`
- `sdkwork-drive-pc-commons`
- `sdkwork-drive-pc-file`
- `sdkwork-drive-pc-transfer`
- `sdkwork-drive-pc-types`
- `sdkwork-drive-pc-desktop`

UI and feature packages must not construct raw HTTP calls, manual auth headers, manual API key headers, or generated SDK clients for business flows. Runtime/bootstrap owns SDK construction, appbase IAM runtime, and the global TokenManager.

## Build, Test, And Verification

Run commands from this directory unless a command explicitly targets another root.

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm desktop:dev`
- `pnpm desktop:build:local`

From the repository root, `pnpm run check:drive-pc-standard` verifies this application root against the SDKWork PC standard.

## Agent Execution Rules

Use the convention dictionary before broad source loading. Do not hand-edit generated SDK output. Do not replace generated SDK integration with raw HTTP. Do not add app-local upload, presign, object-key, auth, or session APIs when Drive or appbase already owns the capability. Record exact verification commands and outputs before reporting completion.

## Human Review Rules

Request human review before changing public app identity, breaking package names, changing security/auth behavior, changing generated SDK ownership, altering database migrations, deleting data/files, or publishing release artifacts.
