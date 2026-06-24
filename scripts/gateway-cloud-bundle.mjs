#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  CLOUD_CONFIG_BUNDLE_PROFILE,
  DRIVE_CLOUD_GATEWAY_CONFIGS,
  REPO_ROOT,
} from './lib/drive-topology.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = REPO_ROOT;
const SUPPORTED_FORMAT = 'tar.gz';

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === 'help') {
    printHelp();
    return;
  }

  const context = await createBundleContext(options);

  if (command === 'bundle') {
    await bundleCloudConfig(context);
    return;
  }
  if (command === 'validate') {
    await validateArchive(context);
    return;
  }
  throw new Error(`Unsupported command: ${command}`);
}

function printHelp() {
  console.log(`Usage: node scripts/gateway-cloud-bundle.mjs <bundle|validate> [options]

Bundle Drive-owned sdkwork-api-cloud-gateway route configs for cloud topology deployment.
The sdkwork-api-cloud-gateway binary is built and released from the sdkwork-api-cloud-gateway repository.

Options:
  --version <value>   Bundle version. Defaults to SDKWORK_PACKAGE_VERSION or app manifest.
  --format <value>    Only tar.gz is supported.
`);
}

function parseArgs(argv) {
  const hasExplicitCommand = argv[0] && !argv[0].startsWith('-');
  const command = hasExplicitCommand ? argv[0] : 'bundle';
  const options = {};
  const start = hasExplicitCommand ? 1 : 0;

  for (let index = start; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--version':
        options.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--format':
        options.format = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unsupported option: ${arg}`);
    }
  }

  return {
    command: options.help ? 'help' : command,
    options,
  };
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function createBundleContext(options) {
  const format = options.format ?? SUPPORTED_FORMAT;
  if (format !== SUPPORTED_FORMAT) {
    throw new Error(`Unsupported format: ${format}. Only ${SUPPORTED_FORMAT} is supported.`);
  }

  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, 'sdkwork.app.config.json'), 'utf8'),
  );
  const version = options.version
    ?? process.env.SDKWORK_PACKAGE_VERSION
    ?? manifest.release?.version
    ?? '0.0.0-dev';

  const stageRoot = path.join(repoRoot, 'dist', 'cloud-config', '.stage');
  const stageName = `sdkwork-drive-api-gateway-config-${version}`;
  const archivePath = path.join(
    repoRoot,
    'dist',
    'cloud-config',
    `${stageName}.${format}`,
  );

  return {
    version,
    format,
    stageRoot,
    stageName,
    archivePath,
    profile: CLOUD_CONFIG_BUNDLE_PROFILE,
  };
}

async function bundleCloudConfig(context) {
  await rm(context.stageRoot, { recursive: true, force: true });
  const configDir = path.join(context.stageRoot, context.stageName, 'configs');
  await mkdir(configDir, { recursive: true });

  for (const configName of DRIVE_CLOUD_GATEWAY_CONFIGS) {
    const source = path.join(repoRoot, 'configs', configName);
    if (!existsSync(source)) {
      throw new Error(`Missing cloud gateway config: ${source}`);
    }
    await copyFile(source, path.join(configDir, configName));
  }

  const readme = `# Drive Cloud Gateway Config Bundle

Version: ${context.version}
Profile: ${context.profile}

These TOML files configure sdkwork-api-cloud-gateway for Drive cloud topology.
Build and deploy the gateway binary from the sdkwork-api-cloud-gateway repository.

Included configs:
${DRIVE_CLOUD_GATEWAY_CONFIGS.map((name) => `- configs/${name}`).join('\n')}
`;
  await writeFile(path.join(context.stageRoot, context.stageName, 'README.md'), readme, 'utf8');

  await mkdir(path.dirname(context.archivePath), { recursive: true });
  const tarResult = spawnSync(
    'tar',
    ['-czf', context.archivePath, '-C', context.stageRoot, context.stageName],
    { stdio: 'inherit' },
  );
  if (tarResult.status !== 0) {
    throw new Error(`Failed to create archive: ${context.archivePath}`);
  }

  const archiveBytes = await readFile(context.archivePath);
  const digest = createHash('sha256').update(archiveBytes).digest('hex');
  await writeFile(`${context.archivePath}.sha256`, `${digest}  ${path.basename(context.archivePath)}\n`, 'utf8');

  console.log(`[gateway-cloud-bundle] wrote ${context.archivePath}`);
  console.log(`[gateway-cloud-bundle] sha256 ${digest}`);
}

async function validateArchive(context) {
  if (!existsSync(context.archivePath)) {
    throw new Error(`Archive not found: ${context.archivePath}`);
  }
  const digestPath = `${context.archivePath}.sha256`;
  if (!existsSync(digestPath)) {
    throw new Error(`Checksum file not found: ${digestPath}`);
  }
  const archiveBytes = await readFile(context.archivePath);
  const digest = createHash('sha256').update(archiveBytes).digest('hex');
  const recorded = (await readFile(digestPath, 'utf8')).trim().split(/\s+/u)[0];
  if (digest !== recorded) {
    throw new Error(`Checksum mismatch for ${context.archivePath}`);
  }
  console.log(`[gateway-cloud-bundle] validated ${context.archivePath}`);
}

main().catch((error) => {
  console.error(`[gateway-cloud-bundle] ${error.message}`);
  process.exit(1);
});
