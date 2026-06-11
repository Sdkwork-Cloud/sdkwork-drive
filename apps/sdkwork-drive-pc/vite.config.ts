import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repoRoot = path.resolve(__dirname, '../..');
  const workspaceDependencyRoot = (dependencyId: string) =>
    path.resolve(repoRoot, '..', dependencyId);
  const appbaseRoot = process.env.SDKWORK_APPBASE_ROOT ?? workspaceDependencyRoot('sdkwork-appbase');
  const sdkCommonsRoot = process.env.SDKWORK_SDK_COMMONS_ROOT ?? workspaceDependencyRoot('sdkwork-sdk-commons');
  const uiRoot = process.env.SDKWORK_UI_PC_REACT_ROOT
    ?? path.resolve(workspaceDependencyRoot('sdkwork-ui'), 'sdkwork-ui-pc-react');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'sdkwork-drive-pc-types': path.resolve(__dirname, 'packages/sdkwork-drive-pc-types/src'),
        'sdkwork-drive-pc-commons': path.resolve(__dirname, 'packages/sdkwork-drive-pc-commons/src'),
        'sdkwork-drive-pc-file': path.resolve(__dirname, 'packages/sdkwork-drive-pc-file/src'),
        'sdkwork-drive-pc-transfer': path.resolve(__dirname, 'packages/sdkwork-drive-pc-transfer/src'),
        'sdkwork-drive-pc-core': path.resolve(__dirname, 'packages/sdkwork-drive-pc-core/src'),
        'sdkwork-drive-pc-admin-storage-providers': path.resolve(
          __dirname,
          'packages/sdkwork-drive-pc-admin-storage-providers/src',
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
          appbaseRoot,
          'packages/pc-react/iam/sdkwork-auth-pc-react/src/index.ts',
        ),
        '@sdkwork/appbase-app-sdk': path.resolve(
          appbaseRoot,
          'sdks/sdkwork-appbase-app-sdk/sdkwork-appbase-app-sdk-typescript/generated/server-openapi/src/index.ts',
        ),
        '@sdkwork/appbase-backend-sdk': path.resolve(
          appbaseRoot,
          'sdks/sdkwork-appbase-backend-sdk/sdkwork-appbase-backend-sdk-typescript/generated/server-openapi/src/index.ts',
        ),
        '@sdkwork/auth-runtime-pc-react': path.resolve(
          appbaseRoot,
          'packages/pc-react/iam/sdkwork-auth-runtime-pc-react/src/index.ts',
        ),
        '@sdkwork/drive-app-sdk': path.resolve(
          repoRoot,
          'sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/src/index.ts',
        ),
        '@sdkwork/drive-admin-storage-sdk': path.resolve(
          repoRoot,
          'sdks/sdkwork-drive-admin-storage-sdk/sdkwork-drive-admin-storage-sdk-typescript/src/index.ts',
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
          appbaseRoot,
          'packages/common/iam/sdkwork-iam-contracts/src/index.ts',
        ),
        '@sdkwork/iam-runtime': path.resolve(
          appbaseRoot,
          'packages/common/iam/sdkwork-iam-runtime/src/index.ts',
        ),
        '@sdkwork/iam-sdk-ports': path.resolve(
          appbaseRoot,
          'packages/common/iam/sdkwork-iam-sdk-ports/src/index.ts',
        ),
        '@sdkwork/iam-service': path.resolve(
          appbaseRoot,
          'packages/common/iam/sdkwork-iam-service/src/index.ts',
        ),
        '@sdkwork/runtime-bootstrap': path.resolve(
          appbaseRoot,
          'packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts',
        ),
        '@sdkwork/sdk-common': path.resolve(
          sdkCommonsRoot,
          'sdkwork-sdk-common-typescript/src/index.ts',
        ),
        '@sdkwork/ui-pc-react': path.resolve(uiRoot, 'src/index.ts'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
