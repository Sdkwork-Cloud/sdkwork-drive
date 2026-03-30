# sdkwork-drive-pc-react

English is the default language for this README. A Chinese version is provided below.

## Overview

`sdkwork-drive-pc-react` is the main workspace for the SDKWork Drive desktop and web experience.

It is built as a `pnpm` workspace with split packages and a Tauri desktop host. The workspace contains the current production-facing architecture for:

- Desktop app runtime
- Web shell
- Auth and user flows
- Drive domain logic
- Shared UI, i18n, and core SDK integration

## Workspace Structure

```text
sdkwork-drive-pc-react/
|- packages/
|  |- sdkwork-drive-auth
|  |- sdkwork-drive-commons
|  |- sdkwork-drive-core
|  |- sdkwork-drive-desktop
|  |- sdkwork-drive-drive
|  |- sdkwork-drive-i18n
|  |- sdkwork-drive-shell
|  |- sdkwork-drive-types
|  |- sdkwork-drive-ui
|  |- sdkwork-drive-user
|  |- sdkwork-drive-web
|- scripts/
|- docs/
```

## Development

### Install

```bash
pnpm install
```

### Run web

```bash
pnpm dev
```

### Run desktop

```bash
pnpm tauri:dev
```

### Validate

```bash
pnpm test
pnpm build
pnpm tauri:info
```

## SDK Strategy

### Local development

Local `tauri:dev` and standard development commands use relative workspace SDK paths from the surrounding Spring AI Plus source tree.

This keeps local backend, generated SDK, and desktop/web integration aligned during daily development.

### Release

Release builds do not use the local relative SDK sources directly.

Instead, release packaging works through an isolated release workspace:

1. Prepare a clean release workspace.
2. Rewrite SDK workspace entries to vendored Git SDK paths.
3. Clone the release SDK repositories.
4. Build the vendored SDK packages.
5. Run typecheck, tests, web/desktop builds, and Tauri packaging.

## Important Scripts

```bash
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
pnpm prepare:release-workspace
pnpm prepare:release-sdk-sources
pnpm prepare:release-sdk-builds
pnpm release:desktop:list-targets
pnpm release:desktop --platform windows --arch x64
```

## Release Workflow

The repository release workflow lives in [`../.github/workflows/sdkwork-drive-desktop-release.yml`](../.github/workflows/sdkwork-drive-desktop-release.yml).

It verifies the release workspace and publishes desktop bundles for:

- Windows `x64` and `arm64`
- Linux `x64` and `arm64`
- macOS `x64` and `arm64`

## Desktop Notes

- Closing the main window keeps the app alive in the tray.
- Tauri is used as the native desktop host.
- The desktop package is designed for multi-platform release packaging.

---

## 中文说明

本 README 默认使用英文，以下为中文版本。

### 项目概述

`sdkwork-drive-pc-react` 是 SDKWork Drive 当前桌面端与 Web 端的主工作区。

它基于 `pnpm workspace` 与分包架构，包含 Tauri 桌面宿主和 React Web 层，是当前主要实现目录。

覆盖内容包括：

- 桌面端运行时
- Web 壳层
- 登录认证与用户能力
- 网盘领域逻辑
- 共享 UI、国际化与核心 SDK 集成

### 工作区结构

```text
sdkwork-drive-pc-react/
|- packages/
|  |- sdkwork-drive-auth
|  |- sdkwork-drive-commons
|  |- sdkwork-drive-core
|  |- sdkwork-drive-desktop
|  |- sdkwork-drive-drive
|  |- sdkwork-drive-i18n
|  |- sdkwork-drive-shell
|  |- sdkwork-drive-types
|  |- sdkwork-drive-ui
|  |- sdkwork-drive-user
|  |- sdkwork-drive-web
|- scripts/
|- docs/
```

### 开发命令

安装依赖：

```bash
pnpm install
```

启动 Web：

```bash
pnpm dev
```

启动桌面端：

```bash
pnpm tauri:dev
```

校验：

```bash
pnpm test
pnpm build
pnpm tauri:info
```

### SDK 策略

本地开发时，`tauri:dev` 和常规开发命令继续使用外部 Spring AI Plus 源码树中的相对路径 SDK。

Release 构建时，不直接依赖本地相对路径 SDK，而是通过独立 release workspace：

1. 生成干净的 release workspace
2. 将 workspace 中的 SDK 入口改写为 vendored Git SDK 路径
3. 拉取 Git 仓库中的 SDK 源码
4. 预构建 vendored SDK
5. 在该独立 workspace 中完成类型检查、测试、前端构建与 Tauri 打包

### 关键命令

```bash
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
pnpm prepare:release-workspace
pnpm prepare:release-sdk-sources
pnpm prepare:release-sdk-builds
pnpm release:desktop:list-targets
pnpm release:desktop --platform windows --arch x64
```

### 发布说明

仓库级发布工作流位于 [`../.github/workflows/sdkwork-drive-desktop-release.yml`](../.github/workflows/sdkwork-drive-desktop-release.yml)。

该工作流会校验 release workspace，并发布以下桌面端制品：

- Windows `x64` / `arm64`
- Linux `x64` / `arm64`
- macOS `x64` / `arm64`
