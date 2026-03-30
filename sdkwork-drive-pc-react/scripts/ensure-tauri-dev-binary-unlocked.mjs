#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WINDOWS_RELEASE_WAIT_TIMEOUT_MS = 15_000;
const WINDOWS_RELEASE_WAIT_INTERVAL_MS = 250;
const DEBUG_PREFIX = '[tauri-dev-unlock]';
const verboseDebugEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.SDKWORK_TAURI_DEBUG ?? '').trim().toLowerCase(),
);

function debugLog(message, details) {
  if (!verboseDebugEnabled) {
    return;
  }

  const prefix = `${DEBUG_PREFIX} ${new Date().toISOString()} ${message}`;
  if (typeof details === 'undefined') {
    console.log(prefix);
    return;
  }

  console.log(prefix, details);
}

function escapePowerShellSingleQuoted(value) {
  return value.replace(/'/g, "''");
}

function sleepSync(delayMs) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
}

export function resolveTauriDevBinaryPath(
  srcTauriDir = 'src-tauri',
  binaryName = 'sdkwork-drive-desktop',
  platform = process.platform,
  cargoTargetDir = process.env.CARGO_TARGET_DIR,
) {
  const targetRoot =
    typeof cargoTargetDir === 'string' && cargoTargetDir.trim().length > 0
      ? path.resolve(cargoTargetDir)
      : path.resolve(srcTauriDir, '..', '.tauri-target', 'dev');

  return path.resolve(
    targetRoot,
    'debug',
    platform === 'win32' ? `${binaryName}.exe` : binaryName,
  );
}

function listWindowsProcessesForBinary(executablePath) {
  const normalizedExecutablePath = path.resolve(executablePath);
  const escapedExecutablePath = escapePowerShellSingleQuoted(normalizedExecutablePath);
  const command = [
    `$target = '${escapedExecutablePath}'`,
    `$items = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -and ([System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq $target) } | Select-Object @{ Name = 'Id'; Expression = { [int]$_.ProcessId } }, @{ Name = 'ProcessName'; Expression = { $_.Name } }, @{ Name = 'Path'; Expression = { $_.ExecutablePath } }`,
    `if ($null -eq $items) { '[]' } else { $items | ConvertTo-Json -Compress }`,
  ].join('; ');
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    {
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    debugLog('failed to inspect Windows processes for executable path', {
      executablePath: normalizedExecutablePath,
      status: result.status,
      stderr: result.stderr?.trim() || null,
      stdout: result.stdout?.trim() || null,
    });
    return [];
  }

  const stdout = result.stdout.trim();
  if (stdout.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(stdout);
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    return processes.filter((item) => Number.isFinite(item?.Id) && item.Id > 0);
  } catch (error) {
    debugLog('failed to parse Windows process inspection result', {
      executablePath: normalizedExecutablePath,
      stdout,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function isWindowsProcessRunning(pid) {
  const command = [
    `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue`,
    `if ($null -eq $process) { 'false' } else { 'true' }`,
  ].join('; ');
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    {
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to inspect Tauri dev process ${pid}: ${result.stderr || result.stdout}`.trim(),
    );
  }

  return result.stdout.trim().toLowerCase() === 'true';
}

function waitForWindowsProcessExit(
  pid,
  timeoutMs = WINDOWS_RELEASE_WAIT_TIMEOUT_MS,
  intervalMs = WINDOWS_RELEASE_WAIT_INTERVAL_MS,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    if (!isWindowsProcessRunning(pid)) {
      return true;
    }

    sleepSync(intervalMs);
  }

  return !isWindowsProcessRunning(pid);
}

function stopWindowsProcess(pid) {
  const result = spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to stop locked Tauri dev process ${pid}: ${result.stderr || result.stdout}`.trim(),
    );
  }

  if (!waitForWindowsProcessExit(pid)) {
    throw new Error(`Timed out waiting for locked Tauri dev process ${pid} to exit.`);
  }
}

export function ensureTauriDevBinaryUnlocked(
  srcTauriDir = 'src-tauri',
  binaryName = 'sdkwork-drive-desktop',
  platform = process.platform,
  options = {},
) {
  const executablePath = resolveTauriDevBinaryPath(
    srcTauriDir,
    binaryName,
    platform,
    options.cargoTargetDir ?? process.env.CARGO_TARGET_DIR,
  );
  const listProcesses = options.listWindowsProcessesForBinary ?? listWindowsProcessesForBinary;
  const stopProcess = options.stopWindowsProcess ?? stopWindowsProcess;
  const isProcessRunning = options.isWindowsProcessRunning ?? isWindowsProcessRunning;

  debugLog('starting binary unlock inspection', {
    srcTauriDir: path.resolve(srcTauriDir),
    binaryName,
    platform,
    cargoTargetDir: options.cargoTargetDir ?? process.env.CARGO_TARGET_DIR ?? null,
    executablePath,
  });

  if (platform !== 'win32') {
    return {
      executablePath,
      runningProcesses: [],
      terminatedProcesses: [],
      skipped: 'unsupported-platform',
    };
  }

  if (!existsSync(executablePath)) {
    return {
      executablePath,
      runningProcesses: [],
      terminatedProcesses: [],
      skipped: 'binary-missing',
    };
  }

  const runningProcesses = listProcesses(executablePath);
  const terminatedProcesses = [];

  for (const processInfo of runningProcesses) {
    try {
      stopProcess(processInfo.Id);
    } catch (error) {
      if (isProcessRunning(processInfo.Id)) {
        throw error;
      }
    }
    terminatedProcesses.push(processInfo);
  }

  return {
    executablePath,
    runningProcesses,
    terminatedProcesses,
    skipped: false,
  };
}

function runCli() {
  const srcTauriDir = process.argv[2] ?? 'src-tauri';
  const binaryName = process.argv[3] ?? 'sdkwork-drive-desktop';
  const result = ensureTauriDevBinaryUnlocked(srcTauriDir, binaryName);
  debugLog('binary unlock result', result);

  if (result.skipped === 'unsupported-platform') {
    console.log(`Skipping Tauri dev binary unlock on unsupported platform ${process.platform}.`);
    return;
  }

  if (result.skipped === 'binary-missing') {
    console.log(`No built Tauri dev binary found at ${result.executablePath}; continuing.`);
    return;
  }

  if (result.terminatedProcesses.length > 0) {
    console.log(
      `Stopped ${result.terminatedProcesses.length} locked Tauri dev process(es) for ${result.executablePath}.`,
    );
    return;
  }

  console.log(`No running Tauri dev binary lock detected for ${result.executablePath}.`);
}

const invokedScriptPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentModulePath = fileURLToPath(import.meta.url);

if (invokedScriptPath && invokedScriptPath === currentModulePath) {
  runCli();
}
