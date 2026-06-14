import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRuntimeConfig, type SdkworkDeploymentMode } from 'sdkwork-drive-pc-core';

const appRoot = path.resolve(__dirname, '..', '..');
const coreRoot = path.join(appRoot, 'packages', 'sdkwork-drive-pc-core');
const desktopRoot = path.join(appRoot, 'packages', 'sdkwork-drive-pc-desktop');
const repoRoot = path.resolve(appRoot, '..', '..');

function read(relativePath: string): string {
  return readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function readJson(relativePath: string): unknown {
  return JSON.parse(read(relativePath));
}

function listFiles(root: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (['node_modules', 'dist', 'target', 'src-tauri'].includes(entry)) {
        continue;
      }
      files.push(...listFiles(absolute, extensions));
      continue;
    }

    if (extensions.includes(path.extname(entry))) {
      files.push(absolute);
    }
  }
  return files;
}

function readAll(root: string): string {
  return listFiles(root)
    .map((file) => `\n// ${path.relative(appRoot, file)}\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

function forbiddenGenericSdkNames(): string[] {
  return [
    ['@sdkwork', 'app-sdk'].join('/'),
    ['@sdkwork', ['appbase', 'backend-sdk'].join('-')].join('/'),
    ['appbase', 'backend-sdk'].join('-'),
  ];
}

function forbiddenGenericSdkPattern(): RegExp {
  const escapedNames = forbiddenGenericSdkNames().map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return new RegExp(`${escapedNames.join('|')}|\\bfetch\\s*\\(`);
}

function resolvePnpmDirFromCommand(command: string, commandWorkingDirectory: string): string {
  const match = command.match(/\bpnpm\s+--dir\s+(\S+)/);
  if (!match) {
    throw new Error(`Command does not include pnpm --dir: ${command}`);
  }
  return path.resolve(commandWorkingDirectory, match[1]);
}

describe('desktop architecture contract', () => {
  it('keeps the root PC app as a thin bootstrap shell', () => {
    const app = read('src/App.tsx');
    const main = read('src/main.tsx');

    expect(app).toContain('createDrivePcRuntime');
    expect(app).toContain('DriveRuntimeProvider');
    expect(app).not.toMatch(/\bfetch\s*\(/);
    expect(app).not.toMatch(/__TAURI__|@tauri-apps\/api|invoke\s*\(/);
    expect(main).toContain('<App />');
  });

  it('provides a core package for config, sdk, session, host, services, and runtime providers', () => {
    for (const relativePath of [
      'packages/sdkwork-drive-pc-core/package.json',
      'packages/sdkwork-drive-pc-core/src/index.ts',
      'packages/sdkwork-drive-pc-core/src/config/runtimeConfig.ts',
      'packages/sdkwork-drive-pc-core/src/sdk/driveAppSdkClient.ts',
      'packages/sdkwork-drive-pc-core/src/sdk/driveAdminStorageSdkClient.ts',
      'packages/sdkwork-drive-pc-core/src/session/sessionStore.ts',
      'packages/sdkwork-drive-pc-core/src/auth/authGate.ts',
      'packages/sdkwork-drive-pc-core/src/host/hostAdapter.ts',
      'packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
      'packages/sdkwork-drive-pc-core/src/runtime/DriveRuntimeProvider.tsx',
    ]) {
      expect(existsSync(path.join(appRoot, relativePath)), `${relativePath} should exist`).toBe(true);
    }

    const coreSource = readAll(coreRoot);
    expect(coreSource).toContain("from '@sdkwork/drive-app-sdk'");
    expect(coreSource).toContain("from '@sdkwork/drive-admin-storage-sdk'");
    expect(coreSource).not.toContain('sdkwork-drive-app-sdk-typescript/generated/server-openapi');
    expect(coreSource).not.toContain('sdkwork-drive-app-sdk-typescript/composed/');
    expect(coreSource).not.toContain('sdkwork-drive-admin-storage-sdk-typescript/generated/server-openapi');
    expect(coreSource).not.toContain('sdkwork-drive-admin-storage-sdk-typescript/composed/');
    expect(coreSource).toContain('createDriveAppSdkClient');
    expect(coreSource).toContain('createDriveAdminStorageSdkClient');
    expect(coreSource).toContain('createSessionStore');
    expect(coreSource).toContain('resolveDriveAuthGateDecision');
    expect(coreSource).toContain('createHostAdapter');
    expect(coreSource).toContain('createDriveFileService');
  });

  it('declares scoped Drive SDK package facades in app and core component specs', () => {
    const appSpec = readJson('specs/component.spec.json') as {
      contracts: { sdkDependencies: Array<Record<string, unknown>> };
    };
    const coreSpec = readJson('packages/sdkwork-drive-pc-core/specs/component.spec.json') as {
      contracts: { sdkDependencies: Array<Record<string, unknown>> };
    };

    const packageNameFor = (
      spec: { contracts: { sdkDependencies: Array<Record<string, unknown>> } },
      workspace: string,
    ) => {
      const dependency = spec.contracts.sdkDependencies.find((item) =>
        item.workspace === workspace,
      ) as { packageByLanguage?: { typescript?: string } } | undefined;
      return dependency?.packageByLanguage?.typescript;
    };

    for (const spec of [appSpec, coreSpec]) {
      expect(packageNameFor(spec, 'sdkwork-drive-app-sdk')).toBe('@sdkwork/drive-app-sdk');
      expect(packageNameFor(spec, 'sdkwork-drive-admin-storage-sdk')).toBe(
        '@sdkwork/drive-admin-storage-sdk',
      );
    }
    expect(packageNameFor(appSpec, 'sdkwork-appbase-app-sdk')).toBe(
      '@sdkwork/appbase-app-sdk',
    );
  });

  it('protects product routes through an AuthGate without product-local login endpoints', () => {
    const app = read('src/App.tsx');
    const bootstrap = read('src/bootstrap/createDrivePcRuntime.ts');
    const runtimeProvider = read(
      'packages/sdkwork-drive-pc-core/src/runtime/DriveRuntimeProvider.tsx',
    );

    expect(app).toContain('AuthGate');
    expect(app).toContain('DriveAppbaseAuthRouteHost');
    expect(app).toContain('SdkworkIamAuthRoutes');
    expect(app).not.toMatch(/login\s*\(|refreshToken\s*\(|\/app\/v3\/api\/auth/);
    expect(bootstrap).not.toContain('authRoutes');
    const runtimeInterface = runtimeProvider.match(
      /export interface DriveRuntime \{[\s\S]*?\n\}/,
    )?.[0] ?? '';
    expect(runtimeInterface).not.toContain('authRoutes');
    expect(runtimeInterface).not.toContain('React.ReactNode');
    expect(bootstrap).not.toMatch(/login\s*\(|refreshToken\s*\(|\/app\/v3\/api\/auth/);

    const coreSource = readAll(coreRoot);
    expect(coreSource).toContain('/auth/login');
    expect(coreSource).toContain('host-managed');
    expect(coreSource).not.toContain('/app/v3/api/auth');
    expect(coreSource).not.toContain('/backend/v3/api/auth');
  });

  it('keeps appbase auth from pulling generic app SDK or backend SDK bootstrap into Drive PC', () => {
    const app = read('src/App.tsx');
    const viteConfig = read('vite.config.ts');
    const tsconfig = JSON.parse(readFileSync(path.join(appRoot, 'tsconfig.json'), 'utf8'));
    const corePackageJson = JSON.parse(
      readFileSync(path.join(coreRoot, 'package.json'), 'utf8'),
    );
    const coreSpec = readJson('packages/sdkwork-drive-pc-core/specs/component.spec.json') as {
      contracts: { publicExports: string[] };
    };
    const coreShimPath = path.join(appRoot, 'src', 'bootstrap', 'sdkworkCorePcReactShim.ts');
    const iamRuntimeSource = read('src/bootstrap/driveIamRuntime.ts');

    expect(app).toContain('SdkworkIamAuthRoutes');
    expect(viteConfig).toContain('sdkworkCorePcReactShim.ts');
    expect(viteConfig).toContain('@sdkwork/auth-runtime-pc-react');
    expect(viteConfig).toContain('sdkwork-auth-runtime-pc-react/src/index.ts');
    expect(viteConfig).toContain('@sdkwork/iam-runtime');
    expect(viteConfig).toContain('sdkwork-iam-runtime/src/index.ts');
    expect(viteConfig).not.toContain('driveIamRuntimeShim.ts');
    expect(viteConfig).not.toContain('@sdkwork/iam-sdk-adapter');
    expect(viteConfig).not.toContain(
      ['apps', 'sdkwork-core', 'sdkwork-core-pc-react'].join('/'),
    );
    expect(tsconfig.compilerOptions.paths['@sdkwork/core-pc-react']).toEqual([
      './src/bootstrap/sdkworkCorePcReactShim.ts',
    ]);
    expect(tsconfig.compilerOptions.paths['@sdkwork/auth-runtime-pc-react']).toEqual([
      '../../../sdkwork-appbase/packages/pc-react/iam/sdkwork-auth-runtime-pc-react/src/index.ts',
    ]);
    expect(tsconfig.compilerOptions.paths['@sdkwork/iam-runtime']).toEqual([
      '../../../sdkwork-appbase/packages/common/iam/sdkwork-iam-runtime/src/index.ts',
    ]);
    expect(tsconfig.compilerOptions.paths).not.toHaveProperty('@sdkwork/iam-sdk-adapter');
    expect(existsSync(coreShimPath)).toBe(true);

    const coreShimSource = readFileSync(coreShimPath, 'utf8');
    expect(corePackageJson.exports).toMatchObject({
      './config/runtimeConfig': {
        import: './src/config/runtimeConfig.ts',
        types: './src/config/runtimeConfig.ts',
      },
      './session/sessionStore': {
        import: './src/session/sessionStore.ts',
        types: './src/session/sessionStore.ts',
      },
    });
    expect(coreSpec.contracts.publicExports).toEqual(
      expect.arrayContaining(['.', './config/runtimeConfig', './session/sessionStore']),
    );
    expect(coreShimSource).toContain('getAppClientWithSession');
    expect(coreShimSource).toContain('readPcReactRuntimeSession');
    expect(coreShimSource).toContain('persistPcReactRuntimeSession');
    expect(coreShimSource).toContain('clearPcReactRuntimeSession');
    expect(coreShimSource).toContain('resolveAppClientAccessToken');
    expect(coreShimSource).toContain("from 'sdkwork-drive-pc-core/config/runtimeConfig'");
    expect(coreShimSource).toContain("from 'sdkwork-drive-pc-core/session/sessionStore'");
    expect(coreShimSource).not.toContain("from 'sdkwork-drive-pc-core'");

    expect(iamRuntimeSource).toContain('@sdkwork/auth-runtime-pc-react');
    expect(iamRuntimeSource).toContain('createSdkworkAppbasePcAuthRuntime');
    expect(iamRuntimeSource).not.toMatch(/@sdkwork\/iam-sdk-adapter|createIamSdkAdapters/);
    expect(iamRuntimeSource).not.toMatch(/\bcreateIamRuntime\(/);

    const forbiddenPattern = forbiddenGenericSdkPattern();
    expect(coreShimSource).not.toMatch(forbiddenPattern);
    expect(iamRuntimeSource).not.toMatch(forbiddenPattern);
  });

  it('keeps Drive embeddable without depending on appbase IAM packages in core or feature modules', () => {
    const appPackageJson = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
    const corePackageJson = JSON.parse(
      readFileSync(path.join(coreRoot, 'package.json'), 'utf8'),
    );
    const allPackageJson = listFiles(path.join(appRoot, 'packages'), ['.json']).filter((file) =>
      file.endsWith('package.json'),
    );

    expect(corePackageJson.peerDependencies).toMatchObject({
      react: expect.any(String),
      'react-dom': expect.any(String),
    });
    expect(corePackageJson.dependencies).not.toHaveProperty('@sdkwork/auth-pc-react');
    expect(corePackageJson.dependencies).not.toHaveProperty('@sdkwork/appbase-pc-react');

    for (const file of allPackageJson) {
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      const deps = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
      };
      expect(deps, path.relative(appRoot, file)).not.toHaveProperty('@sdkwork/auth-pc-react');
      expect(deps, path.relative(appRoot, file)).not.toHaveProperty('@sdkwork/appbase-pc-react');
    }

    const appDeps = {
      ...(appPackageJson.dependencies ?? {}),
      ...(appPackageJson.peerDependencies ?? {}),
    };
    expect(appDeps).toMatchObject({
      '@sdkwork/auth-pc-react': expect.any(String),
      '@sdkwork/appbase-pc-react': expect.any(String),
    });
    expect(appPackageJson.peerDependenciesMeta ?? {}).toMatchObject({
      '@sdkwork/auth-pc-react': { optional: true },
      '@sdkwork/appbase-pc-react': { optional: true },
    });
  });

  it('routes feature file workflows through an injected App SDK-backed file service boundary', () => {
    const drivePage = read('packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
    const fileBrowser = read('packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx');
    const driveFileService = read('packages/sdkwork-drive-pc-core/src/services/driveFileService.ts');
    const drivePageParams = drivePage.match(
      /export function DrivePage\(\{[\s\S]*?\}: DrivePageProps\)/,
    )?.[0] ?? '';

    expect(drivePage).toContain('fileService');
    expect(drivePage).not.toContain('mockDriveFileService');
    expect(drivePageParams).not.toMatch(/fileService\s*=/);
    expect(fileBrowser).toContain('fileService');
    expect(fileBrowser).not.toMatch(/from ['"]\.\.\/service\/file\.service['"]/);
    expect(fileBrowser).not.toContain('DemoStateSwitcher');
    expect(fileBrowser).not.toContain('getMockBehavior');
    expect(fileBrowser).not.toContain('files?.[0]');
    expect(fileBrowser).toContain('e.target.files ? Array.from(e.target.files) : []');
    expect(fileBrowser).toContain('multiple');
    expect(fileBrowser).toContain('fileService.uploadFile(file, activeSection, currentFolderId, {');
    expect(fileBrowser).toContain('signal: uploadController.signal');
    expect(fileBrowser).toContain('loadAbortControllerRef.current?.abort()');
    expect(fileBrowser).toContain('fileService.listFiles(activeSection, searchQuery, currentFolderId, {');
    expect(fileBrowser).toContain('fileService.getAllWorkspaceFiles({');
    expect(fileBrowser).toContain('fileService.getFolderPath(currentFolderId, {');
    expect(fileBrowser).toContain('signal: loadAbortController.signal');
    expect(fileBrowser).toContain('isDriveUploadAbortError(err)');
    expect(driveFileService).toContain('export interface DriveFileReadOptions');
    expect(driveFileService).toContain('getAllWorkspaceFiles(options?: DriveFileReadOptions)');
    expect(driveFileService).toContain('getFolderPath(folderId: string, options?: DriveFileReadOptions)');
    expect(driveFileService).toContain('options?: DriveFileReadOptions');
    expect(driveFileService).toContain('signal: options?.signal');
    expect(driveFileService).toContain('signal: options.signal');
    expect(fileBrowser).toContain('canUploadDriveFileToSection(activeSection)');
    expect(fileBrowser).toContain('canCreateDriveFolderInSection(activeSection)');
    expect(fileBrowser).not.toContain('activeSection !== "trash" && activeSection !== "computers"');
    expect(fileBrowser).not.toContain('activeSection !== "trash" &&');

    for (const retiredMockArtifact of [
      'packages/sdkwork-drive-pc-file/src/service/file.service.ts',
      'packages/sdkwork-drive-pc-file/src/service/file.mock.ts',
      'packages/sdkwork-drive-pc-file/src/components/DemoStateSwitcher.tsx',
      'packages/sdkwork-drive-pc-file/src/components/UploadModal.tsx',
    ]) {
      expect(
        existsSync(path.join(appRoot, retiredMockArtifact)),
        `${retiredMockArtifact} should not remain in the production feature package`,
      ).toBe(false);
    }
  });

  it('keeps file metadata mutations abortable through the App SDK-backed file service', () => {
    const fileBrowser = read('packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx');
    const fileDetailModal = read('packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx');
    const driveFileService = read('packages/sdkwork-drive-pc-core/src/services/driveFileService.ts');

    expect(driveFileService).toContain('setFolderColor(folderId: string, color?: string, options?: DriveFileWriteOptions)');
    expect(driveFileService).toContain('options?: DriveFileWriteOptions');
    expect(driveFileService).toContain('signal: options?.signal');
    expect(fileBrowser).toContain('fileWriteAbortControllersRef');
    expect(fileBrowser).toContain('createFileWriteAbortController');
    expect(fileBrowser).toContain('releaseFileWriteAbortController');
    expect(fileBrowser).toContain('fileWriteAbortControllersRef.current.forEach((controller) => controller.abort())');
    expect(fileBrowser).toContain('const batchDeleteController = createFileWriteAbortController("batch-delete")');
    expect(fileBrowser).toContain('signal: batchDeleteController.signal');
    expect(fileBrowser).toContain('const batchRestoreController = createFileWriteAbortController("batch-restore")');
    expect(fileBrowser).toContain('signal: batchRestoreController.signal');
    expect(fileBrowser).toContain('const batchStarController = createFileWriteAbortController("batch-star")');
    expect(fileBrowser).toContain('signal: batchStarController.signal');
    expect(fileBrowser).toContain('const starController = createFileWriteAbortController(`star-${fileId}`)');
    expect(fileBrowser).toContain('signal: starController.signal');
    expect(fileBrowser).toContain('const trashController = createFileWriteAbortController(`trash-${file.id}`)');
    expect(fileBrowser).toContain('signal: trashController.signal');
    expect(fileBrowser).toContain('const createFolderController = createFileWriteAbortController("create-folder")');
    expect(fileBrowser).toContain('signal: createFolderController.signal');
    expect(fileBrowser).toContain('const renameController = createFileWriteAbortController(`rename-${targetId}`)');
    expect(fileBrowser).toContain('signal: renameController.signal');
    expect(fileBrowser).toContain('const colorController = createFileWriteAbortController(`folder-color-${folderId}`)');
    expect(fileBrowser).toContain('signal: colorController.signal');
    expect(fileBrowser).toContain('isDriveUploadAbortError(err)');
    expect(fileDetailModal).toContain('headerRenameAbortControllerRef.current?.abort()');
    expect(fileDetailModal).toContain('const headerRenameAbortController = new AbortController()');
    expect(fileDetailModal).toContain('fileService.renameFile(file.id, trimmed, {');
    expect(fileDetailModal).toContain('signal: headerRenameAbortController.signal');
    expect(fileDetailModal).toContain('isDrivePreviewAbortError(err)');
  });

  it('keeps raw Tauri access out of web UI and feature packages', () => {
    const uiRoots = [
      path.join(appRoot, 'src'),
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-commons', 'src'),
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-file', 'src'),
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-transfer', 'src'),
    ];

    const offenders = uiRoots.flatMap((root) =>
      listFiles(root).filter((file) => {
        const source = readFileSync(file, 'utf8');
        return /@tauri-apps\/api|window\.__TAURI__|\binvoke\s*\(/.test(source);
      }),
    );

    expect(offenders.map((file) => path.relative(appRoot, file))).toEqual([]);
  });

  it('keeps the sidebar account entry single and anchors the profile menu near the top avatar', () => {
    const systemSidebar = read(
      'packages/sdkwork-drive-pc-commons/src/components/SystemSidebar.tsx',
    );
    const profileMenu = read(
      'packages/sdkwork-drive-pc-commons/src/components/UserProfileModal.tsx',
    );

    expect(systemSidebar.match(/title="账号菜单"/g) ?? []).toHaveLength(1);
    expect(systemSidebar.match(/<AccountAvatar/g) ?? []).toHaveLength(1);
    expect(profileMenu).toContain('top-12 left-16');
    expect(profileMenu).not.toContain('bottom-16 left-16');
  });

  it('keeps business HTTP and manual authorization headers out of UI and feature packages', () => {
    const featureRoots = [
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-commons', 'src'),
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-file', 'src'),
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-transfer', 'src'),
    ];

    const offenders = featureRoots.flatMap((root) =>
      listFiles(root).filter((file) => {
        const source = readFileSync(file, 'utf8');
        return /\bfetch\s*\(|Authorization\s*:|Bearer\s+\$\{/.test(source);
      }),
    );

    expect(offenders.map((file) => path.relative(appRoot, file))).toEqual([]);
  });

  it('keeps shared UI preference storage injected by the PC shell', () => {
    const commonsSource = readAll(
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-commons', 'src'),
    );
    const app = read('src/App.tsx');

    expect(commonsSource).not.toContain('localStorage');
    expect(commonsSource).not.toContain('sessionStorage');
    expect(app).toContain('createBrowserPreferenceStorage');
    expect(app).toContain('<LanguageProvider preferenceStorage={preferenceStorage}>');
    expect(app).toContain('<ThemeProvider preferenceStorage={preferenceStorage}>');
  });

  it('keeps Drive previews and actions on App SDK-backed data instead of local samples', () => {
    const featureSource = readAll(path.join(appRoot, 'packages', 'sdkwork-drive-pc-file', 'src'));

    for (const forbidden of [
      'uploadSimulatedFile',
      'commondatastorage.googleapis.com',
      'soundhelix.com',
      'images.unsplash.com',
      'localStorage',
      'defaultTextMap',
      'zipContents',
      'mock://drive',
    ]) {
      expect(featureSource).not.toContain(forbidden);
    }

    expect(featureSource).toContain('createDownloadUrl');
  });

  it('keeps ZIP archive preview and extraction on the Drive App SDK archive operations', () => {
    const zipModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/ZipModule.tsx',
    );
    const fileDetailModal = read('packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx');

    expect(zipModule).toContain('fileService: DriveFileService');
    expect(zipModule).toContain('fileService.listArchiveEntries');
    expect(zipModule).toContain('fileService.extractArchiveEntries');
    expect(zipModule).toContain('archiveListAbortController.abort()');
    expect(zipModule).toContain('extractionAbortControllerRef.current?.abort()');
    expect(zipModule).toContain('signal: archiveListAbortController.signal');
    expect(zipModule).toContain('signal: extractionAbortController.signal');
    expect(zipModule).toContain('isDriveArchiveAbortError');
    expect(zipModule).not.toContain('not exposed by the Drive App API');
    expect(zipModule).not.toContain('requires a backend extraction contract');
    expect(fileDetailModal).toContain('const isArchivePreview');
    expect(fileDetailModal).toContain('if (isArchivePreview)');
    expect(fileDetailModal).toContain('fileService={fileService}');
    expect(fileDetailModal).toContain('onExtracted={onRefreshFolderContent}');
  });

  it('limits Trash view item actions to restore, permanent delete, and read-only details', () => {
    const fileBrowser = read('packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx');
    const rowItem = read('packages/sdkwork-drive-pc-file/src/components/FileRowItem.tsx');
    const gridItem = read('packages/sdkwork-drive-pc-file/src/components/FileGridItem.tsx');
    const fileDetailModal = read('packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx');
    const textEditorModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/TextEditorModule.tsx',
    );
    const pdfModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/PdfModule.tsx',
    );
    const zipModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/ZipModule.tsx',
    );

    expect(fileBrowser).toContain('isTrashSection={activeSection === "trash"}');
    expect(rowItem).toContain('isTrashSection: isTrashSectionProp');
    expect(gridItem).toContain('isTrashSection: isTrashSectionProp');
    expect(rowItem).toMatch(/const isTrashSection = isTrashSectionProp \?\? activeSection === ["']trash["'];/);
    expect(gridItem).toMatch(/const isTrashSection = isTrashSectionProp \?\? activeSection === ["']trash["'];/);
    expect(rowItem).toContain('!isTrashSection &&');
    expect(gridItem).toContain('!isTrashSection &&');
    expect(fileDetailModal).toContain('isTrashSection = false');
    expect(fileDetailModal).toContain('{!isTrashSection && (');
    expect(fileDetailModal).toContain('isReadOnly={isTrashSection}');
    expect(textEditorModule).toContain('isReadOnly?: boolean');
    expect(textEditorModule).toContain('if (isReadOnly || isSavingContent) return;');
    expect(textEditorModule).toContain('readOnly: isReadOnly');
    expect(pdfModule).toContain('isReadOnly?: boolean');
    expect(pdfModule).toContain('{!isReadOnly && (');
    expect(zipModule).toContain('isReadOnly?: boolean');
    expect(zipModule).toContain('{!isReadOnly && (');
  });

  it('keeps PDF and Office preview actions on real Drive grants without placeholder API gaps', () => {
    const pdfModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/PdfModule.tsx',
    );
    const officeModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/OfficeModule.tsx',
    );
    const fileDetailModal = read('packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx');
    const textEditorModule = read(
      'packages/sdkwork-drive-pc-file/src/components/preview-modules/TextEditorModule.tsx',
    );

    expect(pdfModule).toContain('fileService: DriveFileService');
    expect(pdfModule).toContain('fileService.signPdfFile');
    expect(pdfModule).toContain('signAbortControllerRef.current?.abort()');
    expect(pdfModule).toContain('fileService.signPdfFile(file, {');
    expect(pdfModule).toContain('signal: signAbortController.signal');
    expect(pdfModule).toContain('isDrivePdfAbortError');
    expect(pdfModule).toContain('window.print()');
    expect(pdfModule).not.toContain('not exposed by the Drive App API');
    expect(officeModule).not.toContain('requires a backend conversion contract');
    expect(officeModule).not.toContain('does not expose a rendered Office preview');
    expect(fileDetailModal).toContain('fileService={fileService}');
    expect(fileDetailModal).toContain('const previewAbortController = new AbortController()');
    expect(fileDetailModal).toContain('signal: previewAbortController.signal');
    expect(fileDetailModal).toContain('previewAbortController.abort()');
    expect(textEditorModule).toContain('const contentAbortController = new AbortController()');
    expect(textEditorModule).toContain('signal: contentAbortController.signal');
    expect(textEditorModule).toContain('contentAbortController.abort()');
    expect(textEditorModule).toContain('saveAbortControllerRef.current?.abort()');
    expect(textEditorModule).toContain("fileService.saveFileText(file, wordTextValue, contentType || file.mimeType || 'text/plain', {");
    expect(textEditorModule).toContain('signal: saveAbortController.signal');
  });

  it('lazy-loads heavyweight preview modules outside the initial renderer chunk', () => {
    const fileDetailModal = read('packages/sdkwork-drive-pc-file/src/components/FileDetailModal.tsx');

    for (const previewModule of [
      'AudioModule',
      'ImageModule',
      'OfficeModule',
      'PdfModule',
      'TextEditorModule',
      'VideoModule',
      'ZipModule',
    ]) {
      expect(fileDetailModal).not.toContain(
        `import { ${previewModule} } from './preview-modules/${previewModule}'`,
      );
      expect(fileDetailModal).toContain(
        `React.lazy(() => import('./preview-modules/${previewModule}')`,
      );
    }

    expect(fileDetailModal).toContain('<React.Suspense');
    expect(fileDetailModal).toContain('PreviewModuleFallback');
  });

  it('lazy-loads route-sized PC feature modules outside the initial renderer chunk', () => {
    const app = read('src/App.tsx');
    const drivePage = read('packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');

    expect(app).not.toContain("import { DrivePage, DriveSection } from 'sdkwork-drive-pc-file'");
    expect(app).not.toContain("import { SdkworkIamAuthRoutes } from '@sdkwork/auth-pc-react'");
    expect(app).toMatch(/React\.lazy\(\(\) =>\s*import\('sdkwork-drive-pc-file'\)/);
    expect(app).toMatch(/React\.lazy\(\(\) =>\s*import\('@sdkwork\/auth-pc-react'\)/);
    expect(app).toContain('DriveWorkspaceFallback');
    expect(app).toContain('DriveAuthRoutesFallback');

    expect(drivePage).not.toContain("import { TransferPage } from 'sdkwork-drive-pc-transfer'");
    expect(drivePage).toMatch(/React\.lazy\(\(\) =>\s*import\('sdkwork-drive-pc-transfer'\)/);
    expect(drivePage).toContain('DriveTransferFallback');
    expect(drivePage).toContain('<React.Suspense');
  });

  it('keeps account and storage usage displays backed by Drive quota SDK data', () => {
    const app = read('src/App.tsx');
    const drivePage = read('packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
    const accountViewModel = read('src/bootstrap/driveAccountViewModel.ts');
    const systemSidebar = read('packages/sdkwork-drive-pc-commons/src/components/SystemSidebar.tsx');
    const settingsModal = read('packages/sdkwork-drive-pc-commons/src/components/SettingsModal.tsx');
    const fileSidebar = read('packages/sdkwork-drive-pc-file/src/components/FileSidebar.tsx');
    const driveFileService = read(
      'packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
    );
    const generatedSdk = readFileSync(
      path.join(
        repoRoot,
        'sdks',
        'sdkwork-drive-app-sdk',
        'sdkwork-drive-app-sdk-typescript',
        'composed',
        'operations.ts',
      ),
      'utf8',
    );

    expect(generatedSdk).toContain('"quotas.summary"');
    expect(driveFileService).toContain("operationId: 'quotas.summary'");
    expect(driveFileService).toContain('getStorageSummary(options?: DriveFileReadOptions)');
    expect(app).toContain('const storageAbortController = new AbortController()');
    expect(app).toContain('runtime.services.fileService');
    expect(app).toContain('.getStorageSummary({');
    expect(app).toContain('signal: storageAbortController.signal');
    expect(app).toContain('storageAbortController.abort()');
    expect(app).toContain('isDriveAppAbortError');
    expect(app).toContain("openSettings('storage')");
    expect(app).toContain('settingsInitialTab');
    expect(drivePage).toContain('onOpenStorageSettings');
    expect(fileSidebar).toContain('onOpenStorageSettings');
    expect(fileSidebar).toContain('onClick={onOpenStorageSettings}');
    expect(systemSidebar).toContain('isSettingsOpen');
    expect(systemSidebar).not.toContain('const [isSettingsOpen, setIsSettingsOpen]');
    expect(settingsModal).toContain('initialTab?: SettingsTab');
    expect(settingsModal).toContain("setActiveTab(initialTab)");

    for (const [label, source] of [
      ['account view model', accountViewModel],
      ['settings modal', settingsModal],
      ['file sidebar', fileSidebar],
    ] as const) {
      expect(source, label).not.toContain('Enterprise Drive');
      expect(source, label).not.toContain('45.5 GB');
      expect(source, label).not.toContain('100 GB');
      expect(source, label).not.toContain('w-[45.5%]');
    }
  });

  it('keeps storage provider administration on the generated Drive Admin Storage SDK service boundary', () => {
    const driveFileService = read(
      'packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
    );
    const appSdkClient = read(
      'packages/sdkwork-drive-pc-core/src/sdk/driveAppSdkClient.ts',
    );
    const adminStorageSdkClient = read(
      'packages/sdkwork-drive-pc-core/src/sdk/driveAdminStorageSdkClient.ts',
    );
    const generatedAdminStorageSdk = readFileSync(
      path.join(
        repoRoot,
        'sdks',
        'sdkwork-drive-admin-storage-sdk',
        'sdkwork-drive-admin-storage-sdk-typescript',
        'composed',
        'operations.ts',
      ),
      'utf8',
    );
    const generatedAppSdk = readFileSync(
      path.join(
        repoRoot,
        'sdks',
        'sdkwork-drive-app-sdk',
        'sdkwork-drive-app-sdk-typescript',
        'composed',
        'operations.ts',
      ),
      'utf8',
    );

    for (const operationId of [
      'storageProviders.list',
      'storageProviders.create',
      'storageProviders.get',
      'storageProviders.update',
      'storageProviders.delete',
      'storageProviders.test',
      'storageProviders.capabilities.get',
      'storageProviders.activate',
      'storageProviders.deactivate',
      'storageProviders.credentials.rotate',
      'storageProviders.bucket.head',
      'storageProviders.bucket.create',
      'storageProviders.bucket.delete',
      'storageProviders.objects.list',
      'storageProviders.objects.head',
      'storageProviders.objects.delete',
      'storageProviders.objects.copy',
      'storageProviderBindings.default.get',
      'storageProviderBindings.default.set',
      'storageProviderBindings.default.delete',
      'storageProviderBindings.list',
      'storageProviders.buckets.list',
    ]) {
      expect(generatedAdminStorageSdk).toContain(`"${operationId}"`);
      expect(generatedAppSdk).not.toContain(`"${operationId}"`);
      expect(driveFileService).toContain(`operationId: '${operationId}'`);
      expect(appSdkClient).not.toContain(`operationId: '${operationId}'`);
    }

    for (const method of [
      'listStorageProviders(status?: string, options?: DriveFileReadOptions)',
      'createStorageProvider(',
      'updateStorageProvider(',
      'deleteStorageProvider(providerId: string, options?: DriveFileWriteOptions)',
      'testStorageProvider(providerId: string, options?: DriveFileWriteOptions)',
      'getStorageProviderCapabilities(',
      'rotateStorageProviderCredential(',
      'headStorageProviderBucket(providerId: string, options?: DriveFileReadOptions)',
      'listStorageProviderObjects(',
      'headStorageProviderObject(',
      'copyStorageProviderObject(',
      'getDefaultStorageProviderBinding(',
      'setDefaultStorageProviderBinding(',
      'listStorageProviderBindings(',
      'deleteDefaultStorageProviderBinding(',
      'listStorageProviderBuckets(',
    ]) {
      expect(driveFileService).toContain(method);
    }

    expect(driveFileService).toContain('adminStorageSdkClient.request');
    expect(appSdkClient).toContain("from '@sdkwork/drive-app-sdk'");
    expect(adminStorageSdkClient).toContain("from '@sdkwork/drive-admin-storage-sdk'");
    expect(driveFileService).toContain('operatorId: identity.actorId');
    expect(driveFileService).toContain('tenantId: identity.tenantId');
    expect(driveFileService).not.toContain('fetch(');
    expect(driveFileService).not.toContain('axios');
  });

  it('places storage provider configuration in a PC internal admin package', () => {
    const app = read('src/App.tsx');
    const packageJson = read('package.json');
    const tsconfig = JSON.parse(read('tsconfig.json')) as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    const adminRoot = path.join(appRoot, 'packages', 'sdkwork-drive-pc-admin-storage-providers');

    for (const relativePath of [
      'package.json',
      'README.md',
      'specs/component.spec.json',
      'src/index.ts',
      'src/pages/StorageProvidersAdminPage.tsx',
      'src/services/storageProviderAdminService.ts',
      'src/types/storageProviderAdminTypes.ts',
      'src/routes/storageProviderAdminRoutes.ts',
      'tests/storageProviderAdminService.test.ts',
    ]) {
      expect(
        existsSync(path.join(adminRoot, relativePath)),
        `sdkwork-drive-pc-admin-storage-providers/${relativePath} should exist`,
      ).toBe(true);
    }

    const adminPackage = read(
      'packages/sdkwork-drive-pc-admin-storage-providers/package.json',
    );
    const adminSpec = readJson(
      'packages/sdkwork-drive-pc-admin-storage-providers/specs/component.spec.json',
    ) as {
      component: { name: string; capability: string };
      contracts: { sdkDependencies: Array<Record<string, unknown>> };
    };
    const adminSource = readAll(path.join(adminRoot, 'src'));

    expect(adminPackage).toContain('"name": "sdkwork-drive-pc-admin-storage-providers"');
    expect(adminSpec.component.name).toBe('sdkwork-drive-pc-admin-storage-providers');
    expect(adminSpec.component.capability).toBe('storage-providers');
    expect(adminSpec.contracts.sdkDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workspace: 'sdkwork-drive-admin-storage-sdk',
          packageByLanguage: expect.objectContaining({
            typescript: '@sdkwork/drive-admin-storage-sdk',
          }),
        }),
      ]),
    );

    expect(packageJson).toContain('"sdkwork-drive-pc-admin-storage-providers": "workspace:*"');
    expect(tsconfig.compilerOptions.paths['sdkwork-drive-pc-admin-storage-providers']).toEqual([
      './packages/sdkwork-drive-pc-admin-storage-providers/src',
    ]);
    expect(app).toContain("import('sdkwork-drive-pc-admin-storage-providers')");
    expect(app).toContain('admin-storage-providers');
    expect(app).toContain('runtime.sdk.adminStorage');
    expect(app).toContain('runtime.session.getSnapshot');
    expect(adminSource).toContain('adminStorageSdkClient.request');
    expect(adminSource).toContain("operationId: 'storageProviders.list'");
    expect(adminSource).toContain("operationId: 'storageProviders.create'");
    expect(adminSource).toContain("operationId: 'storageProviderBindings.default.set'");
    expect(adminSource).not.toMatch(/\bfetch\s*\(|axios\.|Authorization\s*:|Access-Token\s*:/);
    expect(adminSource).not.toContain('generated/server-openapi');
    expect(adminSource).not.toContain('sdkwork-drive-admin-storage-sdk-typescript');
    expect(adminSource).not.toContain('secretAccessKey');
    expect(adminSource).not.toContain('accessKeySecret');
  });

  it('keeps shared space management backed by abortable Drive App SDK spaces calls', () => {
    const drivePage = read('packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
    const driveFileService = read(
      'packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
    );

    expect(driveFileService).toContain('listSharedSpaces(options?: DriveFileReadOptions)');
    expect(driveFileService).toContain('createSharedSpace(');
    expect(driveFileService).toContain('options?: DriveFileWriteOptions');
    expect(driveFileService).toContain('deleteSharedSpace(id: string, options?: DriveFileWriteOptions)');
    expect(driveFileService).toContain("operationId: 'spaces.list'");
    expect(driveFileService).toContain("operationId: 'spaces.create'");
    expect(driveFileService).toContain("operationId: 'spaces.delete'");
    expect(driveFileService).toContain('signal: options?.signal');
    expect(drivePage).toContain('sharedSpaceListAbortControllerRef.current?.abort()');
    expect(drivePage).toContain('createSpaceAbortControllerRef.current?.abort()');
    expect(drivePage).toContain('deleteSpaceAbortControllerRef.current?.abort()');
    expect(drivePage).toContain('fileService.listSharedSpaces({');
    expect(drivePage).toContain('signal: sharedSpaceListAbortController.signal');
    expect(drivePage).toContain('fileService.createSharedSpace(name, icon, color, description, {');
    expect(drivePage).toContain('signal: createSpaceAbortController.signal');
    expect(drivePage).toContain('fileService.deleteSharedSpace(id, {');
    expect(drivePage).toContain('signal: deleteSpaceAbortController.signal');
    expect(drivePage).toContain('isDrivePageAbortError');
    expect(drivePage).toContain('isMountedRef.current');
  });

  it('keeps user-facing locale copy free of demo, mock, and simulation wording', () => {
    const localeSource = readAll(
      path.join(appRoot, 'packages', 'sdkwork-drive-pc-commons', 'src', 'i18n', 'locales'),
    );

    for (const forbidden of [
      'High-Fidelity Simulated Upload',
      'Mock high-performance',
      'Simulate file uploads',
      'Simulation Type',
      'Mock Service Behavior',
      'Reset Mock Data DB',
      'Upload simulation failed',
      'Mock database',
      'mock DB',
      'Simulated print',
      'Simulate print',
      'simulated compressed',
      'PDF Mock',
      'simulatedSpeed',
      'resumeSimulate',
      'pauseSimulate',
      'retrySimulation',
      'Leader Me',
      'Cloud Agent',
      'Backup Cron',
      'WORKSPACE ENCRYPTED INTERNAL REPORT',
    ]) {
      expect(localeSource).not.toContain(forbidden);
    }

    expect(localeSource).toContain('transferState');
    expect(localeSource).toContain('ready');
  });

  it('does not expose local demo data switches or mock-mode documentation', () => {
    const appSources = [
      read('README.md'),
      read('.env.example'),
      read('src/vite-env.d.ts'),
      read('packages/sdkwork-drive-pc-core/src/config/runtimeConfig.ts'),
    ].join('\n');

    for (const forbidden of [
      'VITE_DRIVE_USE_LOCAL_DEMO_DATA',
      'useLocalDemoData',
      'tenant-local-demo',
      'user-local-demo',
      'mock/demo',
      'UI-only demo',
      'mock file service',
      'local-demo IAM',
    ]) {
      expect(appSources).not.toContain(forbidden);
    }
  });

  it('keeps production service identifiers off Math.random fallbacks', () => {
    const driveFileService = read(
      'packages/sdkwork-drive-pc-core/src/services/driveFileService.ts',
    );

    expect(driveFileService).not.toContain('Math.random');
    expect(driveFileService).toContain('getRandomValues');
  });

  it('keeps transfer activity driven by App SDK grants instead of frontend progress simulation', () => {
    const drivePage = read('packages/sdkwork-drive-pc-file/src/pages/DrivePage.tsx');
    const fileBrowser = read('packages/sdkwork-drive-pc-file/src/components/FileBrowser.tsx');
    const fileSidebar = read('packages/sdkwork-drive-pc-file/src/components/FileSidebar.tsx');
    const downloadManager = read('packages/sdkwork-drive-pc-file/src/components/DownloadManager.tsx');
    const driveFileService = read('packages/sdkwork-drive-pc-core/src/services/driveFileService.ts');
    const transferJobs = read('packages/sdkwork-drive-pc-types/src/transferJobs.ts');
    const transferPage = read('packages/sdkwork-drive-pc-transfer/src/pages/TransferPage.tsx');
    const transferSource = `${drivePage}\n${fileBrowser}\n${fileSidebar}\n${downloadManager}\n${transferJobs}\n${transferPage}`;

    expect(drivePage).not.toContain('tickTransferJobs');
    expect(drivePage).not.toContain('setInterval');
    expect(transferJobs).not.toContain('Math.random');
    expect(transferJobs).not.toContain('randomSpeed');
    expect(transferJobs).not.toContain('tickTransferJobs');
    expect(transferPage).not.toContain('simulatedSpeed');
    expect(transferPage).not.toContain('resumeSimulate');
    expect(transferPage).not.toContain('pauseSimulate');
    expect(transferPage).not.toContain('retrySimulation');
    expect(transferPage).not.toContain("status: 'connecting', \n      progress: 0");
    expect(transferPage).toContain("job.status === 'ready'");
    expect(transferPage).toContain("t('downloadManager.ready')");
    expect(transferSource).toContain('applyDownloadGrantToJob');
    expect(transferSource).toContain('applyUploadCompletionToJob');
    expect(transferSource).toContain('canCancelTransferJob');
    expect(transferSource).toContain('canPauseTransferJob');
    expect(transferSource).toContain('canResumeTransferJob');
    expect(transferPage).not.toContain('cancelTransferJob,');
    expect(transferPage).not.toContain("return { ...j, status: 'cancelled'");
    expect(transferPage).not.toContain('setDownloadJobs(prev => prev.map(j => j.id === id ? cancelTransferJob(j) : j))');
    expect(driveFileService).not.toContain('uploadBlobToExistingNode');
    expect(driveFileService).not.toContain("operationId: 'uploadSessions.create'");
    expect(driveFileService).not.toContain("operationId: 'uploadSessions.abort'");
    expect(driveFileService).toContain('appSdkClient.uploader.replaceNodeContent');
    expect(driveFileService).toContain('signal: options?.signal');
    expect(drivePage).toContain('uploadAbortControllersRef');
    expect(drivePage).toContain('downloadAbortControllersRef');
    expect(drivePage).toContain('new AbortController()');
    expect(drivePage).toContain('.abort()');
    expect(drivePage).toContain('createUploadAbortController');
    expect(drivePage).toContain('releaseUploadAbortController');
    expect(drivePage).toContain('createDownloadAbortController');
    expect(drivePage).toContain('releaseDownloadAbortController');
    expect(drivePage).toContain('downloadAbortControllersRef.current.get(job.id)?.abort();');
    expect(drivePage.indexOf('if (isDrivePageAbortError(err))')).toBeLessThan(
      drivePage.indexOf("applyTransferFailure(item, err?.message || 'Failed to retry transfer')"),
    );
    expect(drivePage).toContain('downloadAbortControllersRef.current.get(job.id) !== downloadController');
    expect(drivePage).toContain('releaseDownloadAbortController(job.id, downloadController);');
    expect(fileBrowser).toContain('createUploadAbortController(newUploadJob.id)');
    expect(fileBrowser).toContain('releaseUploadAbortController(newUploadJob.id)');
    expect(fileBrowser).toContain('createDownloadAbortController(newJob.id)');
    expect(fileBrowser).toContain('releaseDownloadAbortController(newJob.id)');
    expect(transferPage).toContain('onCancelJob: (id: string) => void');
    expect(transferPage).toContain('onCancelJob(id)');
    expect(transferPage).toContain('onRetryJob: (job: DownloadJob) => void');
    expect(transferPage).toContain('onRetryJob(job)');
    expect(transferPage).not.toContain('onRetryJob?:');
    expect(transferPage).not.toContain('onRetryJob?.');
    expect(transferPage).not.toContain('&& onRetryJob &&');
    expect(downloadManager).toContain('onRetryJob: (job: DownloadJob) => void');
    expect(downloadManager).not.toContain('onRetryJob?:');
    expect(downloadManager).not.toContain('&& onRetryJob &&');
    expect(transferPage).toMatch(
      /const handleClearAll = \(\) => \{\s*downloadJobs\s*\.filter\(\(job\) => isActiveTransferStatus\(job\.status\)\)\s*\.forEach\(\(job\) => onCancelJob\(job\.id\)\);\s*setDownloadJobs\(\[\]\);\s*\};/,
    );
    expect(downloadManager).toContain('canCancelTransferJob');
    expect(downloadManager).toContain('canPauseTransferJob');
    expect(downloadManager).toContain('canResumeTransferJob');
    expect(downloadManager).toContain("case 'uploading'");
    expect(downloadManager).toContain('activeUploadCount');
    expect(downloadManager).toContain('isWorking && (');
    expect(downloadManager).not.toContain("job.status === 'downloading' &&");
    expect(fileSidebar).toContain("else if (job.status === 'uploading')");
    expect(fileSidebar).toContain("job.status === 'uploading' ? job.speed");
    expect(transferPage).toContain("case 'uploading'");
    expect(transferPage).toContain("j.status === 'downloading' || j.status === 'uploading'");
    expect(transferPage).toContain("job.status === 'uploading' ? `${job.speed} - ${job.timeRemaining}`");
    expect(fileBrowser).not.toContain('cancelTransferJob');
    expect(fileBrowser).toContain('onRetryJob: (job: DownloadJob) => void');
    expect(fileBrowser).toContain('onCancelJob: (id: string) => void');
    expect(fileBrowser).not.toContain('Original Drive item is no longer available for retry.');
    expect(fileBrowser).not.toContain('onPauseJob={(id)');
    expect(fileBrowser).not.toContain('onResumeJob={(id)');
    expect(fileBrowser).not.toContain('status: "downloading", speed: "Resuming..."');
    expect(fileSidebar).toContain('canCancelTransferJob');
    expect(fileSidebar).toContain('canPauseTransferJob');
    expect(fileSidebar).toContain('canResumeTransferJob');
  });

  it('owns Tauri native code and permissions in a desktop package', () => {
    for (const relativePath of [
      'packages/sdkwork-drive-pc-desktop/package.json',
      'packages/sdkwork-drive-pc-desktop/src-tauri/tauri.conf.json',
      'packages/sdkwork-drive-pc-desktop/src-tauri/src/main.rs',
      'packages/sdkwork-drive-pc-desktop/src-tauri/capabilities/default.json',
      'packages/sdkwork-drive-pc-desktop/src-tauri/permissions/default.toml',
    ]) {
      expect(existsSync(path.join(appRoot, relativePath)), `${relativePath} should exist`).toBe(true);
    }

    const tauriConfig = JSON.parse(
      readFileSync(path.join(desktopRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
    );

    expect(tauriConfig.build.devUrl).toBe('http://localhost:5183');
    expect(tauriConfig.build.frontendDist).toBe('../../../dist');
    expect(resolvePnpmDirFromCommand(tauriConfig.build.beforeDevCommand, desktopRoot)).toBe(
      appRoot,
    );
    expect(resolvePnpmDirFromCommand(tauriConfig.build.beforeBuildCommand, desktopRoot)).toBe(
      appRoot,
    );
    expect(tauriConfig.app.windows[0]).toMatchObject({
      label: 'main',
      title: 'SDKWork Drive',
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 680,
    });
    expect(tauriConfig.identifier).toBe('com.sdkwork.drive.pc');
  });

  it('exposes top-level workspace commands for server, PC renderer, and Tauri shell', () => {
    const rootPackageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const appPackageJson = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
    const tauriConfig = JSON.parse(
      readFileSync(
        path.join(desktopRoot, 'src-tauri', 'tauri.conf.json'),
        'utf8',
      ),
    );

    expect(rootPackageJson.scripts.dev).toBe(
      'node scripts/run-drive-pc-dev.mjs --target browser --database postgres',
    );
    expect(rootPackageJson.scripts['dev:pc']).toBe('pnpm --dir apps/sdkwork-drive-pc dev');
    expect(rootPackageJson.scripts['tauri:dev']).toBe(
      'node scripts/run-drive-pc-dev.mjs --target desktop --database sqlite',
    );
    expect(rootPackageJson.scripts['dev:server']).toBe(
      'node scripts/run-drive-api-server.mjs server --dev-env-file .env.postgres',
    );
    expect(appPackageJson.scripts.dev).toBe(
      'vite --host 127.0.0.1 --port 5183 --strictPort',
    );
    expect(tauriConfig.build.devUrl).toBe('http://localhost:5183');
  });

  it('keeps localhost API defaults limited to local and test deployment modes', () => {
    const localConfig = createRuntimeConfig({ VITE_DRIVE_PC_DEPLOYMENT_MODE: 'local' });
    expect(localConfig.appApiBaseUrl).toBe('http://127.0.0.1:3900');
    expect(localConfig.adminStorageApiBaseUrl).toBe('http://127.0.0.1:3900');
    expect(localConfig).not.toHaveProperty('useLocalDemoData');

    for (const mode of ['desktop', 'private', 'saas', 'web'] satisfies SdkworkDeploymentMode[]) {
      const config = createRuntimeConfig({ VITE_DRIVE_PC_DEPLOYMENT_MODE: mode });
      expect(config.appApiBaseUrl, `${mode} should not default to localhost`).not.toMatch(
        /localhost|127\.0\.0\.1/,
      );
      expect(config.adminStorageApiBaseUrl, `${mode} admin storage should not default to localhost`).not.toMatch(
        /localhost|127\.0\.0\.1/,
      );
      expect(config, `${mode} should not expose local demo data switches`).not.toHaveProperty(
        'useLocalDemoData',
      );
    }
  });

  it('does not edit generated SDK output from the PC app', () => {
    const generatedSdk = path.join(
      repoRoot,
      'sdks',
      'sdkwork-drive-app-sdk',
      'sdkwork-drive-app-sdk-typescript',
      'generated',
      'server-openapi',
      'src',
      'index.ts',
    );
    const composedOperations = path.join(
      repoRoot,
      'sdks',
      'sdkwork-drive-app-sdk',
      'sdkwork-drive-app-sdk-typescript',
      'composed',
      'operations.ts',
    );
    const generatedSource = readFileSync(generatedSdk, 'utf8');
    const composedSource = readFileSync(composedOperations, 'utf8');

    expect(generatedSource).not.toContain('export const sdkMetadata');
    expect(generatedSource).not.toContain('"nodes.list"');
    expect(generatedSource).not.toContain('createDrivePcRuntime');
    expect(composedSource).toContain('export const sdkMetadata');
    expect(composedSource).toContain('"nodes.list"');
  });

  it('uses canonical SDK family names for generated Drive SDK artifacts', () => {
    for (const sdkName of [
      'sdkwork-drive-sdk',
      'sdkwork-drive-app-sdk',
      'sdkwork-drive-backend-sdk',
      'sdkwork-drive-admin-storage-sdk',
    ]) {
      const script = path.join(repoRoot, 'sdks', sdkName, 'bin', 'generate-sdk.mjs');
      const generated = path.join(
        repoRoot,
        'sdks',
        sdkName,
        `${sdkName}-typescript`,
        'generated',
        'server-openapi',
        'sdkwork-sdk.json',
      );
      const familyManifest = path.join(repoRoot, 'sdks', sdkName, 'sdk-manifest.json');
      const generatedManifest = JSON.parse(readFileSync(generated, 'utf8'));
      const sdkManifest = JSON.parse(readFileSync(familyManifest, 'utf8'));

      expect(existsSync(script), `${sdkName} generator should exist`).toBe(true);
      expect(generatedManifest.name).toBe(sdkName);
      expect(sdkManifest.sdkName).toBe(sdkName);
      expect(generatedManifest.name).not.toMatch(/sdkwork-drive-(open|app|backend)-api/);
      expect(sdkManifest.sdkName).not.toMatch(/^drive-(open|app|backend)-sdk$/);
    }

    for (const retiredName of [
      'sdkwork-router-drive-open-api',
      'sdkwork-router-drive-app-api',
      'sdkwork-router-drive-backend-api',
      'drive-open-sdk',
      'drive-app-sdk',
      'drive-backend-sdk',
    ]) {
      expect(
        existsSync(path.join(repoRoot, 'sdks', retiredName)),
        `${retiredName} should not be an SDK family directory`,
      ).toBe(false);
    }
  });
});
