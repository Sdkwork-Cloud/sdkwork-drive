# SDKWork Drive 标准对齐审查报告

> 更新日期: 2026-06-29（迭代 5 — API schema 门禁 + Tauri 依赖修复）
> 审查标准: sdkwork-specs 全栈规范（API_SPEC §15、SDKWORK_DEPLOY_SPEC、WEB_FRAMEWORK_SPEC、DATABASE_FRAMEWORK_SPEC）
> 状态: **生产就绪 — 自动化门禁全部通过，代码技术债已清零（商业化运营项见第五节）**

---

## 一、对齐结论

| 维度 | 状态 | 证据 |
|------|:----:|------|
| sdkwork-specs 仓库字典 | ✅ | `pnpm check:architecture-alignment` |
| sdkwork-web-framework | ✅ | 四个 `*-api` route crate + `web_bootstrap.rs` |
| sdkwork-database | ✅ | `database/` 资产 + `sdkwork-drive-database-host` lifecycle |
| sdkwork-utils | ✅ | Rust `sdkwork-utils-rust`；前端 `@sdkwork/utils` |
| sdkwork-discovery | ⏭️ 不适用 | 纯 HTTP 架构，无 RPC；待 RPC 引入后再接入 |
| API 输入/输出契约 | ✅ | `pnpm api:envelope:check` + `pnpm api:schema:check`（均已纳入 `pnpm check`） |
| 部署契约 deploy.yaml | ✅ | `deployments/deploy.yaml` + `check-deploy-standard` |
| Drive 上传高内聚 | ✅ | `check:app-sdk-consumers` |
| 打包/拓扑/发布 | ✅ | `topology:validate`、`sdkwork.workflow.json` |

---

## 二、迭代 4 变更（2026-06-29）

### 部署契约

- 新增 `deployments/deploy.yaml`（多 profile：cloud/standalone × development/production）
- `tools/check_drive_deployments.mjs` 集成 `sdkwork-specs/tools/deploy/validate.mjs`
- 架构对齐检查要求 `deployments/deploy.yaml` 存在

### sdkwork-utils 去重

- `sdkwork-drive-security/jwt.rs`：JWT HMAC 校验改用 `verify_hmac_sha256_base64url`
- `sdkwork-drive-workspace-service/download_service.rs`：下载令牌签名改用 `hmac_sha256` + `secure_compare`
- 移除 workspace 成员对直接 `sha2`/`hmac` crate 依赖；Tauri 宿主保留 `sha2` 流式哈希，hex 格式化改用 `sdkwork-utils-rust::hex_encode`
- Tauri `Cargo.toml` 补齐缺失的 `serde_json` 依赖（secure session 持久化）

### API 契约门禁（迭代 5）

- 新增 `pnpm api:schema:check`（`drive_schema_quality_gate.mjs`）并纳入 `pnpm check`
- 架构对齐检查强制 `package.json` 声明 envelope + schema 脚本

### 编译卫生（迭代 4）

- 清理 `dead_code` / `unused import` 警告（rate_limit、open-api、storage-backend-api、app-api、gateway、standalone-gateway）

---

## 三、架构快照

```
apps/sdkwork-drive-pc          → @sdkwork/drive-app-sdk（上传/下载）
crates/sdkwork-routes-*-api    → sdkwork-web-framework + IAM resolver
crates/sdkwork-drive-workspace-service → sdkwork-database-repository + uploader
database/                      → sdkwork-database-cli 生命周期
deployments/deploy.yaml        → SDKWork Deploy Server 契约
```

---

## 四、生产上线检查清单

| 条件 | 状态 |
|------|:----:|
| `pnpm check` 全量门禁 | ✅ 含 `api:envelope:check` + `api:schema:check` |
| `cargo check --workspace` | ✅ |
| API envelope + schema quality gate | ✅ |
| `deployments/deploy.yaml` 校验 | ✅ |
| PostgreSQL lifecycle 迁移 | ✅ |
| 多实例 Redis 限流（可选） | ✅ `redis-rate-limit` feature + env |
| 生产 CORS / JWT / 下载令牌密钥 | ✅ 见 runbook |

### 部署要点

1. 多实例限流：`cargo build --features redis-rate-limit`，设置 `SDKWORK_DRIVE_RATE_LIMIT_BACKEND=redis`
2. 生产下载令牌：配置 `SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET` 或租户级 JSON 密钥
3. Cloud 分服务：API Pod 设置 `SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false`（install-worker 独立运行）
4. 公共入口域名：`drive.sdkwork.com`（见 `deployments/deploy.yaml` expose）

---

## 五、商业化上线前运营项（非代码技术债）

以下由运维/发布流程完成，不属于代码规范缺口；`pnpm check:release-readiness` 在 development 模式下以 warning 提示：

| 项 | 说明 |
|----|------|
| 制品签名 | CI 配置 `security.signatureRequired` 与受保护签名凭据 |
| 桌面跨平台包 | macOS DMG / Linux AppImage checksum 在目标 runner 生成 |
| Catalog 媒体 | CDN 上传 icon/screenshot/preview，`publish.status=ACTIVE` |
| K8s 生产 digest | 替换 `REPLACE_WITH_RELEASE_DIGEST` 为不可变 digest |

## 六、后续演进（可选能力扩展）

| 项 | 说明 |
|----|------|
| RPC + sdkwork-discovery | 引入 gRPC 服务时按 RPC_FRAMEWORK_SPEC 接入 |
| 上传 AV 扫描 | 可插拔 `upload_content_policy` 扩展点已存在，生产可接第三方引擎 |
| 前端按钮级权限 | 路由级 IAM 已强制；细粒度 UI 可按 IMF 角色增量添加 |

---

*报告更新: 2026-06-29 | 迭代 5 | 状态: 代码对齐完成，待商业化运营项*
