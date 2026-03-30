import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ROOT_PATHS = [
  'docs',
  'package.json',
  'packages',
  'scripts/build-sdkwork-drive-release-sdks.mjs',
  'scripts/materialize-sdkwork-drive-release-sdks.mjs',
  'pnpm-workspace.yaml',
  'scripts/prepare-sdkwork-drive-release-workspace.mjs',
  'scripts/run-sdkwork-drive-desktop-release.mjs',
  'scripts/sdkwork-drive-desktop-release-targets.mjs',
  'tsconfig.base.json',
  'turbo.json',
];

const REQUIRED_PACKAGES = {
  'sdkwork-drive-auth': {
    packageName: '@sdkwork/drive-auth',
    requiredSrcDirs: ['components', 'pages', 'services'],
  },
  'sdkwork-drive-commons': {
    packageName: '@sdkwork/drive-commons',
    requiredSrcDirs: [],
  },
  'sdkwork-drive-core': {
    packageName: '@sdkwork/drive-core',
    requiredSrcDirs: ['runtime', 'sdk', 'services', 'stores'],
  },
  'sdkwork-drive-desktop': {
    packageName: '@sdkwork/drive-desktop',
    requiredSrcDirs: ['desktop'],
    requiredPaths: [
      'index.html',
      'vite.config.ts',
      'src/vite-env.d.ts',
      'src/desktop/catalog.ts',
      'src/desktop/runtime.ts',
      'src/desktop/tauriBridge.ts',
      'src/desktop/providers/DesktopProviders.tsx',
      'src/desktop/bootstrap/createDesktopApp.tsx',
      'src/desktop/bootstrap/DesktopBootstrapApp.tsx',
      'src/desktop/bootstrap/DesktopTrayRouteBridge.tsx',
      'src-tauri/Cargo.toml',
      'src-tauri/build.rs',
      'src-tauri/tauri.conf.json',
      'src-tauri/app-icon.svg',
      'src-tauri/icons',
      'src-tauri/capabilities/default.json',
      'src-tauri/src/app',
      'src-tauri/src/app/bootstrap.rs',
      'src-tauri/src/app/mod.rs',
      'src-tauri/src/commands',
      'src-tauri/src/commands/app_info.rs',
      'src-tauri/src/commands/downloads.rs',
      'src-tauri/src/commands/filesystem.rs',
      'src-tauri/src/commands/mod.rs',
      'src-tauri/src/platform',
      'src-tauri/src/platform/mod.rs',
      'src-tauri/src/state',
      'src-tauri/src/state/mod.rs',
      'src-tauri/src/main.rs',
      'src-tauri/src/lib.rs',
    ],
  },
  'sdkwork-drive-drive': {
    packageName: '@sdkwork/drive-drive',
    requiredSrcDirs: ['components', 'entities', 'pages', 'services', 'store', 'utils'],
  },
  'sdkwork-drive-i18n': {
    packageName: '@sdkwork/drive-i18n',
    requiredSrcDirs: ['locales'],
  },
  'sdkwork-drive-shell': {
    packageName: '@sdkwork/drive-shell',
    requiredSrcDirs: ['application', 'components', 'styles'],
  },
  'sdkwork-drive-types': {
    packageName: '@sdkwork/drive-types',
    requiredSrcDirs: [],
  },
  'sdkwork-drive-ui': {
    packageName: '@sdkwork/drive-ui',
    requiredSrcDirs: ['components', 'lib'],
  },
  'sdkwork-drive-user': {
    packageName: '@sdkwork/drive-user',
    requiredSrcDirs: ['pages'],
  },
  'sdkwork-drive-web': {
    packageName: '@sdkwork/drive-web',
    requiredSrcDirs: [],
  },
};

const ALLOWED_LOCAL_DEPENDENCIES = {
  '@sdkwork/drive-auth': new Set([
    '@sdkwork/drive-core',
    '@sdkwork/drive-ui',
  ]),
  '@sdkwork/drive-commons': new Set(),
  '@sdkwork/drive-core': new Set([
    '@sdkwork/drive-commons',
    '@sdkwork/drive-i18n',
  ]),
  '@sdkwork/drive-desktop': new Set([
    '@sdkwork/drive-core',
    '@sdkwork/drive-shell',
  ]),
  '@sdkwork/drive-drive': new Set([
    '@sdkwork/drive-commons',
    '@sdkwork/drive-core',
    '@sdkwork/drive-ui',
  ]),
  '@sdkwork/drive-i18n': new Set(),
  '@sdkwork/drive-shell': new Set([
    '@sdkwork/drive-auth',
    '@sdkwork/drive-core',
    '@sdkwork/drive-drive',
    '@sdkwork/drive-i18n',
    '@sdkwork/drive-ui',
    '@sdkwork/drive-user',
  ]),
  '@sdkwork/drive-types': new Set(),
  '@sdkwork/drive-ui': new Set(),
  '@sdkwork/drive-user': new Set([
    '@sdkwork/drive-core',
    '@sdkwork/drive-ui',
  ]),
  '@sdkwork/drive-web': new Set([
    '@sdkwork/drive-shell',
  ]),
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listWorkspacePackageDirs(rootDir) {
  const packagesDir = path.join(rootDir, 'packages');
  if (!existsSync(packagesDir)) {
    return [];
  }

  return readdirSync(packagesDir)
    .map((name) => path.join(packagesDir, name))
    .filter((candidate) => statSync(candidate).isDirectory());
}

function collectLocalDependencies(packageJson) {
  return Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {}),
    ...(packageJson.optionalDependencies || {}),
  }).filter((dependencyName) => dependencyName.startsWith('@sdkwork/drive-'));
}

export function auditWorkspace(rootDir) {
  const issues = [];

  for (const relativePath of REQUIRED_ROOT_PATHS) {
    if (!existsSync(path.join(rootDir, relativePath))) {
      issues.push(`Missing required root path: ${relativePath}`);
    }
  }

  const packageDirs = listWorkspacePackageDirs(rootDir);
  const discoveredPackages = new Set(packageDirs.map((directory) => path.basename(directory)));

  for (const requiredPackageDir of Object.keys(REQUIRED_PACKAGES)) {
    if (!discoveredPackages.has(requiredPackageDir)) {
      issues.push(`Missing required workspace package: packages/${requiredPackageDir}`);
    }
  }

  for (const packageDir of packageDirs) {
    const packageFolderName = path.basename(packageDir);
    const packageSpec = REQUIRED_PACKAGES[packageFolderName];

    if (!packageSpec) {
      issues.push(`Unexpected workspace package directory: packages/${packageFolderName}`);
      continue;
    }

    const packageJsonPath = path.join(packageDir, 'package.json');
    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    const srcIndexPath = path.join(packageDir, 'src', 'index.ts');

    if (!existsSync(packageJsonPath)) {
      issues.push(`Missing package.json in packages/${packageFolderName}`);
      continue;
    }

    if (!existsSync(tsconfigPath)) {
      issues.push(`Missing tsconfig.json in packages/${packageFolderName}`);
    }

    if (!existsSync(srcIndexPath)) {
      issues.push(`Missing src/index.ts in packages/${packageFolderName}`);
    }

    for (const relativeSrcDir of packageSpec.requiredSrcDirs) {
      const directoryPath = path.join(packageDir, 'src', relativeSrcDir);
      if (!existsSync(directoryPath)) {
        issues.push(`Missing required directory packages/${packageFolderName}/src/${relativeSrcDir}`);
      }
    }

    for (const relativePath of packageSpec.requiredPaths || []) {
      const filePath = path.join(packageDir, relativePath);
      if (!existsSync(filePath)) {
        issues.push(`Missing required path packages/${packageFolderName}/${relativePath}`);
      }
    }

    const packageJson = readJson(packageJsonPath);

    if (packageJson.name !== packageSpec.packageName) {
      issues.push(
        `Package name mismatch for packages/${packageFolderName}: expected ${packageSpec.packageName}, received ${packageJson.name}`,
      );
    }

    if (packageJson.type !== 'module') {
      issues.push(`Package packages/${packageFolderName} must declare "type": "module"`);
    }

    if (packageJson.private !== true) {
      issues.push(`Package packages/${packageFolderName} must remain private`);
    }

    if (packageJson.exports?.['.'] !== './src/index.ts') {
      issues.push(`Package packages/${packageFolderName} must export ./src/index.ts`);
    }

    const localDependencies = collectLocalDependencies(packageJson);
    const allowedDependencies = ALLOWED_LOCAL_DEPENDENCIES[packageSpec.packageName];
    for (const dependencyName of localDependencies) {
      if (!allowedDependencies.has(dependencyName)) {
        issues.push(
          `Package ${packageSpec.packageName} has a forbidden local dependency on ${dependencyName}`,
        );
      }
    }
  }

  return {
    issues,
  };
}

function formatIssue(issue) {
  return `- ${issue}`;
}

function runCli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, '..');
  const { issues } = auditWorkspace(rootDir);

  if (issues.length > 0) {
    console.error('SDKWork Drive workspace structure check failed.');
    console.error(issues.map(formatIssue).join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log('SDKWork Drive workspace structure check passed.');
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli();
}
