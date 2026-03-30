# SDKWork Drive PC React Architecture Design

## Goal

Build a standalone `pnpm workspace` drive application under `apps/sdkwork-drive/sdkwork-drive-pc-react` that:

- uses `claw-studio` as the shell, auth, theme, and UX reference
- migrates the `drive` module from `magic-studio-v2`
- keeps generated `@sdkwork/app-sdk` integration as the only remote business boundary
- follows the package decomposition standard from `magic-studio-v2/ARCHITECT.md`

## Architecture

The app will be organized as a focused drive workspace with one bounded package per concern:

- `sdkwork-drive-types`: route ids, navigation ids, and shared drive-facing contracts
- `sdkwork-drive-i18n`: localized resources and i18n bootstrap
- `sdkwork-drive-commons`: cross-cutting UI helpers, path utils, result types, formatters
- `sdkwork-drive-ui`: copied and renamed `claw-ui` primitives
- `sdkwork-drive-core`: app SDK bootstrap, auth/session services, settings/profile services, app and auth stores, web runtime helpers, upload via presigned URL helper
- `sdkwork-drive-auth`: copied and renamed `claw-auth` login/register/forgot-password/oauth flows
- `sdkwork-drive-user`: profile and preference experience built on `claw` settings/user patterns
- `sdkwork-drive-drive`: migrated drive business service and new polished drive pages/components
- `sdkwork-drive-shell`: providers, protected routing, header, sidebar, layout, and theme system
- `sdkwork-drive-web`: Vite bootstrap application

## Key Decisions

### 1. Reuse `claw` patterns, not the whole `claw` app

`claw-studio` contains a mature auth/session/theme shell, but its shell package is coupled to many unrelated business modules. The new drive app will copy only the proven foundation pieces and rebuild the route surface specifically for drive.

### 2. Preserve generated SDK usage from `magic` drive

The migrated drive module will keep `SdkDriveBusinessAdapter` semantics and continue using `@sdkwork/app-sdk` for:

- listing drive items
- create folder
- upload through presigned URL
- rename, move, delete, restore, favorite
- content preview and text editing
- storage usage

No handwritten HTTP wrappers will be introduced.

### 3. Localize only the minimum runtime foundation

Instead of depending on `magic-studio-v2` shared runtime packages, the new workspace will own the small subset it actually needs:

- result envelope helpers
- path utilities
- browser file picking/download helpers
- app SDK session bootstrap
- presigned upload helper

This removes cross-app coupling and makes `sdkwork-drive` independently evolvable.

### 4. Upgrade drive UX while staying within current backend capability

The drive experience will be closer to Google Drive and Microsoft OneDrive in interaction quality:

- persistent left navigation for core destinations
- rich top toolbar with search, sort, filters, upload, and creation actions
- clean list/grid switching
- contextual multi-select action bar
- preview modal for common file types
- prominent storage status and recent/starred/trash entry points

Unsupported backend features like full collaborative sharing will not be faked as real business flows.

## Data Flow

1. `sdkwork-drive-web` bootstraps the shell.
2. `sdkwork-drive-shell` initializes i18n, theme, router, and auth-aware layout.
3. `sdkwork-drive-auth` signs users in via `sdkwork-drive-core/appAuthService`.
4. `sdkwork-drive-core/useAuthStore` persists session state and exposes the authenticated identity.
5. `sdkwork-drive-drive` calls `driveBusinessService`, which maps app SDK results into drive-friendly entities.
6. `sdkwork-drive-user` loads and updates profile/preferences through the generated user and notification SDK APIs.

## Testing

Critical behavior will be covered with migrated or adapted tests:

- auth service OAuth and QR login session handling
- auth store session and reset flows
- settings/profile service mapping and preference persistence
- drive download behavior, including direct resource download and text fallback

## Verification

The workspace must verify successfully with:

- `pnpm install`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
