# SDKWork Drive 核心功能开发计划

## 概述

基于已对齐的 sdkwork-specs 架构，完善 sdkwork-drive 的核心功能：
1. 完善文件上传/下载 API 实现
2. 完善 PC 管理后台
3. 填充 stub crates
4. 添加测试覆盖

## 当前状态

### 已实现
- ✅ 存储供应商管理 API（CRUD + 生命周期 + 凭证轮换）
- ✅ 三个存储后端（Local, S3, OpenDAL）
- ✅ PC 管理后台 UI（sdkwork-drive-pc-admin-storage-providers）
- ✅ 工作空间服务（六边形架构）
- ✅ 数据库基础设施（sqlx AnyPool）

### 待完善
- ⬜ sdkwork-drive-contract - 空的契约层
- ⬜ sdkwork-drive-http - 空的 HTTP 工具
- ⬜ sdkwork-drive-install-worker - 空的工作进程
- ⬜ sdkwork-drive-test-support - 空的测试支持
- ⬜ 上传/下载 API 完整实现
- ⬜ PC 管理后台功能增强
- ⬜ 测试覆盖

---

## Phase 1: 填充 Stub Crates

### 1.1 sdkwork-drive-contract
**目标**: 定义 Drive 领域的公共契约类型

**文件**: `crates/sdkwork-drive-contract/src/lib.rs`

**内容**:
```rust
// 重新导出存储契约
pub use sdkwork_drive_storage_contract as storage;

// Drive 领域公共类型
pub mod drive {
    pub mod space;
    pub mod node;
    pub mod upload;
    pub mod download;
    pub mod provider;
}

// API 契约类型
pub mod api {
    pub mod requests;
    pub mod responses;
    pub mod errors;
}
```

**关键类型**:
- `DriveSpaceId`, `DriveNodeId`, `DriveProviderId` - 强类型 ID
- `DriveUri` - `drive://spaces/{spaceId}/nodes/{nodeId}` 格式
- `MediaResource` - 跨域媒体资源表示
- `DriveApiError` - 统一错误类型

### 1.2 sdkwork-drive-http
**目标**: 提供 HTTP 工具和中间件

**文件**: `crates/sdkwork-drive-http/src/lib.rs`

**内容**:
```rust
// 请求上下文提取
pub mod context;

// 响应映射
pub mod response;

// 中间件
pub mod middleware {
    pub mod request_id;
    pub mod tenant_scope;
    pub mod operator_audit;
}

// 问题详情映射
pub mod problem_detail;
```

**关键功能**:
- `DriveRequestContext` - 从请求中提取 tenantId, operatorId, organizationId
- `DriveProblemDetail` - RFC 9457 问题详情响应
- 请求 ID 中间件
- 租户范围中间件

### 1.3 sdkwork-drive-install-worker
**目标**: 后台安装和维护任务

**文件**: `crates/sdkwork-drive-install-worker/src/lib.rs`

**内容**:
```rust
// 安装任务
pub mod install {
    pub mod schema_migration;
    pub mod default_space_setup;
    pub mod storage_provider_validation;
}

// 维护任务
pub mod maintenance {
    pub mod upload_session_cleanup;
    pub mod orphan_object_cleanup;
    pub mod quota_recalculation;
}

// 调度器
pub mod scheduler;
```

**关键功能**:
- 数据库 schema 迁移
- 默认空间初始化
- 过期上传会话清理
- 孤儿对象清理
- 配额重新计算

### 1.4 sdkwork-drive-test-support
**目标**: 测试工具和 fixtures

**文件**: `crates/sdkwork-drive-test-support/src/lib.rs`

**内容**:
```rust
// 测试 fixtures
pub mod fixtures {
    pub mod spaces;
    pub mod nodes;
    pub mod providers;
    pub mod upload_sessions;
}

// 内存存储实现
pub mod in_memory {
    pub mod space_store;
    pub mod node_store;
    pub mod provider_store;
    pub mod upload_store;
}

// 测试数据库
pub mod test_database;

// 断言工具
pub mod assertions;
```

---

## Phase 2: 完善上传/下载 API

### 2.1 上传 API 完善

**目标**: 实现完整的上传流程

**涉及文件**:
- `crates/sdkwork-router-drive-app-api/src/uploader.rs` - 上传处理器
- `crates/sdkwork-drive-workspace-service/src/application/upload_service.rs` - 上传服务

**API 操作**:
1. `uploadSessions.create` - 创建上传会话
2. `uploadSessions.get` - 获取上传会话状态
3. `uploadSessions.abort` - 中止上传
4. `uploadSessions.complete` - 完成上传
5. `uploadParts.presign` - 预签名上传分片
6. `uploadParts.markUploaded` - 标记分片已上传

**实现要点**:
- 幂等性：使用 `Idempotency-Key` 头
- 分片上传：支持 S3 multipart upload
- 进度跟踪：记录已上传分片
- 过期清理：自动清理过期会话

### 2.2 下载 API 完善

**目标**: 实现完整的下载流程

**涉及文件**:
- `crates/sdkwork-router-drive-app-api/src/download_packages.rs` - 下载处理器
- `crates/sdkwork-drive-workspace-service/src/application/download_service.rs` - 下载服务

**API 操作**:
1. `downloadUrls.create` - 创建下载 URL
2. `downloadPackages.create` - 创建下载包（多文件打包）
3. `downloadPackages.get` - 获取下载包状态

**实现要点**:
- 预签名 URL：短期有效的下载链接
- 范围读取：支持 HTTP Range 请求
- 打包下载：多文件打包为 ZIP
- CDN 集成：支持 CDN 回源

### 2.3 上传统计

**目标**: 实现上传统计和配额管理

**涉及文件**:
- `crates/sdkwork-drive-workspace-service/src/application/quota_service.rs` - 配额服务
- `crates/sdkwork-router-drive-backend-api/src/` - 后端统计 API

**API 操作**:
1. `quotas.list` - 列出配额使用情况
2. `quotas.get` - 获取特定配额
3. `auditEvents.list` - 列出审计事件

---

## Phase 3: 完善 PC 管理后台

### 3.1 存储供应商管理增强

**目标**: 增强现有管理功能

**涉及文件**:
- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-storage-providers/`

**增强功能**:
1. **批量操作** - 批量启用/禁用供应商
2. **导入/导出** - 供应商配置导入导出
3. **监控面板** - 存储使用统计图表
4. **告警配置** - 配额告警、连接异常告警

### 3.2 存储空间管理

**目标**: 添加存储空间管理页面

**新包**: `sdkwork-drive-pc-admin-spaces`

**功能**:
1. 空间列表 - 显示所有存储空间
2. 空间详情 - 查看空间信息和使用情况
3. 空间配额 - 设置和调整配额
4. 空间迁移 - 迁移空间到不同供应商

### 3.3 上传任务管理

**目标**: 添加上传任务监控页面

**新包**: `sdkwork-drive-pc-admin-uploads`

**功能**:
1. 任务列表 - 显示所有上传任务
2. 任务详情 - 查看任务状态和进度
3. 失败重试 - 重试失败的上传
4. 清理工具 - 清理过期任务

### 3.4 审计日志

**目标**: 添加审计日志查看页面

**新包**: `sdkwork-drive-pc-admin-audit`

**功能**:
1. 日志列表 - 显示所有审计事件
2. 日志筛选 - 按时间、操作类型、用户筛选
3. 日志导出 - 导出审计日志
4. 合规报告 - 生成合规报告

---

## Phase 4: 添加测试覆盖

### 4.1 单元测试

**目标**: 为每个 crate 添加单元测试

**测试文件**:
- `crates/sdkwork-drive-contract/tests/`
- `crates/sdkwork-drive-http/tests/`
- `crates/sdkwork-drive-storage-contract/tests/`
- `crates/sdkwork-drive-workspace-service/tests/`

**测试覆盖**:
- 类型验证测试
- 业务规则测试
- 错误处理测试
- 边界条件测试

### 4.2 集成测试

**目标**: 添加端到端集成测试

**测试文件**:
- `tests/integration/`
- `crates/sdkwork-router-*/tests/`

**测试场景**:
- 完整上传流程
- 完整下载流程
- 存储供应商生命周期
- 多租户隔离

### 4.3 契约测试

**目标**: 验证 API 契约一致性

**测试文件**:
- `sdks/test/`
- `crates/sdkwork-drive-contract/tests/`

**测试内容**:
- OpenAPI schema 验证
- SDK 生成验证
- 请求/响应类型验证

---

## 执行顺序

### Week 1: Stub Crates 填充
1. Day 1-2: sdkwork-drive-contract
2. Day 3: sdkwork-drive-http
3. Day 4: sdkwork-drive-install-worker
4. Day 5: sdkwork-drive-test-support

### Week 2: 上传/下载 API
1. Day 1-2: 上传 API 完善
2. Day 3-4: 下载 API 完善
3. Day 5: 上传统计

### Week 3: PC 管理后台
1. Day 1-2: 存储供应商管理增强
2. Day 3: 存储空间管理
3. Day 4: 上传任务管理
4. Day 5: 审计日志

### Week 4: 测试覆盖
1. Day 1-2: 单元测试
2. Day 3-4: 集成测试
3. Day 5: 契约测试

---

## 验证标准

### 功能验证
- [ ] 上传 100MB 文件成功
- [ ] 下载文件成功
- [ ] 创建/更新/删除存储供应商成功
- [ ] Bucket 管理操作成功
- [ ] 多租户隔离正确

### 性能验证
- [ ] 上传速度 > 10MB/s
- [ ] 下载速度 > 50MB/s
- [ ] API 响应时间 < 100ms (P95)
- [ ] 并发上传支持 > 100

### 安全验证
- [ ] 凭证不泄露到日志
- [ ] 租户数据隔离
- [ ] 操作审计完整
- [ ] 权限控制正确

---

## 关键文件清单

### Rust Crates
- `crates/sdkwork-drive-contract/src/lib.rs`
- `crates/sdkwork-drive-http/src/lib.rs`
- `crates/sdkwork-drive-install-worker/src/lib.rs`
- `crates/sdkwork-drive-test-support/src/lib.rs`
- `crates/sdkwork-drive-workspace-service/src/application/upload_service.rs`
- `crates/sdkwork-drive-workspace-service/src/application/download_service.rs`
- `crates/sdkwork-router-drive-app-api/src/uploader.rs`
- `crates/sdkwork-router-drive-app-api/src/download_packages.rs`

### PC 应用
- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-storage-providers/`
- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-spaces/` (新建)
- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-uploads/` (新建)
- `apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-admin-audit/` (新建)

### 测试
- `tests/integration/`
- `sdks/test/`
- `crates/*/tests/`
