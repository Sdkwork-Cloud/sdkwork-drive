# SDKWork Drive 标准对齐审查报告

> 更新日期: 2026-07-08
> 审查标准: sdkwork-specs 全栈规范  
> 状态: **P0/P1 代码债务已修复 — 可进入受控试点；商业化 GA 依赖运营证据链**

---

## 一、对齐结论

| 维度 | 状态 | 验证命令 |
|------|:----:|----------|
| sdkwork-specs 仓库字典 | ✅ | `pnpm check:architecture-alignment` |
| sdkwork-web-framework | ✅ | 四个 `*-api` route crate + IAM resolver |
| sdkwork-database | ✅ | 双引擎 baseline + migrations（0002–0006）+ `pnpm db:validate` |
| API 输入/输出契约 | ✅ | `pnpm api:envelope:check` + `pnpm api:schema:check` |
| 分页（PAGINATION_SPEC） | ✅ | `check-pagination.mjs`；SQL 层分页 + Admin/客户端单页加载 |
| 部署契约 | ✅ | `pnpm deploy:validate`；严格发布门禁使用 `SDKWORK_DEPLOY_VALIDATION=strict pnpm deploy:validate` |
| Drive SDK 消费 | ✅ | `check-app-sdk-consumer-imports.mjs` |
| 上传完成 saga | ✅ | DB 失败补偿：session 重置 + 孤儿对象 best-effort 删除 |
| SQLite 写事务 | ✅ | `begin_transaction_sql()` + `install_any_schema` 注册 engine |
| 下载包 / 本地存储 OOM | ✅ | 文件夹 BFS 分批 LIMIT；local range seek 读取 |
| 归档同步解压 OOM | ✅ | ZIP 打开不再复制压缩包字节；同步提取先做条目计划校验，压缩包 64MiB、单条目 16MiB、选中总解压 64MiB 上限；写入前再用流式读取到 `std::io::sink()` 校验实际解压总量，逐文件读取写入 |
| 移动目标 / Admin 分页 | ✅ | move destinations 使用 `page_size`/`cursor` + 窗口化 BFS；Storage Providers Admin 使用 `data.items` + `pageInfo.nextCursor` 翻页 |
| 资产 API 退役路由 | ✅ | legacy upload 返回 `410 Gone`；错误方法返回 `405 Method Not Allowed` |
| 409 冲突检测 | ✅ | 数值 platform code + MoveCopy 全量 sibling 扫描 |

---

## 二、2026-07-07 修复项（本轮）

| 项 | 处理 |
|----|------|
| 上传完成 saga | `recover_upload_completion_after_db_failure`：session→uploading + 存储对象 delete |
| upload_handlers 硬编码 `BEGIN` | 改用 `begin_transaction_sql()` |
| transaction engine 注册 | `register_installed_database_engine` 在 `install_any_schema` 结束时调用 |
| transaction 单元测试 | 修正为 `begin_transaction_sql_for_engine` 引擎语义测试 |
| download_packages 宽目录 OOM | 每父目录 LIMIT/OFFSET 分批拉取 |
| archive_entries 同步提取内存 | ZIP inspection 使用 `Cursor<&[u8]>` 避免压缩包复制；extract 先生成计划，再在任何 DB/对象存储写入前流式预检实际解压总量，拒绝超出同步预算的 ZIP bomb / 大文件条目；正式写入时仍逐个条目读取 |
| local_store range read | `File::seek` + bounded read，不再 `fs::read` 全文件 |
| move destination 假分页 / OOM 风险 | 使用 `page_size`/`cursor`，BFS 只保留当前页窗口；每个父目录按 SQL `LIMIT/OFFSET` 小批量读取，并拒绝 legacy query alias |
| Staging admin smoke 分页参数 | GET list/search smoke 请求统一使用 `page_size=20`，契约测试禁止 `pageSize=` |
| SDK generator stub 假生成器 | `tools/sdkwork_sdk_generator_stub.mjs` 改为 fail-closed tombstone，dependency-management 与契约测试禁止本地 stub 产出 SDK |
| maintenance upload cleanup | 每项包裹 `BEGIN IMMEDIATE`/`BEGIN` 事务 |
| auth policy startup panic | 改为 error log，不 panic |
| MoveCopyModal sibling 检测 | `listSiblingFileNames` 分页聚合 |
| Storage Providers Admin | `listProvidersPage` + 翻页 UI |
| Storage Providers 对象列表 | `data.items` + `pageInfo.nextCursor`；公共前缀以 `objectKind=prefix` 表达 |
| 删除类 HTTP 语义 | SDKWork-owned delete 操作返回 `204 No Content`，不再返回 JSON 成功体 |
| 资产 legacy upload / 错误方法 | `/app/v3/api/assets/{upload,presign,upload_sessions}` fail-closed 为 `410 Gone` + `Gone`；资产删除型子资源错误 `POST` 返回 `405 MethodNotAllowed`，不再保留生产 `501/not implemented` |
| 延期发布包 checksum 证据 | macOS DMG / Linux AppImage 延期包移除占位 checksum；`releaseBuildDeferred=true` 时 materialize / readiness / verify 均禁止保留伪造 checksum 字段，等待目标 runner 物化真实 SHA-256 |
| K8s digest 严格部署门禁 | `check_drive_deployments.mjs` 支持 `--root` 与 `SDKWORK_DEPLOY_VALIDATION=strict` / `SDKWORK_RELEASE_VALIDATION=strict`；默认模式仅告警占位符，严格模式拒绝 `REPLACE_WITH_RELEASE_DIGEST` 和非 `@sha256:<64 hex>` 镜像引用 |
| 数据库 seed i18n 契约 | `database/seeds/seed.manifest.json` 补齐 `i18nVersion`、`fallbackLocale`、`localeSets`；当前无必需参考数据，common bootstrap seed 明确为 no-op 生命周期脚本 |
| 409 冲突 | `isDriveConflictError` 识别 40901；上传队列专用 toast |

---

## 三、架构快照

```
apps/sdkwork-drive-pc          → composition 注册 + Drive App SDK 消费
crates/sdkwork-routes-*-api    → sdkwork-web-framework + IAM + 独立限流
crates/sdkwork-drive-workspace-service → store ports + begin_transaction_sql + outbox
crates/sdkwork-drive-install-worker    → leader 心跳 + 配额对账维护
database/                      → baseline + 0002–0006 migrations（双引擎）
sdks/                          → OpenAPI 权威 → composed SDK facade
```

---

## 四、生产上线门禁

| 条件 | 状态 |
|------|:----:|
| `pnpm check` | ✅ 本地通过（2026-07-08） |
| API envelope + schema | ✅ |
| PostgreSQL/SQLite lifecycle | ✅ baseline + 0002–0006 |
| 多实例 Redis 限流（可选） | ✅ `redis-rate-limit` + `SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis` |
| Outbox 双引擎 claim + 幂等 fan-out | ✅ |
| Cloud 分服务 outbox | ✅ K8s `SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false` |
| PostgreSQL 集成测试（CI） | ✅ |
| Staging admin smoke / e2e | ⏳ `pnpm smoke:staging-admin`（需 staging 密钥） |

### 部署要点

1. 多实例限流：`SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis`；生产建议 `SDKWORK_DRIVE_RATE_LIMIT_FAIL_CLOSED=true`
2. 可信代理后：`SDKWORK_DRIVE_RATE_LIMIT_TRUST_PROXY=true`
3. 生产下载令牌：`SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET`
4. Cloud 分服务：`SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false`
5. 上传内容策略：`SDKWORK_DRIVE_UPLOAD_CONTENT_POLICY_MODE=enforce`
6. SQLite 仅单实例/单写者；生产使用 PostgreSQL

### 验证命令

```bash
pnpm check
pnpm api:envelope:check
pnpm api:schema:check
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
node tools/check_sdkwork_drive_architecture_alignment.mjs
cargo test -p sdkwork-routes-drive-app-api --test drive_routes asset -- --nocapture
pnpm deploy:validate
SDKWORK_DEPLOY_VALIDATION=strict pnpm deploy:validate
cargo test -p sdkwork-drive-contract --test database_schema_parity
cargo check -p sdkwork-routes-drive-app-api
cargo check -p sdkwork-drive-workspace-service
```

---

## 五、商业化 GA 前运营项（代码外）

应用尚未上线。P0/P1 代码债务已在本轮修复；以下仍阻塞 `publish.status=ACTIVE`：

| 项 | 说明 |
|----|------|
| 制品签名 | CI `security.signatureRequired` |
| macOS / Linux checksum | 目标 runner 产出真实 DMG / AppImage 后写入 SHA-256 |
| Catalog 媒体 CDN | 清除 `catalogMediaDeferred` |
| K8s 生产 digest | 替换 `REPLACE_WITH_RELEASE_DIGEST`，并通过 `SDKWORK_DEPLOY_VALIDATION=strict pnpm deploy:validate` |
| Admin smoke / staging e2e | [pre-launch-checklist.md](../guides/operator/pre-launch-checklist.md) |

---

## 六、后续能力演进（产品 Non-Goal / P4）

| 项 | 触发条件 |
|----|----------|
| 高流量列表 opaque cursor 全面迁移 | 租户规模 / 深 offset 性能证据 |
| 内嵌 Office 预览 | 产品决策引入 OnlyOffice/Collabora 或 SaaS 预览服务 |
| 上传 AV 扫描 | 生产内容安全需求 |
| 桌面 delta sync | PRD P4 |
| Azure Blob 适配器 | 具体客户需求 |
| 内存限流改 sharded / Redis 默认 | 多实例高并发压测证据 |

---

*本报告反映 2026-07-08 P0/P1 修复后的对齐状态。GA 运营项仍待执行。*
