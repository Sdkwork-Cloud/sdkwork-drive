# 存储供应商管理后台改进计划

## 概述

完善存储供应商管理后台，支持多供应商配置，并添加 Bucket 和文件管理功能。

## Phase 1: 增强存储供应商编辑器

### 1.1 供应商特定配置适配
- 根据 `providerKind` 动态显示/隐藏字段
- 添加供应商特定的默认端点提示
- 添加供应商特定的区域选项
- 添加 SSE 模式选择器
- 添加存储类选择器

### 1.2 改进 UX
- 添加自定义供应商支持 (`custom:<name>`)
- 添加确认对话框（删除、停用、凭证轮换）
- 改进空状态和加载状态
- 添加分页和过滤功能

## Phase 2: 添加 Bucket 管理 UI

### 2.1 Bucket 列表面板
- 显示当前配置的 bucket
- 列出供应商可见的所有 buckets
- 显示 bucket 状态（存在/不存在）

### 2.2 Bucket 操作
- 创建 bucket
- 删除 bucket（带确认）
- 检查 bucket 存在性

## Phase 3: 添加文件/对象管理 UI

### 3.1 对象浏览器
- 显示对象列表（支持前缀过滤和分页）
- 显示对象元数据（大小、类型、修改时间等）
- 支持目录导航（使用分隔符）

### 3.2 对象操作
- 下载对象
- 删除对象（带确认）
- 复制对象
- 查看对象元数据

## Phase 4: API 增强

### 4.1 Backend API 补充
- 添加 `buckets.list` 端点
- 添加 `bindings.list` 端点
- 添加 `bindings.default.delete` 端点

## 执行顺序

1. Phase 1: 增强存储供应商编辑器（优先级最高）
2. Phase 2: 添加 Bucket 管理 UI
3. Phase 3: 添加文件/对象管理 UI
4. Phase 4: API 增强（如需要）

## 关键文件

- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-storage-providers/src/`
- `apis/backend-api/drive/drive-admin-storage-api.openapi.json`
- `apis/backend-api/drive/drive-backend-api.openapi.json`
