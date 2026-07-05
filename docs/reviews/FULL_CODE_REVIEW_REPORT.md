# SDKWork Drive 标准对齐审查报告

> 更新日期: 2026-07-05  
> 审查标准: sdkwork-specs 全栈规范  
> 状态: **代码与门禁对齐完成 — 可进入受控试点；商业化 GA 见 pilot-deployment / pre-launch / releases**

---

## 一、对齐结论

| 维度 | 状态 | 验证命令 |
|------|:----:|----------|
| sdkwork-specs 仓库字典 | ✅ | `pnpm check:architecture-alignment` |
| sdkwork-web-framework | ✅ | 四个 `*-api` route crate + `web_bootstrap.rs` + IAM resolver |
| sdkwork-database | ✅ | `database/` 资产 + `pnpm db:validate` |
| sdkwork-utils | ✅ | Rust `sdkwork-utils-rust`；TS `@sdkwork/utils`（含 `Sha256Hasher` 流式摘要） |
| API 输入/输出契约 | ✅ | `pnpm api:envelope:check`（含 generator input 物化）+ `pnpm api:schema:check` |
| 分页（PAGINATION_SPEC） | ✅ | `node ../sdkwork-specs/tools/check-pagination.mjs --workspace .` |
| 部署契约 | ✅ | `deployments/deploy.yaml` + `pnpm deploy:validate` |
| Drive 上传高内聚 | ✅ | `pnpm check:app-sdk-consumers` |
| Native composition | ✅ | `pnpm check:app-composition` |
| 打包 / 拓扑 / 发布 | ✅ | `pnpm topology:validate` + `pnpm gateway:assembly:validate` |

---

## 二、2026-07-05 技术债务清理

| 项 | 处理 |
|----|------|
| `api:envelope:check` 因 `target/drive-sdk-generator-input` 缺 envelope 失败 | `materialize_drive_sdk_generator_input.mjs` 在门禁前物化 owner-only OpenAPI 并保留 SdkWorkApiResponse 组件 |
| Legacy assets 501 非标准 ProblemDetail | 改为 `problem()` + `traceId`（RFC 9457） |
| 浏览器/桌面大文件上传 checksum OOM | `@sdkwork/utils` `Sha256Hasher` 分块摘要；uploader 不再整文件 `arrayBuffer()` |
| 文件浏览器为排序批量拉取最多 500 条 | 移除 `fetchRemainingFileBrowserPages`；`recent`/`trash`/`nodes.list` 服务端 `sortBy`/`sortOrder` |
| Assets 列表 `pageSize` 上限 100 | 对齐规范上限 **200** |
| 下载无 stream reader 回退 OOM | 64MB 内存回退上限 |
| `favorites.list` / `sharedWithMe.list` 服务端排序 | `resolve_aliased_node_list_order_by` + SQL `ORDER BY`；文件浏览器 `starred`/`shared` 根视图启用 `serverSideSort` |
| Admin `storageProviders.buckets.list` 非标准响应 | 对齐 `SdkWorkApiResponse` + `data.items`/`data.pageInfo`；`pageSize`/`pageToken` 查询参数；前端 `bucket` 字段映射 |
| `space_handlers` 内联 SQL（Phase 8） | `list_accessible_spaces` 下沉至 workspace-service；路由层不再含 `sqlx::query` |
| `.env.postgres.example` 废弃 `SDKWORK_CLAW_DATABASE_*` | 仅保留 `SDKWORK_DRIVE_DATABASE_*` 规范键 |
| `sdks/sdkwork-drive-sdk/.sdkwork-assembly.json` 缺失 | 从 `sdk-manifest.json` 物化 assembly 元数据（`sdkDependencies: []`） |
| 集成测试仍断言扁平 `items` | `assets_routes` / `admin_storage_routes` / `command_routes` spaces list 改为断言 `code` + `data.items` |

---

## 三、架构快照

```
apps/sdkwork-drive-pc          → @sdkwork/drive-app-sdk（上传/下载，禁止 raw HTTP）
crates/sdkwork-routes-*-api    → sdkwork-web-framework + IamWebRequestContextResolver
crates/sdkwork-drive-workspace-service → sdkwork-database-repository + uploader 业务核心
database/                      → sdkwork-database-cli 生命周期
sdks/                          → OpenAPI 权威 → 生成 SDK（composed facade 消费入口）
```

---

## 四、生产上线门禁

| 条件 | 状态 |
|------|:----:|
| `pnpm check` 全量门禁 | ✅ 含 `api:envelope:check` 物化步骤 |
| `pnpm verify` | ✅ |
| API envelope + schema quality gate | ✅ |
| PostgreSQL lifecycle 迁移 | ✅ |
| 多实例 Redis 限流（可选） | ✅ `redis-rate-limit` feature |

### 部署要点

1. 多实例限流：`SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis`
2. 生产下载令牌：配置 `SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET`
3. Cloud 分服务：`SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false`
4. 上传内容策略生产：`SDKWORK_DRIVE_UPLOAD_CONTENT_POLICY_MODE=enforce`

### 验证命令

```bash
pnpm check
pnpm verify
pnpm api:envelope:check
pnpm api:schema:check
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
pnpm deploy:validate
```

---

## 五、商业化 GA 前运营项（代码外）

应用尚未上线。代码对齐已结案；运营项见 [pre-launch-checklist.md](../guides/operator/pre-launch-checklist.md)。

| 项 | 说明 |
|----|------|
| 制品签名 | CI 配置 `security.signatureRequired` |
| Catalog 媒体 CDN | 清除 `catalogMediaDeferred`，上传真实 icon/screenshot |
| K8s 生产 digest | 替换 `REPLACE_WITH_RELEASE_DIGEST` |
| `publish.status` | 签名与 catalog 通过后设为 `ACTIVE` |
| Admin smoke / staging e2e | pre-launch checklist 人工验收 |

---

## 六、后续能力演进（非阻塞）

| 项 | 触发条件 |
|----|----------|
| 上传 AV 扫描 | 生产内容安全需求 |
| 桌面 delta sync | PRD 后续阶段 |
| Azure Blob 适配器 | 具体客户需求 |

---

*本报告反映 2026-07-05 对齐状态。REQ-2026-0003（pre-launch debt cleanup）代码项已结案；GA 运营项仍待执行。*
