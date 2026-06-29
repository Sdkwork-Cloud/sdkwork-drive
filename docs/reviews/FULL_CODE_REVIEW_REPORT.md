# SDKWork Drive 标准对齐审查报告

> 更新日期: 2026-06-29  
> 审查标准: sdkwork-specs 全栈规范  
> 状态: **代码与规范对齐完成 — 可进入受控试点部署；商业化 GA 需完成第五节发布运营项**

---

## 一、对齐结论

| 维度 | 状态 | 验证命令 |
|------|:----:|----------|
| sdkwork-specs 仓库字典 | ✅ | `pnpm check:architecture-alignment` |
| sdkwork-web-framework | ✅ | 四个 `*-api` route crate + `web_bootstrap.rs` + IAM resolver |
| sdkwork-database | ✅ | `database/` 资产 + `pnpm db:validate` |
| sdkwork-utils | ✅ | Rust `sdkwork-utils-rust`；前端 `@sdkwork/utils` 经 `formatDriveBytes` 统一 |
| sdkwork-discovery | ⏭️ 不适用 | 纯 HTTP 架构，无 RPC |
| API 输入/输出契约 | ✅ | `pnpm api:envelope:check` + `pnpm api:schema:check` |
| 部署契约 | ✅ | `deployments/deploy.yaml` + `pnpm deploy:validate` |
| Drive 上传高内聚 | ✅ | `pnpm check:app-sdk-consumers` |
| 打包 / 拓扑 / 发布 | ✅ | `pnpm topology:validate` + `sdkwork.workflow.json` |

---

## 二、架构快照

```
apps/sdkwork-drive-pc          → @sdkwork/drive-app-sdk（上传/下载，禁止 raw HTTP）
crates/sdkwork-routes-*-api    → sdkwork-web-framework + IamWebRequestContextResolver
crates/sdkwork-drive-workspace-service → sdkwork-database-repository + uploader 业务核心
database/                      → sdkwork-database-cli 生命周期（migrate/seed/drift）
deployments/deploy.yaml        → SDKWORK_DEPLOY_SPEC 多 profile 契约
sdks/                          → OpenAPI 权威 → 生成 SDK 家族（禁止手改生成物）
```

### 框架依赖矩阵

| 框架 | 接入点 | 规范 |
|------|--------|------|
| sdkwork-web-framework | `sdkwork-web-axum` + `web_bootstrap.rs` | WEB_FRAMEWORK_SPEC |
| sdkwork-database | `sdkwork-drive-database-host` + `database.manifest.json` | DATABASE_FRAMEWORK_SPEC |
| sdkwork-utils | `sdkwork-utils-rust` / `@sdkwork/utils` | CODE_STYLE_SPEC |
| sdkwork-iam-web-adapter | `IamWebRequestContextResolver` | IAM_LOGIN_INTEGRATION_SPEC |

### Drive 上传边界

- **客户端**: `createDriveUploaderClient` → `client.uploader.*`
- **服务端 Rust**: `sdkwork_drive_workspace_service::uploader`（禁止 HTTP 回环）
- **App API**: `/app/v3/api/drive/uploader/*` 作为 HTTP 适配层

---

## 三、生产上线门禁

| 条件 | 状态 |
|------|:----:|
| `pnpm check` 全量门禁 | ✅ |
| `cargo check --workspace` | ✅ |
| API envelope + schema quality gate | ✅ |
| `deployments/deploy.yaml` 校验 | ✅ |
| PostgreSQL lifecycle 迁移 | ✅ |
| 多实例 Redis 限流（可选） | ✅ `redis-rate-limit` feature |

### 部署要点

1. 多实例限流：`cargo build --features redis-rate-limit`，设置 `SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis`
2. 生产下载令牌：配置 `SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET` 或租户级 JSON 密钥
3. Cloud 分服务：API Pod 设置 `SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false`
4. 公共入口域名：`drive.sdkwork.com`（见 `deployments/deploy.yaml` expose）

### 验证命令

```bash
pnpm check
pnpm verify
pnpm api:envelope:check
pnpm api:schema:check
pnpm deploy:validate
pnpm check:architecture-alignment
```

---

## 四、商业化 GA 前发布运营项

应用尚未上线。以下项由 CI/发布流程完成，通过 `SDKWORK_RELEASE_VALIDATION=strict pnpm check:release-readiness` 强制：

| 项 | 说明 |
|----|------|
| 制品签名 | CI 配置 `security.signatureRequired` 与受保护签名凭据 |
| 桌面跨平台包 | macOS DMG / Linux AppImage checksum 在目标 runner 生成 |
| Catalog 媒体 | CDN 上传 icon/screenshot/preview；`generatedPlaceholder` 必须为 false |
| K8s 生产 digest | 替换 `REPLACE_WITH_RELEASE_DIGEST` 为不可变 digest |
| `publish.status` | 仅在签名与 catalog 门禁通过后设为 `ACTIVE` |

详见 [pre-launch-checklist.md](../guides/operator/pre-launch-checklist.md) 与 [releases/README.md](../releases/README.md)。

---

## 五、后续能力演进（非阻塞）

| 项 | 触发条件 | 规范 |
|----|----------|------|
| RPC + sdkwork-discovery | 引入 gRPC 服务 | RPC_FRAMEWORK_SPEC + DISCOVERY_SPEC |
| 上传 AV 扫描 | 生产内容安全需求 | `upload_content_policy` 扩展点 |
| 前端按钮级权限 | 细粒度 UI 控制 | IMF 角色 + APP_PERMISSION_COMPOSITION_SPEC |

---

*本报告描述当前对齐状态；历史迭代记录见 git changelog 与 REQ-2026-0003。*
