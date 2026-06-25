import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const workspaceDependencyRoot = (dependencyId: string) =>
  path.resolve(repoRoot, '..', dependencyId);
const appbaseRoot = process.env.SDKWORK_APPBASE_ROOT ?? workspaceDependencyRoot('sdkwork-appbase');
const iamRoot = process.env.SDKWORK_IAM_ROOT ?? workspaceDependencyRoot('sdkwork-iam');
const sdkCommonsRoot = process.env.SDKWORK_SDK_COMMONS_ROOT ?? workspaceDependencyRoot('sdkwork-sdk-commons');
const utilsRoot = process.env.SDKWORK_UTILS_ROOT ?? workspaceDependencyRoot('sdkwork-utils');
const uiRoot = process.env.SDKWORK_UI_PC_REACT_ROOT
  ?? path.resolve(workspaceDependencyRoot('sdkwork-ui'), 'sdkwork-ui-pc-react');

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      '@': path.resolve(__dirname, '.'),
      'sdkwork-drive-pc-types': path.resolve(__dirname, 'packages/sdkwork-drive-pc-types/src'),
      'sdkwork-drive-pc-commons': path.resolve(__dirname, 'packages/sdkwork-drive-pc-commons/src'),
      'sdkwork-drive-pc-file': path.resolve(__dirname, 'packages/sdkwork-drive-pc-file/src'),
      'sdkwork-drive-pc-transfer': path.resolve(__dirname, 'packages/sdkwork-drive-pc-transfer/src'),
      'sdkwork-drive-pc-core': path.resolve(__dirname, 'packages/sdkwork-drive-pc-core/src'),
      'sdkwork-drive-pc-drive': path.resolve(__dirname, 'packages/sdkwork-drive-pc-drive/src'),
      'sdkwork-drive-pc-admin-core': path.resolve(__dirname, 'packages/sdkwork-drive-pc-admin-core/src'),
      'sdkwork-drive-pc-admin-storage-providers': path.resolve(
        __dirname,
        'packages/sdkwork-drive-pc-admin-storage-providers/src',
      ),
      'sdkwork-drive-pc-admin-operations': path.resolve(
        __dirname,
        'packages/sdkwork-drive-pc-admin-operations/src',
      ),
      '@sdkwork/appbase-pc-react': path.resolve(
        appbaseRoot,
        'packages/pc-react/foundation/sdkwork-appbase-pc-react/src/index.ts',
      ),
      '@sdkwork/auth-pc-react': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/index.ts',
      ),
      '@sdkwork/auth-runtime-pc-react': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-pc/packages/sdkwork-auth-runtime-pc-react/src/index.ts',
      ),
      '@sdkwork/iam-app-sdk': path.resolve(
        iamRoot,
        'sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/index.ts',
      ),
      '@sdkwork/iam-backend-sdk': path.resolve(
        iamRoot,
        'sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-typescript/generated/server-openapi/src/index.ts',
      ),
      '@sdkwork/iam-contracts': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-common/packages/sdkwork-iam-contracts/src/index.ts',
      ),
      '@sdkwork/iam-runtime': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-common/packages/sdkwork-iam-runtime/src/index.ts',
      ),
      '@sdkwork/iam-sdk-ports': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-common/packages/sdkwork-iam-sdk-ports/src/index.ts',
      ),
      '@sdkwork/iam-service': path.resolve(
        iamRoot,
        'apps/sdkwork-iam-common/packages/sdkwork-iam-service/src/index.ts',
      ),
      '@sdkwork/drive-app-sdk': path.resolve(
        repoRoot,
        'sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/src/index.ts',
      ),
      '@sdkwork/drive-admin-storage-sdk': path.resolve(
        repoRoot,
        'sdks/sdkwork-drive-admin-storage-sdk/sdkwork-drive-admin-storage-sdk-typescript/src/index.ts',
      ),
      '@sdkwork/drive-backend-sdk': path.resolve(
        repoRoot,
        'sdks/sdkwork-drive-backend-sdk/sdkwork-drive-backend-sdk-typescript/src/index.ts',
      ),
      '@sdkwork/core-pc-react': path.resolve(__dirname, 'src/bootstrap/sdkworkCorePcReactShim.ts'),
      '@sdkwork/runtime-bootstrap': path.resolve(
        appbaseRoot,
        'packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts',
      ),
      '@sdkwork/sdk-common': path.resolve(sdkCommonsRoot, 'sdkwork-sdk-common-typescript/src/index.ts'),
      '@sdkwork/utils': path.resolve(utilsRoot, 'packages/sdkwork-utils-typescript/dist/index.js'),
      '@sdkwork/ui-pc-react': path.resolve(uiRoot, 'src/index.ts'),
    },
  },
});
