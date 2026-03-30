# sdkwork-drive

English is the default language for this README. A Chinese version is provided below.

## Overview

`sdkwork-drive` is the standalone repository for the SDKWork Drive product family.

The current implementation focus is the desktop and web workspace under [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react), built as a `pnpm` workspace with split packages and a Tauri desktop host. The product direction follows a modern cloud-drive experience with polished desktop behavior, tray persistence, cross-platform packaging, and a release pipeline that separates local development SDKs from release SDK sources.

## Repository Structure

```text
sdkwork-drive/
|- sdkwork-drive-pc-react/        # Main desktop/web workspace
|- sdkwork-drive-mobile-react/    # Reserved for future mobile React client
|- sdkwork-drive-mobile-flutter/  # Reserved for future Flutter client
|- .github/workflows/             # GitHub Actions release workflow
```

## Current Scope

- Desktop app built with Tauri and React.
- Web shell built from the same workspace packages.
- Split-package architecture for auth, core, drive, shell, user, UI, i18n, and desktop host layers.
- Cross-platform release matrix for Windows, Linux, and macOS on `x64` and `arm64`.
- Release workspace generation that uses Git-backed SDK sources instead of local relative SDK paths.

## Local Development

The main workspace lives in [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react).

### Install

```bash
cd sdkwork-drive-pc-react
pnpm install
```

### Run Web

```bash
pnpm dev
```

### Run Desktop

```bash
pnpm tauri:dev
```

### Validate

```bash
pnpm test
pnpm build
pnpm tauri:info
```

## SDK Modes

### Local development mode

Local development uses relative workspace SDK sources from the surrounding Spring AI Plus source tree. This keeps `tauri:dev`, `dev:web`, and normal development flows aligned with local backend and SDK iteration.

### Release mode

Release builds do not use the local relative SDK paths. Instead, the release workflow:

1. Creates an isolated release workspace.
2. Rewrites SDK workspace entries to vendored Git SDK locations.
3. Clones the release SDK repositories.
4. Builds the vendored SDK packages.
5. Runs verification and desktop packaging from the isolated workspace.

This ensures release artifacts are built from explicit Git SDK sources rather than untracked local filesystem state.

## Release Workflow

The standalone repository workflow is located at [`.github/workflows/sdkwork-drive-desktop-release.yml`](./.github/workflows/sdkwork-drive-desktop-release.yml).

It supports:

- Tag-triggered releases with tags matching `sdkwork-drive-release-*`
- Manual `workflow_dispatch` releases
- Per-release SDK refs for `@sdkwork/app-sdk` and `@sdkwork/sdk-common`
- Verification before packaging
- Cross-platform desktop artifact publishing to GitHub Releases

## Key Commands

Run these from [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react):

```bash
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
pnpm release:desktop:list-targets
pnpm prepare:release-workspace
pnpm prepare:release-sdk-sources
pnpm prepare:release-sdk-builds
```

## Product Notes

- The desktop app keeps running in the tray when the main window is closed.
- The desktop host is designed for multi-platform packaging with a Tauri-native shell.
- The visual system, theme direction, and desktop interaction model are aligned with the broader SDKWork desktop product architecture.

---

## 中文说明

本 README 默认使用英文，以下为中文版本。

### 项目概述

`sdkwork-drive` 是 SDKWork Drive 产品族的独立仓库。

当前主要实现位于 [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react)，它采用 `pnpm workspace` 和分包架构，包含 React Web 层与 Tauri 桌面宿主。整体目标是打造高完成度的桌面网盘体验，包括托盘常驻、跨平台打包、以及区分本地开发 SDK 与 release SDK 来源的发布链路。

### 仓库结构

```text
sdkwork-drive/
|- sdkwork-drive-pc-react/        # 当前主应用工作区
|- sdkwork-drive-mobile-react/    # 预留的 React 移动端目录
|- sdkwork-drive-mobile-flutter/  # 预留的 Flutter 移动端目录
|- .github/workflows/             # GitHub Actions 发布工作流
```

### 当前能力

- 基于 Tauri + React 的桌面端应用
- 与桌面端共享能力层的 Web 工作区
- `auth`、`core`、`drive`、`shell`、`user`、`ui`、`i18n`、`desktop` 等分层分包结构
- 支持 Windows、Linux、macOS 的 `x64` / `arm64` 发布矩阵
- release 构建时使用 Git 仓库中的 SDK，而不是本地相对路径 SDK

### 本地开发

主工作区位于 [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react)。

安装依赖：

```bash
cd sdkwork-drive-pc-react
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

### SDK 使用策略

本地开发模式下，`tauri:dev` 和常规开发流程继续使用相对路径的本地 SDK，便于和当前源码树中的后端与 SDK 一起迭代。

release 模式下，不再直接依赖本地相对路径 SDK，而是：

1. 生成独立的 release workspace
2. 将 workspace 中的 SDK 入口改写为 vendored Git SDK 路径
3. 拉取 Git 仓库中的 SDK 源码
4. 预构建 vendored SDK
5. 在独立 workspace 中完成校验与打包

这样可以确保 release 构建基于明确的 Git SDK 源，而不是本地未提交状态。

### 发布工作流

独立仓库的发布工作流位于 [`.github/workflows/sdkwork-drive-desktop-release.yml`](./.github/workflows/sdkwork-drive-desktop-release.yml)。

支持：

- `sdkwork-drive-release-*` 标签触发发布
- 手动 `workflow_dispatch`
- 为 `@sdkwork/app-sdk` 和 `@sdkwork/sdk-common` 指定 release 使用的 Git ref
- 发布前校验
- 跨平台桌面端制品打包并上传到 GitHub Releases

### 常用命令

以下命令在 [`sdkwork-drive-pc-react`](./sdkwork-drive-pc-react) 下执行：

```bash
pnpm dev
pnpm tauri:dev
pnpm test
pnpm build
pnpm release:desktop:list-targets
pnpm prepare:release-workspace
pnpm prepare:release-sdk-sources
pnpm prepare:release-sdk-builds
```
