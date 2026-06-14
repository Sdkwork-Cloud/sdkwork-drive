#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_SDKWORK_API_GATEWAY_BIND = '127.0.0.1:3900';
const DEFAULT_SDKWORK_API_GATEWAY_BASE_URL = `http://${DEFAULT_SDKWORK_API_GATEWAY_BIND}`;
const DEFAULT_DRIVE_APP_API_BIND = '127.0.0.1:18080';
const DEFAULT_DRIVE_APP_API_BASE_URL = `http://${DEFAULT_DRIVE_APP_API_BIND}`;

const SDKWORK_API_GATEWAY_BASE_URL_ENV_KEYS = [
  'SDKWORK_API_GATEWAY_BASE_URL',
  'SDKWORK_DRIVE_API_GATEWAY_BASE_URL',
];

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function normalizeUpstreamBaseUrl(value, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error(`${label} must be a valid absolute http(s) URL`);
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`${label} must be a valid absolute http(s) URL`);
  }
  return normalized.replace(/\/+$/u, '');
}

function normalizeGatewayBind(value, label = 'SDKWORK_API_GATEWAY_BIND') {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    throw new Error(`${label} must be a host:port bind address, not a URL`);
  }
  return normalized;
}

function resolveSdkworkApiGatewayBind(env = process.env) {
  return normalizeGatewayBind(env.SDKWORK_API_GATEWAY_BIND) ?? DEFAULT_SDKWORK_API_GATEWAY_BIND;
}

function resolveSdkworkApiGatewayBaseUrl(env = process.env) {
  for (const key of SDKWORK_API_GATEWAY_BASE_URL_ENV_KEYS) {
    const baseUrl = normalizeUpstreamBaseUrl(env[key], key);
    if (baseUrl) {
      return baseUrl;
    }
  }
  return `http://${resolveSdkworkApiGatewayBind(env)}`;
}

function shouldAutostartSdkworkApiGateway(env) {
  const value = normalizeText(env.SDKWORK_API_GATEWAY_AUTOSTART);
  if (!value) {
    return true;
  }
  return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
}

function isTcpPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

function loadEnvFile(envFile) {
  if (!envFile) {
    return {};
  }
  const resolved = path.isAbsolute(envFile) ? envFile : path.resolve(repoRoot, envFile);
  if (!fs.existsSync(resolved)) {
    const example = `${resolved}.example`;
    if (!fs.existsSync(example)) {
      return {};
    }
    return loadEnvFile(example);
  }
  const values = {};
  for (const rawLine of fs.readFileSync(resolved, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function parseArgs(argv) {
  const settings = {
    target: 'browser',
    database: undefined,
    devEnvFile: null,
    dryRun: false,
    help: false,
  };
  let forwardOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (forwardOnly) {
      continue;
    }
    if (arg === '--') {
      forwardOnly = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      settings.dryRun = true;
      continue;
    }
    if (arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--target requires a value (browser or desktop)');
      }
      settings.target = value;
      index += 1;
      continue;
    }
    if (arg === '--database') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--database requires a value (postgres or sqlite)');
      }
      settings.database = value;
      index += 1;
      continue;
    }
    if (arg === '--dev-env-file') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--dev-env-file requires a path');
      }
      settings.devEnvFile = value;
      index += 1;
      continue;
    }
  }
  return settings;
}

function resolveDatabaseEnv(baseEnv, databaseProfile) {
  const env = { ...baseEnv };
  if (databaseProfile === 'sqlite') {
    env.SDKWORK_DRIVE_DATABASE_ENGINE = 'sqlite';
    env.SDKWORK_DRIVE_DATABASE_SQLITE_URL =
      env.SDKWORK_DRIVE_DATABASE_SQLITE_URL || 'sqlite://target/dev/sdkwork-drive.sqlite';
  }
  return env;
}

function createManagedGatewayProcess({ env }) {
  if (!shouldAutostartSdkworkApiGateway(env)) {
    return undefined;
  }

  const apiGatewayWorkspaceRoot = path.resolve(repoRoot, '..', 'sdkwork-api-gateway');
  const gatewayConfigPath = path.join(repoRoot, 'configs', 'sdkwork-api-gateway.drive.development.toml');

  if (!fs.existsSync(gatewayConfigPath)) {
    console.warn(`[sdkwork-drive] gateway config not found at ${gatewayConfigPath}, skipping gateway autostart`);
    return undefined;
  }

  const gatewayEnv = {
    ...env,
    CARGO_TARGET_DIR: normalizeText(env.SDKWORK_API_GATEWAY_CARGO_TARGET_DIR)
      || path.join(apiGatewayWorkspaceRoot, 'target', 'drive-pc-dev'),
    SDKWORK_API_GATEWAY_CONFIG: gatewayConfigPath,
    SDKWORK_API_GATEWAY_BIND: resolveSdkworkApiGatewayBind(env),
    SDKWORK_API_GATEWAY_MODE: normalizeText(env.SDKWORK_API_GATEWAY_MODE) || 'split',
  };

  return {
    args: [
      'run',
      '-p',
      'sdkwork-api-gateway-api-server',
      '--bin',
      'sdkwork-api-gateway',
    ],
    command: cargoCommand(),
    cwd: apiGatewayWorkspaceRoot,
    env: gatewayEnv,
    label: 'sdkwork-api-gateway',
    shell: false,
  };
}

function createDriveApiServerProcess({ env, databaseProfile }) {
  const databaseEnv = resolveDatabaseEnv(env, databaseProfile);
  const serverEnv = {
    ...databaseEnv,
    SDKWORK_DRIVE_IAM_ALLOW_UNSIGNED_CONTEXT: 'true',
  };

  const databaseUrl = normalizeText(serverEnv.SDKWORK_DRIVE_DATABASE_URL);
  const extraArgs = databaseUrl ? ['--', '--database-url', databaseUrl] : [];

  return {
    args: ['run', '-p', 'sdkwork-router-drive-app-api', ...extraArgs],
    command: cargoCommand(),
    cwd: repoRoot,
    env: serverEnv,
    label: 'drive-app-api',
    shell: false,
  };
}

function createDevServerProcess({ env, target }) {
  const command = pnpmCommand();
  const isDesktop = target === 'desktop';

  if (isDesktop) {
    return {
      args: ['--dir', 'apps/sdkwork-drive-pc/packages/sdkwork-drive-pc-desktop', 'desktop:dev:local'],
      command,
      cwd: repoRoot,
      env,
      label: 'drive-pc-desktop',
      shell: true,
    };
  }

  return {
    args: ['--dir', 'apps/sdkwork-drive-pc', 'dev'],
    command,
    cwd: repoRoot,
    env,
    label: 'drive-pc-browser',
    shell: true,
  };
}

function prefixOutput(label, stream, chunk) {
  const text = String(chunk ?? '');
  for (const line of text.split(/\r?\n/u)) {
    if (line.length > 0) {
      stream.write(`[${label}] ${line}\n`);
    }
  }
}

function terminateProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill();
}

function printHelp() {
  console.log(`Usage: node scripts/run-drive-pc-dev.mjs [options]

Options:
  --target <browser|desktop>   Target platform (default: browser)
  --database <postgres|sqlite> Database profile (default: postgres for browser, sqlite for desktop)
  --dev-env-file <path>        Path to env file
  --dry-run                    Print plan without executing
  --help, -h                   Show this help

Gateway policy:
  The script automatically starts sdkwork-api-gateway if not already running.
  Set SDKWORK_API_GATEWAY_AUTOSTART=false to disable autostart.
  Set SDKWORK_API_GATEWAY_BASE_URL to use a custom gateway URL.
`);
}

async function main() {
  try {
    const settings = parseArgs(process.argv.slice(2));
    if (settings.help) {
      printHelp();
      process.exit(0);
    }

    const defaultDatabaseProfile = settings.target === 'desktop' ? 'sqlite' : 'postgres';
    const databaseProfile = settings.database || defaultDatabaseProfile;

    const envFile = settings.devEnvFile
      || (databaseProfile === 'postgres' ? '.env.postgres' : undefined);
    const fileEnv = loadEnvFile(envFile);

    const baseEnv = { ...process.env, ...fileEnv };
    const foundationApiGatewayBaseUrl = resolveSdkworkApiGatewayBaseUrl(baseEnv);

    const gatewayProcess = createManagedGatewayProcess({ env: baseEnv });
    const driveApiProcess = createDriveApiServerProcess({ env: baseEnv, databaseProfile });
    const devServerProcess = createDevServerProcess({
      env: {
        ...baseEnv,
        VITE_DRIVE_PC_API_GATEWAY_BASE_URL: foundationApiGatewayBaseUrl,
        VITE_DRIVE_PC_APP_API_BASE_URL: foundationApiGatewayBaseUrl,
      },
      target: settings.target,
    });

    const processes = [];
    if (gatewayProcess) {
      processes.push(gatewayProcess);
    }
    processes.push(driveApiProcess, devServerProcess);

    if (settings.dryRun) {
      for (const entry of processes) {
        console.log(`[${entry.label}] ${entry.command} ${entry.args.join(' ')}`);
      }
      process.exit(0);
    }

    const children = [];
    let shuttingDown = false;

    function shutdown(exceptChild) {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      for (const child of children) {
        if (child !== exceptChild && child.exitCode == null && child.signalCode == null) {
          terminateProcessTree(child);
        }
      }
    }

    for (const entry of processes) {
      const child = spawn(entry.command, entry.args, {
        cwd: entry.cwd,
        env: entry.env,
        shell: entry.shell,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      children.push(child);

      child.stdout?.on('data', (chunk) => prefixOutput(entry.label, process.stdout, chunk));
      child.stderr?.on('data', (chunk) => prefixOutput(entry.label, process.stderr, chunk));
      child.on('error', (error) => {
        process.stderr.write(
          `[${entry.label}] ${error instanceof Error ? error.message : String(error)}\n`,
        );
        shutdown(child);
        process.exitCode = 1;
      });
      child.on('exit', (code, signal) => {
        if (shuttingDown) {
          return;
        }
        shutdown(child);
        if (code && code !== 0) {
          process.stderr.write(`[${entry.label}] exited with code ${code}\n`);
          process.exitCode = code;
          return;
        }
        if (signal) {
          process.stderr.write(`[${entry.label}] exited with signal ${signal}\n`);
          process.exitCode = 1;
        }
      });
    }

    const stop = () => shutdown();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    console.error(`[sdkwork-drive] ${error.message}`);
    process.exit(1);
  }
}

main();
