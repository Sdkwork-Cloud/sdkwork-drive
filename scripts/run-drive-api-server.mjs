#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const http = require('http');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

// Gateway configuration
const GATEWAY_WORKSPACE = path.resolve(WORKSPACE_ROOT, '..', 'sdkwork-api-cloud-gateway');
const GATEWAY_DEFAULT_URL = 'http://127.0.0.1:3900';
const GATEWAY_HEALTH_PATH = '/healthz';
const GATEWAY_CHECK_TIMEOUT_MS = 2000;
const GATEWAY_STARTUP_WAIT_MS = 3000;
const GATEWAY_MAX_STARTUP_ATTEMPTS = 30;

/**
 * Check if sdkwork-api-cloud-gateway is already running by hitting the health endpoint.
 * @param {string} gatewayUrl - The gateway base URL
 * @param {number} timeoutMs - Timeout for the health check request
 * @returns {Promise<boolean>} - True if gateway is healthy, false otherwise
 */
function checkGatewayHealth(gatewayUrl, timeoutMs) {
  return new Promise((resolve) => {
    const url = new URL(GATEWAY_HEALTH_PATH, gatewayUrl);
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'GET',
        timeout: timeoutMs,
      },
      (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
    );

    request.on('error', () => {
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.end();
  });
}

/**
 * Start sdkwork-api-cloud-gateway as a background process.
 * @param {object} env - Environment variables to pass to the gateway
 * @returns {Promise<object>} - The spawned child process
 */
function startGatewayProcess(env) {
  const gatewayPackageJsonPath = path.join(GATEWAY_WORKSPACE, 'package.json');
  if (!existsSync(gatewayPackageJsonPath)) {
    throw new Error(`sdkwork-api-cloud-gateway workspace not found at ${GATEWAY_WORKSPACE}`);
  }

  const gatewayConfigExample = path.join(
    WORKSPACE_ROOT,
    'configs',
    'sdkwork-api-cloud-gateway.drive.development.toml',
  );

  const args = [
    'run',
    '-p',
    'sdkwork-api-cloud-gateway-api-server',
    '--bin',
    'sdkwork-api-cloud-gateway',
    '--',
    '--config',
    gatewayConfigExample,
  ];

  console.log('[sdkwork-drive] starting sdkwork-api-cloud-gateway...');

  const child = spawn(cargoCommand(), args, {
    cwd: GATEWAY_WORKSPACE,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: process.platform === 'win32',
  });

  return child;
}

/**
 * Wait for gateway to become healthy.
 * @param {string} gatewayUrl - The gateway base URL
 * @param {number} maxAttempts - Maximum number of health check attempts
 * @param {number} waitMs - Milliseconds to wait between attempts
 * @returns {Promise<boolean>} - True if gateway became healthy, false otherwise
 */
async function waitForGatewayHealthy(gatewayUrl, maxAttempts, waitMs) {
  console.log(`[sdkwork-drive] waiting for sdkwork-api-cloud-gateway at ${gatewayUrl}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const healthy = await checkGatewayHealth(gatewayUrl, GATEWAY_CHECK_TIMEOUT_MS);
    if (healthy) {
      console.log(`[sdkwork-drive] sdkwork-api-cloud-gateway is healthy (attempt ${attempt})`);
      return true;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => {
        setTimeout(resolve, waitMs);
      });
    }
  }

  console.error(`[sdkwork-drive] sdkwork-api-cloud-gateway did not become healthy after ${maxAttempts} attempts`);
  return false;
}

/**
 * Ensure sdkwork-api-cloud-gateway is running before starting Drive API processes.
 * @param {object} env - Environment variables
 * @returns {Promise<object|null>} - The gateway child process if started, null if already running
 */
async function ensureGatewayRunning(env) {
  const gatewayUrl = env.SDKWORK_API_CLOUD_GATEWAY_URL || GATEWAY_DEFAULT_URL;

  // Check if gateway is already running
  const alreadyRunning = await checkGatewayHealth(gatewayUrl, GATEWAY_CHECK_TIMEOUT_MS);
  if (alreadyRunning) {
    console.log(`[sdkwork-drive] sdkwork-api-cloud-gateway already running at ${gatewayUrl}`);
    return null;
  }

  // Start gateway process
  const gatewayProcess = startGatewayProcess(env);

  // Wait for gateway to become healthy
  const healthy = await waitForGatewayHealthy(
    gatewayUrl,
    GATEWAY_MAX_STARTUP_ATTEMPTS,
    GATEWAY_STARTUP_WAIT_MS,
  );

  if (!healthy) {
    gatewayProcess.kill();
    throw new Error('sdkwork-api-cloud-gateway failed to start');
  }

  return gatewayProcess;
}

let gatewayProcess = null;

function parseArgs(argv) {
  const settings = {
    mode: 'server',
    devEnvFile: null,
    extraArgs: [],
    help: false,
  };
  let modeSet = false;
  let forwardOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (forwardOnly) {
      settings.extraArgs.push(arg);
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
    if (arg === '--dev-env-file') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--dev-env-file requires a path');
      }
      settings.devEnvFile = value;
      index += 1;
      continue;
    }
    if (!modeSet && !arg.startsWith('-')) {
      settings.mode = arg;
      modeSet = true;
      continue;
    }
    settings.extraArgs.push(arg);
  }
  return settings;
}

function loadEnvFile(envFile) {
  if (!envFile) {
    return {};
  }
  const resolved = path.isAbsolute(envFile) ? envFile : path.resolve(WORKSPACE_ROOT, envFile);
  if (!existsSync(resolved)) {
    const example = `${resolved}.example`;
    if (!existsSync(example)) {
      throw new Error(`dev env file not found: ${resolved}`);
    }
    return loadEnvFile(example);
  }
  const values = {};
  for (const rawLine of readFileSync(resolved, 'utf8').split(/\r?\n/u)) {
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

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseForwardedDatabaseUrl(extraArgs) {
  for (let index = 0; index < extraArgs.length; index += 1) {
    if (extraArgs[index] === '--database-url') {
      return requireValue(extraArgs, index, '--database-url');
    }
  }
  return null;
}

function normalizeMaxConnections(value, defaultValue) {
  const raw = String(value ?? defaultValue).trim();
  if (!/^[1-9]\d*$/u.test(raw)) {
    throw new Error('SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS must be a positive integer');
  }
  return raw;
}

function appendQueryParam(params, name, value) {
  const normalized = String(value ?? '').trim();
  if (normalized) {
    params.set(name, normalized);
  }
}

function encodePostgresPath(databaseName) {
  return encodeURIComponent(databaseName).replaceAll('%2F', '/');
}

function buildPostgresDatabaseUrl({
  host,
  port,
  database,
  username,
  password,
  sslMode,
}) {
  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  const authority = `${credentials}@${host}${port ? `:${port}` : ''}`;
  const params = new URLSearchParams();
  appendQueryParam(params, 'sslmode', sslMode);
  const query = params.toString();
  return `postgresql://${authority}/${encodePostgresPath(database)}${query ? `?${query}` : ''}`;
}

function rejectRemovedDatabaseAliases(env) {
  const removedAliases = [
    ['SDKWORK_DRIVE_DATABASE_PROVIDER', 'SDKWORK_DRIVE_DATABASE_ENGINE'],
    ['SDKWORK_DRIVE_DATABASE_SSLMODE', 'SDKWORK_DRIVE_DATABASE_SSL_MODE'],
  ].filter(([key]) => String(env[key] ?? '').trim());
  if (removedAliases.length > 0) {
    throw new Error(
      `${removedAliases
        .map(([removed, replacement]) => `${removed} was removed; use ${replacement}`)
        .join(', ')}`,
    );
  }
}

function resolveDatabaseEnv(baseEnv, extraArgs) {
  const env = { ...baseEnv };
  if (!String(env.SDKWORK_DRIVE_IAM_CONTEXT_SIGNATURE_SECRET ?? '').trim()) {
    env.SDKWORK_DRIVE_IAM_ALLOW_UNSIGNED_CONTEXT =
      env.SDKWORK_DRIVE_IAM_ALLOW_UNSIGNED_CONTEXT || 'true';
  }
  const forwardedUrl = parseForwardedDatabaseUrl(extraArgs);
  if (forwardedUrl) {
    env.SDKWORK_DRIVE_DATABASE_URL = forwardedUrl;
  }
  rejectRemovedDatabaseAliases(env);
  const explicitUrl = String(env.SDKWORK_DRIVE_DATABASE_URL ?? '').trim();
  const engine = String(env.SDKWORK_DRIVE_DATABASE_ENGINE ?? 'postgresql')
    .trim()
    .toLowerCase();

  if (explicitUrl) {
    env.SDKWORK_DRIVE_DATABASE_ENGINE = databaseEngineFromUrl(explicitUrl);
    const defaultConnections = env.SDKWORK_DRIVE_DATABASE_ENGINE === 'sqlite' ? '1' : '32';
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
      env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
      defaultConnections,
    );
    return env;
  }
  if (engine === 'sqlite') {
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
      env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
      '1',
    );
    const sqliteUrl = String(env.SDKWORK_DRIVE_DATABASE_SQLITE_URL ?? '').trim();
    if (!sqliteUrl) {
      throw new Error('SDKWORK_DRIVE_DATABASE_SQLITE_URL must be set for sqlite engine');
    }
    env.SDKWORK_DRIVE_DATABASE_URL = sqliteUrl;
    env.SDKWORK_DRIVE_DATABASE_ENGINE = 'sqlite';
    return env;
  }
  if (engine !== 'postgresql' && engine !== 'postgres') {
    throw new Error('SDKWORK_DRIVE_DATABASE_ENGINE must be postgresql or sqlite');
  }
  env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
    '32',
  );
  for (const key of [
    'SDKWORK_DRIVE_DATABASE_HOST',
    'SDKWORK_DRIVE_DATABASE_NAME',
    'SDKWORK_DRIVE_DATABASE_USERNAME',
    'SDKWORK_DRIVE_DATABASE_PASSWORD',
  ]) {
    if (!String(env[key] ?? '').trim()) {
      throw new Error(`${key} must be set for PostgreSQL provider`);
    }
  }
  const port = String(env.SDKWORK_DRIVE_DATABASE_PORT ?? '5432').trim();
  const sslMode = String(env.SDKWORK_DRIVE_DATABASE_SSL_MODE ?? '').trim();
  const url = buildPostgresDatabaseUrl({
    host: String(env.SDKWORK_DRIVE_DATABASE_HOST).trim(),
    port,
    database: String(env.SDKWORK_DRIVE_DATABASE_NAME).trim(),
    username: String(env.SDKWORK_DRIVE_DATABASE_USERNAME).trim(),
    password: String(env.SDKWORK_DRIVE_DATABASE_PASSWORD).trim(),
    sslMode,
  });
  env.SDKWORK_DRIVE_DATABASE_URL = url;
  env.SDKWORK_DRIVE_DATABASE_ENGINE = 'postgresql';
  return env;
}

function databaseEngineFromUrl(url) {
  if (url.startsWith('sqlite:')) {
    return 'sqlite';
  }
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgresql';
  }
  throw new Error('--database-url must be a PostgreSQL or SQLite connection string');
}

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function createPlan({ mode, env }) {
  const common = {
    cwd: WORKSPACE_ROOT,
    env,
    command: cargoCommand(),
    windowsHide: process.platform === 'win32',
  };
  if (mode !== 'server' && mode !== 'plan') {
    throw new Error(`Unsupported Drive API server mode: ${mode}. Use server or plan.`);
  }
  return [
    {
      ...common,
      label: 'drive app-api router',
      args: ['run', '-p', 'sdkwork-routes-drive-app-api'],
    },
    {
      ...common,
      label: 'drive backend-api router',
      args: ['run', '-p', 'sdkwork-routes-drive-backend-api'],
    },
    {
      ...common,
      label: 'drive open-api router',
      args: ['run', '-p', 'sdkwork-routes-drive-open-api'],
    },
    {
      ...common,
      label: 'drive storage backend router',
      args: ['run', '-p', 'sdkwork-routes-storage-backend-api'],
    },
    {
      ...common,
      label: 'drive install worker',
      args: ['run', '-p', 'sdkwork-drive-install-worker'],
    },
  ];
}

function printPlan(plan, env) {
  console.log(
    `[sdkwork-drive] databaseEngine=${env.SDKWORK_DRIVE_DATABASE_ENGINE} maxConnections=${env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS}`,
  );
  if (plan.length === 0) {
    console.log('[sdkwork-drive] no processes scheduled for plan mode');
    return;
  }
  for (const step of plan) {
    console.log(`[sdkwork-drive] ${step.label}: ${step.command} ${step.args.join(' ')}`);
  }
}

function spawnPlan(plan) {
  if (plan.length === 0) {
    return;
  }
  mkdirSync(path.join(WORKSPACE_ROOT, 'target', 'dev'), { recursive: true });
  const children = [];
  let shuttingDown = false;
  const stopAll = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    // Stop gateway if we started it
    if (gatewayProcess && !gatewayProcess.killed) {
      gatewayProcess.kill();
    }
    for (const child of children) {
      if (!child.killed) {
        child.kill();
      }
    }
  };
  process.on('SIGINT', stopAll);
  process.on('SIGTERM', stopAll);

  for (const step of plan) {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: step.env,
      stdio: 'inherit',
      windowsHide: step.windowsHide,
    });
    children.push(child);
    child.on('exit', (code) => {
      if (!shuttingDown && code !== 0) {
        stopAll();
        process.exitCode = code ?? 1;
      }
    });
  }
}

function printHelp() {
  console.log(`Usage: node scripts/run-drive-api-server.mjs [server|plan] [--dev-env-file .env.postgres] [-- --database-url <url>]

Database policy:
  pnpm dev          uses PostgreSQL via .env.postgres
  pnpm dev:sqlite   uses sqlite://target/dev/sdkwork-drive.sqlite

Gateway policy:
  The script checks if sdkwork-api-cloud-gateway is already running at http://127.0.0.1:3900.
  If not, it starts the gateway automatically before starting Drive API processes.
  Set SDKWORK_API_CLOUD_GATEWAY_URL to override the gateway URL.
`);
}

async function main() {
  try {
    const settings = parseArgs(process.argv.slice(2));
    if (settings.help) {
      printHelp();
      process.exit(0);
    }
    const fileEnv = loadEnvFile(settings.devEnvFile);
    const env = resolveDatabaseEnv({ ...process.env, ...fileEnv }, settings.extraArgs);

    // Ensure gateway is running before starting drive services
    if (settings.mode === 'server') {
      gatewayProcess = await ensureGatewayRunning(env);
      if (gatewayProcess) {
        // Handle gateway process exit
        gatewayProcess.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            console.error(`[sdkwork-drive] sdkwork-api-cloud-gateway exited with code ${code}`);
          }
        });
      }
    }

    const plan = createPlan({ mode: settings.mode, env });
    printPlan(plan, env);
    if (settings.mode === 'server') {
      spawnPlan(plan);
    }
  } catch (error) {
    console.error(`[sdkwork-drive] ${error.message}`);
    process.exit(1);
  }
}

main();
