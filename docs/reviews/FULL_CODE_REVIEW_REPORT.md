# SDKWork Drive 标准对齐审查报告

> 更新日期: 2026-07-06  
> 审查标准: sdkwork-specs 全栈规范  
> 状态: **代码与门禁对齐完成 — 可进入受控试点；商业化 GA 依赖运营证据链（签名 / Catalog / ACTIVE）**

---

## 一、对齐结论

| 维度 | 状态 | 验证命令 |
|------|:----:|----------|
| sdkwork-specs 仓库字典 | ✅ | `pnpm check:architecture-alignment` |
| sdkwork-web-framework | ✅ | 四个 `*-api` route crate + IAM resolver |
| sdkwork-database | ✅ | `database/` 双引擎 manifest + `pnpm db:validate` |
| sdkwork-utils | ✅ | Rust `sdkwork-utils-rust`；TS `@sdkwork/utils`（含 `Sha256Hasher`） |
| API 输入/输出契约 | ✅ | `pnpm api:envelope:check` + `pnpm api:schema:check` |
| 分页（PAGINATION_SPEC） | ✅ | `check-pagination.mjs`（SQL 层分页；offset pageToken 为 legacy wire） |
| 部署契约 | ✅ | `pnpm deploy:validate` |
| Drive SDK 消费 | ✅ | `check-app-sdk-consumer-imports.mjs` |
| Native composition | ✅ | `pnpm check:app-composition` |
| 打包 / 拓扑 / 发布 | ✅ | `topology:validate` + `gateway:assembly:validate` |
| Backend admin 列表 envelope | ✅ | `success_offset_list_page` + PC `normalizeBackendOffsetListPage` |

---

## 二、2026-07-06 技术债务清理

| 项 | 处理 |
|----|------|
| 浏览器下载 ReadableStream 路径无内存上限 | `downloadTransfer.ts` 在 chunk 累积与 blob 回退路径均强制 64MB 上限；优先 File System Access / native stream |
| Outbox claim 在 SQLite 使用 PostgreSQL-only `SKIP LOCKED` | 按引擎分支：PostgreSQL `FOR UPDATE SKIP LOCKED`；SQLite 单写者 claim；新增 `outbox_dispatch` 集成测试 |
| `database/migrations` 空目录 vs REQ-0001 | 物化 `0002` outbox 索引与 `0003` tenant quota 的 up/down SQL（postgres + sqlite） |
| `database.manifest.json` 缺 sqlite | 声明 `postgres` + `sqlite`；`contract/schema.yaml` 同步 |
| PC 文件浏览器服务端排序 | `starred`/`shared`/`recent`/`trash` 根视图启用 server-side sort；测试与实现对齐 |
| Backend admin 列表 SdkWorkPageData | audit/maintenance/downloadPackages 使用 `success_offset_list_page`；PC admin 经 `@sdkwork/utils` 归一化分页 |
| ShareLinkModal / fileBrowser 测试 | ShareLinkModal 契约测试；fileBrowser server-side sort 与实现对齐 |
| `drive-alignment.integration.test.mjs` 重复声明 | 移除重复 `const`；`list_spaces` 断言对齐 workspace-service SQL 分页 |

---

## 三、架构快照

```
apps/sdkwork-drive-pc          → @sdkwork/drive-app-sdk（上传/下载，禁止 raw HTTP）
crates/sdkwork-routes-*-api    → sdkwork-web-framework + IamWebRequestContextResolver
crates/sdkwork-drive-workspace-service → store ports + uploader/outbox 业务核心
database/                      → baseline + migrations（双引擎）+ db:validate
sdks/                          → OpenAPI 权威 → composed SDK facade
```

---

## 四、生产上线门禁

| 条件 | 状态 |
|------|:----:|
| `pnpm check` / `pnpm verify` | ✅ |
| API envelope + schema quality gate | ✅ |
| PostgreSQL/SQLite lifecycle 资产 | ✅ baseline + 0002/0003 migrations |
| 多实例 Redis 限流（可选） | ✅ `redis-rate-limit` feature |
| Outbox 双引擎 claim | ✅ |

### 部署要点

1. 多实例限流：`SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis`
2. 生产下载令牌：`SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET`
3. Cloud 分服务：`SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false`
4. 上传内容策略：`SDKWORK_DRIVE_UPLOAD_CONTENT_POLICY_MODE=enforce`

### 验证命令

```bash
pnpm check
pnpm verify
pnpm api:envelope:check
pnpm api:schema:check
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
pnpm deploy:validate
cargo test -p sdkwork-drive-workspace-service outbox
```

---

## 五、商业化 GA 前运营项（代码外）

应用尚未上线。代码对齐已结案；以下仍阻塞 `publish.status=ACTIVE`：

| 项 | 说明 |
|----|------|
| 制品签名 | CI `security.signatureRequired` |
| Catalog 媒体 CDN | 清除 `catalogMediaDeferred` |
| K8s 生产 digest | 替换 `REPLACE_WITH_RELEASE_DIGEST` |
| Admin smoke / staging e2e | [pre-launch-checklist.md](../guides/operator/pre-launch-checklist.md) |

---

## 六、后续能力演进（产品 Non-Goal / P4）

| 项 | 触发条件 |
|----|----------|
| 高流量列表 opaque cursor 全面迁移 | 租户规模 / 深 offset 性能证据 |
| 上传 AV 扫描 | 生产内容安全需求 |
| 桌面 delta sync | PRD P4 |
| Azure Blob 适配器 | 具体客户需求 |

---

*本报告反映 2026-07-06 对齐状态。代码债务已清理；GA 运营项仍待执行。*
