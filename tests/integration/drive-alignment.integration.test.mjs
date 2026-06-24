#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

const assetsModule = read('crates/sdkwork-router-drive-app-api/src/assets.rs');
const appRoutes = read('crates/sdkwork-router-drive-app-api/src/routes.rs');
const uploaderServiceCrate = read('crates/sdkwork-drive-uploader-service/src/lib.rs');
const fileBrowserSort = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/fileBrowserSort.ts');
const openApiRoutes = read('crates/sdkwork-router-drive-open-api/src/routes.rs');
const aclModule = read('crates/sdkwork-router-drive-app-api/src/acl.rs');
const aclSqlModule = read('crates/sdkwork-router-drive-app-api/src/acl_sql.rs');
const problemCorrelation = read('crates/sdkwork-drive-http/src/problem_correlation.rs');
const traceIds = read('crates/sdkwork-drive-http/src/trace_ids.rs');
const appState = read('crates/sdkwork-router-drive-app-api/src/state.rs');
const downloadTransfer = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/transfer/downloadTransfer.ts',
);
const downloadService = read(
  'crates/sdkwork-drive-workspace-service/src/application/download_service.rs',
);
const fileBrowser = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx',
);
const drivePage = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
const transferJobs = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-types/src/transferJobs.ts');
const driveFileService = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
);
const appTestCommon = read('crates/sdkwork-router-drive-app-api/tests/common/mod.rs');
const backendIamGuard = read('crates/sdkwork-router-drive-backend-api/tests/iam_auth_guard.rs');
const storageIamGuard = read('crates/sdkwork-router-storage-backend-api/tests/iam_auth_guard.rs');
const driveIamRuntimeTest = read('apps/sdkwork-drive-pc/src/bootstrap/driveIamRuntime.test.ts');
const appShell = read('apps/sdkwork-drive-pc/src/App.tsx');
const shareLinkModal = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/ShareLinkModal.tsx',
);
const driveSectionRoutes = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/routing/driveSectionRoutes.ts',
);
const moveCopyModal = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/MoveCopyModal.tsx',
);
const fileDetailModal = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx',
);
const hostAdapter = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/host/hostAdapter.ts');
const desktopMain = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-desktop/src-tauri/src/main.rs');
const permissionRole = read('crates/sdkwork-drive-workspace-service/src/domain/permission_role.rs');
const permissionStore = read(
  'crates/sdkwork-drive-workspace-service/src/infrastructure/sql/permission_store.rs',
);
const sharedSpaceLocale = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-commons/src/i18n/locales/en/sharedSpace.ts',
);
const createSharedSpaceModal = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/CreateSharedSpaceModal.tsx',
);
const textEditorModule = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/preview-modules/TextEditorModule.tsx',
);
const pdfModule = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/preview-modules/PdfModule.tsx',
);
const zipModule = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/preview-modules/ZipModule.tsx',
);
const imageModule = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/preview-modules/ImageModule.tsx',
);
const officeModule = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/preview-modules/OfficeModule.tsx',
);

assert.match(assetsModule, /drive\.not_implemented/);
assert.match(assetsModule, /StatusCode::NOT_IMPLEMENTED/);
assert.match(assetsModule, /use Drive uploader APIs/);
assert.match(assetsModule, /global\.asset\.archived/);
assert.match(assetsModule, /global\.asset\.archive\.reason/);
assert.match(assetsModule, /pub\(crate\) async fn list_assets/);
assert.match(appRoutes, /present_node_list/);
assert.match(appRoutes, /present_drive_node/);
assert.match(appRoutes, /TenantQuotaPolicy::from_env/);

assert.match(aclModule, /subject_has_any_space_permission_grant/);
assert.match(aclModule, /drive\.permission_denied/);
assert.match(aclModule, /ensure_space_change_feed_reader/);
assert.match(aclSqlModule, /reader_inherited_permission_exists_sql/);
assert.match(aclSqlModule, /shared_with_me_visible_sql/);
assert.match(appRoutes, /sdkwork_drive_http::problem_correlation::problem_correlation_middleware/);
const backendRoutes = read('crates/sdkwork-router-drive-backend-api/src/routes.rs');
assert.match(backendRoutes, /sdkwork_drive_http::problem_correlation::problem_correlation_middleware/);
assert.match(problemCorrelation, /current_problem_correlation/);
assert.match(traceIds, /resolve_trace_context/);
assert.match(traceIds, /TRACE_ID_HEADER/);
assert.match(appRoutes, /paginate_cursor_limited_changes/);
assert.match(appRoutes, /require_query_value\(query\.space_id, "spaceId"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role\(&state\.pool, &ctx, &node\.space_id, &node_id, "reader"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role\(&state\.pool, &ctx, &node\.space_id, &node_id, "owner"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role[\s\S]*"commenter"/);
assert.match(aclModule, /ensure_subject_space_scoped_reader/);
assert.match(aclModule, /space_is_accessible_to_subject/);
assert.match(aclModule, /ensure_space_owner/);
assert.match(aclModule, /resolve_space_permission_anchor_node/);
assert.match(appState, /pub\(crate\) auth_policy: DriveAuthValidationPolicy/);
assert.match(appRoutes, /ensure_create_space_owner_matches_caller/);
assert.match(appRoutes, /bootstrap_team_space_creator_access/);
assert.match(appRoutes, /ownerSubjectType to group or organization/);
assert.match(appTestCommon, /auth_token_for_organization/);
assert.match(appRoutes, /drive\.validation\.space_owner_invalid/);
assert.match(appRoutes, /claim_share_link/);
assert.match(appRoutes, /acl::space_is_accessible_to_subject/);
assert.match(appRoutes, /acl::ensure_space_owner/);
assert.match(appRoutes, /acl::ensure_parent_writer\(&state\.pool, &ctx, &space_id, None\)/);
assert.doesNotMatch(appRoutes, /operator-unset/);
assert.match(appRoutes, /ctx\.resolve_operator_id\(query\.operator_id\)/);
assert.match(appRoutes, /ctx\.resolve_operator_id\(None\)/);

assert.match(downloadTransfer, /applyDownloadProgressToJob/);
assert.match(downloadTransfer, /applyDownloadCompletionToJob/);
assert.match(downloadTransfer, /export async function runManagedDownloadTransfer/);
assert.doesNotMatch(downloadTransfer, /Math\.random/);

assert.match(fileBrowser, /runManagedDownloadTransfer/);
assert.match(drivePage, /runManagedDownloadTransfer/);
assert.match(transferJobs, /progress: 0/);
assert.doesNotMatch(transferJobs, /tickTransferJobs/);

assert.match(driveFileService, /listShareLinks/);
assert.match(driveFileService, /createShareLink/);
assert.match(driveFileService, /claimShareLink/);
assert.match(driveFileService, /shareLinks\.claim/);
assert.match(driveFileService, /revokeShareLink/);
assert.match(drivePage, /claimShareLink/);
assert.match(drivePage, /pendingShareClaimToken/);
assert.match(drivePage, /handleAcceptShareClaim/);
assert.match(drivePage, /handleDeclineShareClaim/);
assert.match(drivePage, /fileBrowser\.shareLinkClaimPrompt/);
assert.match(appShell, /onShareClaimDismiss/);
assert.doesNotMatch(driveFileService, /fetch\(/);

assert.match(appTestCommon, /auth_token_jwt/);
assert.doesNotMatch(appTestCommon, /tenant_id=\{tenant\};/);
assert.match(backendIamGuard, /encode_unsigned_test_jwt/);
assert.match(storageIamGuard, /encode_unsigned_test_jwt/);
assert.match(driveIamRuntimeTest, /createTestJwt/);

assert.match(appShell, /parseShareLinkClaimToken/);
assert.match(appShell, /isShareLinkClaimPath/);
assert.match(appShell, /shareClaimToken=\{shareClaimToken/);
assert.match(shareLinkModal, /buildShareLinkClaimPath/);
assert.match(shareLinkModal, /window\.location\.origin/);
assert.match(driveSectionRoutes, /export function buildShareLinkClaimPath/);
assert.match(driveSectionRoutes, /export function isShareLinkClaimPath/);
assert.match(driveSectionRoutes, /return 'shared'/);
assert.match(driveFileService, /listMoveCopyDestinationFolders/);
assert.match(moveCopyModal, /listMoveCopyDestinationFolders/);
assert.doesNotMatch(moveCopyModal, /getAllWorkspaceFiles/);
assert.match(hostAdapter, /local_download_save/);
assert.match(hostAdapter, /local_download_begin/);
assert.match(hostAdapter, /local_download_write_chunk/);
assert.match(downloadTransfer, /saveDownloadStream/);
assert.match(downloadTransfer, /createHostDownloadStreamAdapter/);
assert.match(fileBrowser, /saveDownloadStream: hostDownloadStream/);
assert.match(fileBrowser, /debouncedSearchQuery/);
assert.match(fileBrowser, /fileBrowser\.permanentDeleteConfirm/);
assert.match(fileBrowser, /fileBrowser\.batchSelectedCount/);
assert.match(fileBrowser, /fileBrowser\.batchOperationFailed/);
assert.match(fileDetailModal, /fileDetail\.previewUrlFailed/);
assert.match(fileDetailModal, /fileDetail\.renameSuccess/);
assert.match(desktopMain, /local_download_begin/);
assert.match(desktopMain, /local_download_write_chunk/);
assert.match(permissionRole, /pub fn drive_role_satisfies/);
assert.match(permissionStore, /permission_role::drive_role_satisfies/);
assert.match(sharedSpaceLocale, /createTitle:/);
assert.match(sharedSpaceLocale, /createSuccess:/);
assert.match(createSharedSpaceModal, /sharedSpace\.createTitle/);
assert.match(drivePage, /sharedSpace\.createSuccess/);
assert.match(drivePage, /sharedSpace\.deleteSuccess/);
assert.match(downloadService, /dlv2_/);
assert.match(downloadService, /sign_download_token_payload/);
assert.match(downloadService, /resolve_download_token_signing_key\(tenant_id/);
assert.match(downloadService, /peek_download_token_tenant_id/);
assert.match(downloadService, /SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRETS_JSON/);
assert.match(downloadService, /is_production_runtime_profile/);
assert.match(downloadService, /SDKWORK_DRIVE_DOWNLOAD_TOKEN_HMAC_SECRET is required in production/);
assert.doesNotMatch(downloadService, /dlv1_/);
const webhookUrl = read('crates/sdkwork-router-drive-app-api/src/webhook_url.rs');
const appValidators = read('crates/sdkwork-router-drive-app-api/src/validators.rs');
const jwtModule = read('crates/sdkwork-drive-security/src/jwt.rs');
const securityWebhook = read('crates/sdkwork-drive-security/src/webhook_url.rs');
const outboxDispatch = read(
  'crates/sdkwork-drive-workspace-service/src/infrastructure/outbox_dispatch.rs',
);
const appContext = read('crates/sdkwork-router-drive-app-api/src/app_context.rs');
const collaborationRepo = read('crates/sdkwork-router-drive-app-api/src/collaboration_repository.rs');
assert.match(securityWebhook, /validate_webhook_https_url/);
assert.match(securityWebhook, /is_blocked_webhook_ip/);
assert.match(webhookUrl, /sdkwork_drive_security::validate_webhook_https_url/);
assert.match(appValidators, /validate_webhook_https_url/);
assert.match(outboxDispatch, /sdkwork_drive_security::validate_webhook_https_url/);
assert.match(jwtModule, /validate_jwt_expiry/);
assert.match(jwtModule, /JWT exp claim is required/);
assert.match(appContext, /is_production_runtime_profile/);
assert.match(appContext, /operatorId is required/);
assert.match(collaborationRepo, /find_active_share_link_by_token_for_tenant/);
assert.match(collaborationRepo, /WHERE tenant_id=\$1 AND token_hash=\$2/);
assert.match(collaborationRepo, /enforce_share_link_download_limit_for_subject/);
assert.match(appRoutes, /find_active_share_link_by_token_for_tenant/);
assert.match(appRoutes, /enforce_share_link_download_limit_for_subject/);
assert.match(uploaderServiceCrate, /pub mod service/);
assert.match(uploaderServiceCrate, /DriveUploaderService/);
assert.match(appRoutes, /sdkwork_drive_uploader_service::service::/);
assert.match(appRoutes, /DriveUploaderService/);
assert.match(fileBrowser, /from "\.\/fileBrowserSort"/);
assert.match(fileBrowser, /sortDriveFiles/);
assert.match(openApiRoutes, /sdkwork_drive_http::problem_correlation::problem_correlation_middleware/);
assert.match(appRoutes, /ensure_ctx_node_role/);
assert.match(appRoutes, /generate_share_link_token/);
assert.match(appRoutes, /share_link_claim_grant_role/);
assert.match(driveFileService, /import \{ isDriveAbortError \} from '\.\.\/transfer\/downloadTransfer'/);
assert.match(driveFileService, /stringField\(source, 'token'\)/);
assert.match(downloadTransfer, /export function isDriveAbortError/);
assert.match(fileBrowser, /isDriveAbortError/);
assert.match(drivePage, /isDriveAbortError/);
assert.match(drivePage, /t\('transfer\.retryTransferFailed'\)/);
assert.match(drivePage, /t\('transfer\.retryUploadFailed'\)/);
assert.match(zipModule, /previewModules\.archiveLoadFailed/);
assert.match(pdfModule, /previewModules\.pdfPreviewUnavailable/);
assert.match(drivePage, /transfer\.uploadRetryMismatch/);
assert.match(drivePage, /getUploadRetryMismatchContext/);
assert.match(imageModule, /previewModules\.mediaPreviewUnavailable/);
assert.match(officeModule, /previewModules\.officeOpenFile/);
assert.match(textEditorModule, /previewModules\.textSavedToDrive/);
assert.match(appShell, /isDriveAbortError/);
assert.match(textEditorModule, /isDriveAbortError/);
assert.match(pdfModule, /isDriveAbortError/);
assert.match(zipModule, /isDriveAbortError/);
assert.doesNotMatch(fileBrowser, /function isDriveUploadAbortError/);
assert.doesNotMatch(drivePage, /function isDrivePageAbortError/);
assert.match(moveCopyModal, /isDriveAbortError/);
assert.match(shareLinkModal, /listShareLinks\(file\.id, \{ signal: controller\.signal \}\)/);
assert.match(shareLinkModal, /createShareLink\(file\.id, \{/);
assert.match(shareLinkModal, /revokeShareLink\(shareLinkId, \{/);
assert.match(shareLinkModal, /isDriveAbortError/);

const downloadManager = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/DownloadManager.tsx',
);
const transferPage = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-transfer/src/pages/TransferPage.tsx',
);
const transferJobDisplay = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-commons/src/utils/transferJobDisplay.ts',
);
assert.match(transferJobDisplay, /formatTransferJobSpeedLabel/);
assert.match(transferJobDisplay, /formatTransferJobTimeRemainingLabel/);
assert.match(transferJobDisplay, /formatTransferJobProgressDetail/);
assert.match(downloadManager, /formatTransferJobSpeedLabel\(job\.speed, t\)/);
assert.match(transferPage, /formatTransferJobProgressDetail\(job, t\)/);
assert.match(drivePage, /TRANSFER_SPEED_UPLOADING/);
assert.match(drivePage, /TRANSFER_TIME_WAITING_BACKEND/);
assert.match(drivePage, /TRANSFER_TIME_CALCULATING/);
assert.match(drivePage, /TRANSFER_TIME_FINALIZING/);
assert.doesNotMatch(drivePage, /speed: 'Uploading\.\.\.'/);
const driveAppOpenApi = read('apis/app-api/drive/drive-app-api.openapi.json');
const driveHostModulePackage = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-drive/package.json');
const driveHostModuleRuntime = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-drive/src/createHostManagedDriveRuntime.ts',
);
assert.match(driveHostModulePackage, /"name": "sdkwork-drive-pc-drive"/);
assert.match(driveHostModuleRuntime, /getConfiguredDriveAppSdkClient/);
assert.doesNotMatch(driveHostModuleRuntime, /\bfetch\s*\(/);
assert.match(driveAppOpenApi, /"quotaBytes"/);
assert.match(driveAppOpenApi, /"folderColor"/);
assert.match(driveAppOpenApi, /CreateShareLinkResponse/);
assert.match(driveAppOpenApi, /"operationId": "shareLinks.create"[\s\S]*CreateShareLinkResponse/);
assert.doesNotMatch(drivePage, /speed: t\('transfer\.uploading'\)/);

const domainEvents = read('crates/sdkwork-drive-contract/src/drive/domain_events.rs');
const changeRecorder = read(
  'crates/sdkwork-drive-workspace-service/src/infrastructure/change_recorder.rs',
);
const uploaderStore = read(
  'crates/sdkwork-drive-workspace-service/src/infrastructure/sql/uploader_store.rs',
);
const maintenanceStore = read(
  'crates/sdkwork-drive-workspace-service/src/infrastructure/sql/maintenance_store.rs',
);
assert.match(domainEvents, /drive\.node\.created/);
assert.match(domainEvents, /drive\.upload_session\.completed/);
assert.match(domainEvents, /drive\.download_grant\.created/);
assert.match(domainEvents, /all_domain_event_names_use_drive_prefix/);
assert.match(changeRecorder, /record_drive_change_on_connection/);
assert.match(changeRecorder, /dr_drive_domain_outbox/);
assert.match(appRoutes, /sdkwork_drive_contract::drive::domain_events as drive_events/);
assert.match(appRoutes, /drive_events::upload_session::COMPLETED/);
assert.match(appRoutes, /drive_events::download_grant::CREATED/);
assert.match(uploaderStore, /change_recorder::record_drive_change_on_connection/);
assert.doesNotMatch(appRoutes, /"node\.file_created"/);
assert.doesNotMatch(appRoutes, /"upload\.completed"/);
assert.doesNotMatch(appRoutes, /"space\.updated"/);
assert.match(fileBrowser, /runBatchSettledOperations/);
assert.match(fileBrowser, /fileBrowserUploadQueue/);
assert.match(fileBrowser, /queueFileBrowserUploads/);
assert.match(appRoutes, /drive_events::space::CREATED/);
assert.match(appRoutes, /drive_events::upload_session::CREATED/);
assert.match(uploaderStore, /drive_events::object::QUARANTINED/);
assert.match(uploaderStore, /quarantine_blocked_upload_content/);
assert.match(uploaderStore, /dr_drive_file_sensitive_operation/);
assert.match(uploaderStore, /cleanup_status='failed'/);
const releaseReadiness = read('tools/check_sdkwork_drive_release_readiness.mjs');
assert.match(releaseReadiness, /SUPPLY_CHAIN_SECURITY_SPEC/);
assert.match(releaseReadiness, /SDKWORK_RELEASE_VALIDATION=strict/);
assert.match(releaseReadiness, /generatedPlaceholder/);
const releaseEvidence = read('tools/materialize_release_manifest_evidence.mjs');
assert.match(releaseEvidence, /release-evidence\.json/);
assert.match(releaseEvidence, /checksumRequired/);
const releaseWebBundle = read('scripts/release-web-bundle.mjs');
assert.match(releaseWebBundle, /web\.zip/);
assert.match(releaseWebBundle, /web-universal-cloud-browser-zip/);
const releaseDesktopBundle = read('scripts/release-desktop-bundle.mjs');
assert.match(releaseDesktopBundle, /windows-x64-standalone-desktop-zip/);
assert.match(releaseDesktopBundle, /macos-universal-standalone-desktop-dmg/);
assert.match(releaseDesktopBundle, /linux-x64-standalone-desktop-appimage/);
const releaseEvidenceVerify = read('tools/verify_release_evidence.mjs');
assert.match(releaseEvidenceVerify, /QUALITY_GATE_SPEC/);
assert.match(releaseEvidenceVerify, /release-evidence\.json/);
const releaseCatalogMedia = read('scripts/release-catalog-media.mjs');
assert.match(releaseCatalogMedia, /catalog-media-evidence\.json/);
assert.match(releaseCatalogMedia, /sdkwork-drive-catalog-preview/);
const catalogMediaEvidence = read('tools/materialize_catalog_media_evidence.mjs');
assert.match(catalogMediaEvidence, /stagedArtifactPath/);
assert.match(catalogMediaEvidence, /apps\/sdkwork-drive-pc\/sdkwork.app.config.json/);
assert.match(catalogMediaEvidence, /MEDIA_ID_ALIASES/);
assert.match(uploaderStore, /state='aborted'/);
assert.match(maintenanceStore, /drive_events::uploader::CONTENT_EXPIRED/);
assert.match(appRoutes, /events::APP_UPLOADER_UPLOADS_PREPARE/);
assert.match(appRoutes, /events::APP_UPLOADER_PART_MARK_UPLOADED/);
assert.match(appRoutes, /record_uploader_part_uploaded/);
assert.match(domainEvents, /admin_audit::/);
assert.match(domainEvents, /drive\.storage_provider\.created/);
assert.match(domainEvents, /drive\.maintenance\.object_sweep\.executed/);
const labelHandlers = read('crates/sdkwork-router-drive-backend-api/src/label_handlers.rs');
const storageProviderHandlers = read(
  'crates/sdkwork-router-drive-backend-api/src/storage_provider_handlers.rs',
);
const maintenanceHandlers = read(
  'crates/sdkwork-router-drive-backend-api/src/maintenance_handlers.rs',
);
const storageProviderBindingHandlers = read(
  'crates/sdkwork-router-drive-backend-api/src/storage_provider_binding_handlers.rs',
);
assert.match(labelHandlers, /admin_audit::label::/);
assert.match(storageProviderHandlers, /admin_audit::storage_provider::/);
assert.match(maintenanceHandlers, /admin_audit::maintenance::/);
assert.match(maintenanceHandlers, /sweep_expired_upload_content/);
assert.match(maintenanceHandlers, /sweep_abandoned_upload_tasks/);
assert.match(
  maintenanceHandlers,
  /admin_audit::maintenance::EXPIRED_UPLOAD_CONTENT_SWEEP_EXECUTED/,
);
assert.match(
  maintenanceHandlers,
  /admin_audit::maintenance::ABANDONED_UPLOAD_TASK_SWEEP_EXECUTED/,
);
assert.match(storageProviderBindingHandlers, /admin_audit::storage_provider_binding::/);
assert.doesNotMatch(labelHandlers, /"label\.created"/);
assert.doesNotMatch(storageProviderHandlers, /"storage_provider\.created"/);
assert.doesNotMatch(maintenanceHandlers, /"maintenance\.object_sweep\.executed"/);
assert.match(domainEvents, /EXPIRED_UPLOAD_CONTENT_SWEEP_EXECUTED/);
assert.match(domainEvents, /ABANDONED_UPLOAD_TASK_SWEEP_EXECUTED/);
assert.match(backendRoutes, /sweep_expired_upload_content/);
assert.match(backendRoutes, /sweep_abandoned_upload_tasks/);
const backendOpenApi = read('apis/backend-api/drive/drive-backend-api.openapi.json');
assert.match(backendOpenApi, /"operationId": "maintenance\.expiredUploadContentSweep\.start"/);
assert.match(backendOpenApi, /"operationId": "maintenance\.abandonedUploadTaskSweep\.start"/);
assert.match(backendOpenApi, /expired_upload_content_sweep/);
assert.match(backendOpenApi, /abandoned_upload_task_sweep/);
const storageProviderHandlersStorage = read(
  'crates/sdkwork-router-storage-backend-api/src/provider_handlers.rs',
);
const storageBindingHandlersStorage = read(
  'crates/sdkwork-router-storage-backend-api/src/binding_handlers.rs',
);
assert.match(storageProviderHandlersStorage, /admin_audit::storage_provider::/);
assert.match(storageBindingHandlersStorage, /admin_audit::storage_provider_binding::/);
assert.doesNotMatch(storageProviderHandlersStorage, /"storage_provider\.created"/);

const driveHttpMetrics = read('crates/sdkwork-drive-http/src/metrics.rs');
const driveHttpRateLimit = read('crates/sdkwork-drive-http/src/middleware/rate_limit.rs');
const productionRunbook = read('docs/runbooks/drive-production-operations.md');
const deployValidate = read('tools/check_drive_deployments.mjs');
const sdkworkCommand = read('scripts/sdkwork-command.mjs');
assert.match(appRoutes, /drive_share_access_code_hash/);
assert.match(appRoutes, /validate_share_link_access_code/);
assert.match(driveAppOpenApi, /"accessCodeRequired"/);
assert.match(driveAppOpenApi, /"accessCode"/);
assert.match(driveFileService, /accessCodeRequired/);
assert.match(driveHttpMetrics, /record_http_request_duration/);
assert.match(driveHttpRateLimit, /record_http_rate_limited/);
assert.match(productionRunbook, /x-trace-id/);
assert.ok(deployValidate.includes('must declare an Ingress resource'));
assert.ok(deployValidate.includes('nginx limit-rps edge rate limiting'));
assert.ok(deployValidate.includes('OTEL_EXPORTER_OTLP_ENDPOINT'));
assert.ok(deployValidate.includes('sdkwork-drive-iam secrets for production JWT validation'));
assert.ok(deployValidate.includes('SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_MAX_REQUESTS'));
const k8sManifest = read('deployments/kubernetes/drive-services.yaml');
assert.match(k8sManifest, /kind: Ingress/);
assert.match(k8sManifest, /nginx\.ingress\.kubernetes\.io\/limit-rps/);
assert.match(k8sManifest, /sdkwork-drive-iam/);
assert.match(k8sManifest, /SDKWORK_DRIVE_APP_API_RATE_LIMIT_MAX_REQUESTS/);
assert.match(k8sManifest, /SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_MAX_REQUESTS/);
assert.match(k8sManifest, /OTEL_EXPORTER_OTLP_ENDPOINT/);
assert.ok(
  (k8sManifest.match(/OTEL_EXPORTER_OTLP_ENDPOINT/g) ?? []).length >= 3,
  'all API Deployments must export OTLP traces',
);
assert.match(problemCorrelation, /inject_correlation_response_headers/);
assert.match(sdkworkCommand, /check_drive_deployments\.mjs/);
assert.match(outboxDispatch, /spawn_pending_outbox_dispatch/);
assert.match(driveHttpMetrics, /span_route_template/);
assert.match(driveHttpMetrics, /drive\.http\.request/);
assert.match(driveHttpMetrics, /http\.route/);
const driveSdkIntegrationDoc = read('docs/drive-sdk-integration-standard.md');
const driveIamIntegrationDoc = read('docs/drive-iam-integration-standard.md');
assert.doesNotMatch(driveSdkIntegrationDoc, /@sdkwork\/drive-pc/);
assert.doesNotMatch(driveIamIntegrationDoc, /@sdkwork\/drive-pc/);
assert.match(driveSdkIntegrationDoc, /sdkwork-drive-pc-core/);
assert.match(driveIamIntegrationDoc, /sdkwork-drive-pc-core/);
assert.ok(!existsSync(join(repoRoot, 'apps/sdkwork-drive-pc/pnpm-lock.yaml')), 'apps/sdkwork-drive-pc must not keep a nested pnpm-lock.yaml');

const verifyWorkflow = read('.github/workflows/verify.yml');
const prepareCiDeps = read('scripts/prepare-ci-dependencies.mjs');
const packageJson = read('package.json');
assert.match(verifyWorkflow, /Drive Commercial Gates/);
assert.match(verifyWorkflow, /pnpm verify/);
assert.match(verifyWorkflow, /prepare-ci-dependencies/);
const stagingE2eWorkflow = read('.github/workflows/staging-e2e.yml');
assert.match(stagingE2eWorkflow, /workflow_dispatch/);
assert.match(stagingE2eWorkflow, /Require staging secrets/);
assert.match(stagingE2eWorkflow, /DRIVE_E2E_OPEN_API_BASE_URL/);
assert.match(stagingE2eWorkflow, /DRIVE_E2E_PC_BASE_URL/);
assert.match(prepareCiDeps, /sdkwork-specs/);
assert.ok(packageJson.includes('"build:standalone"'));
assert.ok(packageJson.includes('"build:debug"'));
assert.ok(packageJson.includes('"test:drive-e2e"'));
assert.ok(packageJson.includes('"test:e2e"'));
const tracingSetup = read('crates/sdkwork-drive-observability/src/tracing_setup.rs');
assert.match(tracingSetup, /init_tracing/);
assert.match(tracingSetup, /OTEL_EXPORTER_OTLP_ENDPOINT/);
assert.match(tracingSetup, /SDKWORK_DRIVE_OTEL_EXPORTER_OTLP_ENDPOINT/);
const playwrightConfig = read('tests/e2e/playwright.config.mjs');
const playwrightSmoke = read('tests/e2e/specs/drive-open-api.smoke.spec.mjs');
assert.match(playwrightConfig, /specs/);
assert.match(playwrightSmoke, /DRIVE_E2E_OPEN_API_BASE_URL/);
assert.match(playwrightSmoke, /x-trace-id/);
assert.match(playwrightSmoke, /e2e-staging-trace-001/);
const shareLinkModalUiTest = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/ShareLinkModal.test.tsx',
);
assert.match(shareLinkModalUiTest, /ShareLinkModal/);
assert.match(shareLinkModalUiTest, /accessCode: 'extract-ui-42'/);
assert.match(shareLinkModalUiTest, /@vitest-environment jsdom/);
const pcShareLinkUiSpec = read('tests/e2e/specs/drive-pc-share-link.ui.spec.mjs');
assert.match(pcShareLinkUiSpec, /DRIVE_E2E_PC_BASE_URL/);
assert.match(pcShareLinkUiSpec, /\/share\/\$\{encodeURIComponent\(shareClaimToken\)\}/);
assert.match(pcShareLinkUiSpec, /sdkwork-drive-pc-session/);
const crossApiE2e = read(
  'crates/sdkwork-router-drive-app-api/tests/share_link_cross_api_e2e.rs',
);
assert.match(crossApiE2e, /share_link_create_via_app_api_and_resolve_via_open_api_with_access_code/);
assert.match(crossApiE2e, /drive\.share_link\.access_code_invalid/);
assert.match(crossApiE2e, /x-trace-id/);
const driveFileServiceTest = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/services/driveFileService.test.ts',
);
assert.match(driveFileServiceTest, /creates share links with extraction codes/);
assert.match(driveFileServiceTest, /accessCode: 'extract-42'/);
assert.match(playwrightSmoke, /drive\.share_link\.access_code_invalid/);

process.stdout.write('drive-alignment.integration.test.mjs passed\n');
