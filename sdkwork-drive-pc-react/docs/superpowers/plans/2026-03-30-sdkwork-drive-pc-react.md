# SDKWork Drive PC React Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone drive-focused PC React workspace using `claw-studio` shell/auth patterns and the generated SDK-backed `magic-studio-v2` drive business logic.

**Architecture:** The workspace keeps a clean `drive-*` package split. `drive-core` owns SDK/bootstrap/auth/profile/runtime concerns, `drive-drive` owns drive business logic and UI, `drive-shell` composes protected navigation and theme, and `drive-web` bootstraps the Vite app.

**Tech Stack:** pnpm workspace, React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, React Query, i18next, Vitest, generated `@sdkwork/app-sdk`.

---

### Task 1: Scaffold Workspace Root

**Files:**
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/package.json`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/pnpm-workspace.yaml`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/tsconfig.base.json`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/turbo.json`

- [ ] **Step 1: Create root workspace config**
- [ ] **Step 2: Verify external workspace dependencies are declared**
- [ ] **Step 3: Add docs/spec and plan files**

### Task 2: Establish Test Surface First

**Files:**
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/packages/sdkwork-drive-core/src/services/appAuthService.test.ts`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/packages/sdkwork-drive-core/src/stores/useAuthStore.test.ts`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/packages/sdkwork-drive-core/src/services/settingsService.test.ts`
- Create: `D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-drive/sdkwork-drive-pc-react/packages/sdkwork-drive-drive/tests/driveBusinessService.download.test.ts`

- [ ] **Step 1: Add failing auth service tests adapted from `claw-studio`**
- [ ] **Step 2: Add failing auth store tests adapted from `claw-studio`**
- [ ] **Step 3: Add failing settings service tests for profile and preferences**
- [ ] **Step 4: Add failing drive download tests adapted from `magic-studio-v2`**
- [ ] **Step 5: Run targeted tests to confirm red state**

### Task 3: Build Foundation Packages

**Files:**
- Create: `packages/sdkwork-drive-types/**`
- Create: `packages/sdkwork-drive-i18n/**`
- Create: `packages/sdkwork-drive-commons/**`
- Create: `packages/sdkwork-drive-ui/**`
- Create: `packages/sdkwork-drive-core/**`

- [ ] **Step 1: Copy and rename `claw-ui` into `drive-ui`**
- [ ] **Step 2: Copy and rename `claw-i18n` into `drive-i18n` and extend locale resources**
- [ ] **Step 3: Implement `drive-commons` result helpers, path utils, formatters, and class helpers**
- [ ] **Step 4: Implement `drive-core` app SDK bootstrap, env/session helpers, auth service, settings service, app/auth stores, and browser runtime helpers**
- [ ] **Step 5: Run core tests and keep them green**

### Task 4: Migrate Auth and User Modules

**Files:**
- Create: `packages/sdkwork-drive-auth/**`
- Create: `packages/sdkwork-drive-user/**`

- [ ] **Step 1: Copy and rename `claw-auth` into `drive-auth`**
- [ ] **Step 2: Patch imports to local `@sdkwork/drive-*` packages**
- [ ] **Step 3: Implement `drive-user` profile/settings surfaces using `drive-core/settingsService`**
- [ ] **Step 4: Add any missing route utility and user-facing locale strings**

### Task 5: Migrate and Upgrade Drive Module

**Files:**
- Create: `packages/sdkwork-drive-drive/**`

- [ ] **Step 1: Port drive entities and store contracts**
- [ ] **Step 2: Rebuild `driveBusinessService` around the generated SDK adapter and local helpers**
- [ ] **Step 3: Replace `magic` shared package imports with local `drive-*` foundation imports**
- [ ] **Step 4: Rebuild drive page, sidebar, toolbar, grid/list views, breadcrumbs, context menu, and preview modal with `claw` theme direction**
- [ ] **Step 5: Keep drive download tests green**

### Task 6: Compose the Shell and Web App

**Files:**
- Create: `packages/sdkwork-drive-shell/**`
- Create: `packages/sdkwork-drive-web/**`

- [ ] **Step 1: Implement providers, theme manager, route guards, and shell bootstrap**
- [ ] **Step 2: Build drive-specific header, sidebar navigation, and main layout**
- [ ] **Step 3: Wire routes for login/register/forgot-password/oauth callback, drive destinations, and profile/settings**
- [ ] **Step 4: Copy/adapt `claw` global style tokens and theme color handling**
- [ ] **Step 5: Ensure the web package boots cleanly through Vite**

### Task 7: Verification and Final Polish

**Files:**
- Modify: all created workspace files as needed

- [ ] **Step 1: Run `pnpm install`**
- [ ] **Step 2: Run `pnpm test`**
- [ ] **Step 3: Run `pnpm typecheck`**
- [ ] **Step 4: Run `pnpm build`**
- [ ] **Step 5: Fix remaining issues until all commands are green**
