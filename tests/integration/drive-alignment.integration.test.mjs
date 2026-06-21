#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

const assetHandlers = read('crates/sdkwork-router-drive-app-api/src/asset_handlers.rs');
const appRoutes = read('crates/sdkwork-router-drive-app-api/src/routes.rs');
const aclModule = read('crates/sdkwork-router-drive-app-api/src/acl.rs');
const downloadTransfer = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/transfer/downloadTransfer.ts',
);
const fileBrowser = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx',
);
const drivePage = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
const transferJobs = read('apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-types/src/transferJobs.ts');
const driveFileService = read(
  'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
);

assert.match(assetHandlers, /drive\.not_implemented/);
assert.match(assetHandlers, /StatusCode::NOT_IMPLEMENTED/);
assert.match(assetHandlers, /use Drive nodes and uploader flows instead/);

assert.match(aclModule, /drive\.permission_denied/);
assert.match(aclModule, /ensure_space_change_feed_reader/);
assert.match(aclModule, /paginate_reader_visible_changes/);
assert.match(appRoutes, /require_query_value\(query\.space_id, "spaceId"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role\(&state\.pool, &ctx, &node\.space_id, &node_id, "reader"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role\(&state\.pool, &ctx, &node\.space_id, &node_id, "owner"\)/);
assert.match(appRoutes, /acl::ensure_ctx_node_role[\s\S]*"commenter"/);
assert.match(appRoutes, /acl::paginate_reader_visible_items/);
assert.match(appRoutes, /acl::ensure_list_parent_reader\(&state\.pool, &ctx, space_id, None\)/);
assert.match(appRoutes, /list shared dr_drive_node failed/);

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
assert.match(driveFileService, /revokeShareLink/);
assert.doesNotMatch(driveFileService, /fetch\(/);

process.stdout.write('drive-alignment.integration.test.mjs passed\n');
