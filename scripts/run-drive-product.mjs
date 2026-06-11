#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

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
  const explicitUrl = String(env.SDKWORK_DRIVE_DATABASE_URL ?? '').trim();
  const provider = String(env.SDKWORK_DRIVE_DATABASE_PROVIDER ?? 'postgresql')
    .trim()
    .toLowerCase();

  if (explicitUrl) {
    env.SDKWORK_DRIVE_DATABASE_ENGINE = databaseEngineFromUrl(explicitUrl);
    const defaultConnections = env.SDKWORK_DRIVE_DATABASE_ENGINE === 'sqlite' ? '1' : '10';
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
      env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
      defaultConnections,
    );
    return env;
  }
  if (provider === 'sqlite') {
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
      env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
      '1',
    );
    const sqliteUrl = String(env.SDKWORK_DRIVE_DATABASE_SQLITE_URL ?? '').trim();
    if (!sqliteUrl) {
      throw new Error('SDKWORK_DRIVE_DATABASE_SQLITE_URL must be set for sqlite provider');
    }
    env.SDKWORK_DRIVE_DATABASE_URL = sqliteUrl;
    env.SDKWORK_DRIVE_DATABASE_ENGINE = 'sqlite';
    return env;
  }
  if (provider !== 'postgresql' && provider !== 'postgres') {
    throw new Error('SDKWORK_DRIVE_DATABASE_PROVIDER must be postgresql or sqlite');
  }
  env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS = normalizeMaxConnections(
    env.SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS,
    '10',
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
  const sslMode = String(env.SDKWORK_DRIVE_DATABASE_SSLMODE ?? '').trim();
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
    throw new Error(`Unsupported drive product mode: ${mode}. Use server or plan.`);
  }
  return [
    {
      ...common,
      label: 'drive app api',
      args: ['run', '-p', 'sdkwork-drive-app-api'],
    },
    {
      ...common,
      label: 'drive backend api',
      args: ['run', '-p', 'sdkwork-drive-backend-api'],
    },
    {
      ...common,
      label: 'drive open api',
      args: ['run', '-p', 'sdkwork-drive-open-api'],
    },
    {
      ...common,
      label: 'drive admin storage api',
      args: ['run', '-p', 'sdkwork-drive-admin-storage-api'],
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
  console.log(`Usage: node scripts/run-drive-product.mjs [server|plan] [--dev-env-file .env.postgres] [-- --database-url <url>]

Database policy:
  pnpm dev          uses PostgreSQL via .env.postgres
  pnpm dev:sqlite   uses sqlite://target/dev/sdkwork-drive.sqlite
`);
}

try {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    process.exit(0);
  }
  const fileEnv = loadEnvFile(settings.devEnvFile);
  const env = resolveDatabaseEnv({ ...process.env, ...fileEnv }, settings.extraArgs);
  const plan = createPlan({ mode: settings.mode, env });
  printPlan(plan, env);
  if (settings.mode === 'server') {
    spawnPlan(plan);
  }
} catch (error) {
  console.error(`[sdkwork-drive] ${error.message}`);
  process.exit(1);
}
