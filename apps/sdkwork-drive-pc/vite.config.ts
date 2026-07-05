import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_APP_API_PROXY_TARGET = 'http://127.0.0.1:3900';
const DEFAULT_ADMIN_API_PROXY_TARGET = 'http://127.0.0.1:18083';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const repoRoot = path.resolve(__dirname, '../..');
  const workspaceDependencyRoot = (dependencyId: string) =>
    path.resolve(repoRoot, '..', dependencyId);
  const appbaseRoot = process.env.SDKWORK_APPBASE_ROOT ?? workspaceDependencyRoot('sdkwork-appbase');
  const iamRoot = process.env.SDKWORK_IAM_ROOT ?? workspaceDependencyRoot('sdkwork-iam');
  const sdkCommonsRoot = process.env.SDKWORK_SDK_COMMONS_ROOT ?? workspaceDependencyRoot('sdkwork-sdk-commons');
  const utilsRoot = process.env.SDKWORK_UTILS_ROOT ?? workspaceDependencyRoot('sdkwork-utils');
  const uiRoot = process.env.SDKWORK_UI_PC_REACT_ROOT
    ?? path.resolve(workspaceDependencyRoot('sdkwork-ui'), 'sdkwork-ui-pc-react');
  const appApiProxyTarget =
    process.env.SDKWORK_DRIVE_DEV_APP_API_PROXY_TARGET
    || env.VITE_DRIVE_PC_PLATFORM_API_GATEWAY_HTTP_URL
    || env.VITE_DRIVE_PC_APP_API_BASE_URL
    || DEFAULT_APP_API_PROXY_TARGET;
  const adminApiProxyTarget =
    process.env.SDKWORK_DRIVE_DEV_ADMIN_API_PROXY_TARGET
    || env.VITE_DRIVE_PC_DRIVE_ADMIN_STORAGE_API_BASE_URL
    || env.VITE_DRIVE_PC_BACKEND_API_BASE_URL
    || DEFAULT_ADMIN_API_PROXY_TARGET;

  return {
    define: {
      'process.env.SDKWORK_ACCESS_TOKEN': JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ''),
    },
            plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
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
        'sdkwork-drive-pc-core/config/runtimeConfig': path.resolve(
          __dirname,
          'packages/sdkwork-drive-pc-core/src/config/runtimeConfig.ts',
        ),
        'sdkwork-drive-pc-core/session/sessionStore': path.resolve(
          __dirname,
          'packages/sdkwork-drive-pc-core/src/session/sessionStore.ts',
        ),
        '@sdkwork/appbase-pc-react': path.resolve(
          appbaseRoot,
          'packages/pc-react/foundation/sdkwork-appbase-pc-react/src/index.ts',
        ),
        '@sdkwork/auth-pc-react': path.resolve(
          iamRoot,
          'apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/index.ts',
        ),
        '@sdkwork/iam-app-sdk': path.resolve(
          iamRoot,
          'sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/src/index.ts',
        ),
        '@sdkwork/iam-backend-sdk': path.resolve(
          iamRoot,
          'sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-typescript/src/index.ts',
        ),
        '@sdkwork/auth-runtime-pc-react': path.resolve(
          iamRoot,
          'apps/sdkwork-iam-pc/packages/sdkwork-auth-runtime-pc-react/src/index.ts',
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
        '@sdkwork/core-pc-react': path.resolve(
          __dirname,
          'src/bootstrap/sdkworkCorePcReactShim.ts',
        ),
        '@sdkwork/i18n-pc-react': path.resolve(
          appbaseRoot,
          'packages/pc-react/foundation/sdkwork-i18n-pc-react/src/index.ts',
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
        '@sdkwork/runtime-bootstrap': path.resolve(
          appbaseRoot,
          'packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts',
        ),
        '@sdkwork/sdk-common': path.resolve(
          sdkCommonsRoot,
          'sdkwork-sdk-common-typescript/src/index.ts',
        ),
        '@sdkwork/utils': path.resolve(
          utilsRoot,
          'packages/sdkwork-utils-typescript/dist/index.js',
        ),
        '@sdkwork/ui-pc-react': path.resolve(uiRoot, 'src/index.ts'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: 'localhost',
      port: 5183,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/app/v3/api': {
          target: appApiProxyTarget,
          changeOrigin: true,
        },
        '/admin/v3/api': {
          target: adminApiProxyTarget,
          changeOrigin: true,
        },
        '/backend/v3/api': {
          target: adminApiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
