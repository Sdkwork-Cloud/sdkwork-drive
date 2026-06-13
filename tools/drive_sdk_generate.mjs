#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OFFICIAL_LANGUAGE_ORDER = ["typescript", "rust", "java", "python", "go"];
const DEFAULT_LANGUAGE = "typescript";

function fail(message) {
  process.stderr.write(`[drive_sdk_generate] ${message}\n`);
  process.exit(1);
}

function runNodeScript(relativeScriptPath, args) {
  const scriptPath = path.join(workspaceRoot, relativeScriptPath);
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: workspaceRoot,
    stdio: "inherit",
  });
  if (result.error) {
    fail(`failed to run ${relativeScriptPath}: ${result.error.message}`);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    fail(`${relativeScriptPath} exited with code ${result.status}`);
  }
  if (result.signal) {
    fail(`${relativeScriptPath} terminated by signal ${result.signal}`);
  }
}

function resolveWorkspacePath(inputPath) {
  if (!inputPath) {
    fail("path argument cannot be empty");
  }
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(workspaceRoot, inputPath);
}

function parseLanguages(raw) {
  const values = raw.flatMap((item) => String(item || "").split(","));
  const normalized = [];
  for (const value of values) {
    const language = value.trim().toLowerCase();
    if (!language) {
      continue;
    }
    if (!OFFICIAL_LANGUAGE_ORDER.includes(language)) {
      fail(`unsupported language: ${language}`);
    }
    if (!normalized.includes(language)) {
      normalized.push(language);
    }
  }
  return OFFICIAL_LANGUAGE_ORDER.filter((language) => normalized.includes(language));
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    openInput: "apis/open-api/drive/drive-open-api.openapi.json",
    appInput: "apis/app-api/drive/drive-app-api.openapi.json",
    backendInput: "apis/backend-api/drive/drive-backend-api.openapi.json",
    adminStorageInput: null,
    outputDir: "apis",
    allLanguages: false,
    languages: [],
    baseUrl: null,
    passthrough: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    if (arg === "--open-input") {
      parsed.openInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--app-input") {
      parsed.appInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--backend-input") {
      parsed.backendInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--admin-storage-input") {
      parsed.adminStorageInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--output-dir") {
      parsed.outputDir = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--all-languages") {
      parsed.allLanguages = true;
      continue;
    }
    if (arg === "--language") {
      parsed.languages.push(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg.startsWith("--language=")) {
      parsed.languages.push(arg.slice("--language=".length));
      continue;
    }
    if (arg === "--base-url") {
      parsed.baseUrl = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--") {
      parsed.passthrough.push(...argv.slice(index + 1));
      break;
    }
    parsed.passthrough.push(arg);
  }
  return parsed;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const args = parseArgs(process.argv.slice(2));
const openInput = resolveWorkspacePath(args.openInput);
const appInput = resolveWorkspacePath(args.appInput);
const backendInput = resolveWorkspacePath(args.backendInput);
const adminStorageInput = args.adminStorageInput
  ? resolveWorkspacePath(args.adminStorageInput)
  : null;
const outputDir = resolveWorkspacePath(args.outputDir);
const languages = args.allLanguages
  ? OFFICIAL_LANGUAGE_ORDER
  : parseLanguages(args.languages.length > 0 ? args.languages : [DEFAULT_LANGUAGE]);

const exportedOpenapiDir = args.check
  ? path.join(workspaceRoot, "target", "drive-openapi-check")
  : outputDir;
const openExportedOpenapiPath = path.join(exportedOpenapiDir, "drive-open-api.openapi.json");
const appExportedOpenapiPath = path.join(exportedOpenapiDir, "drive-app-api.openapi.json");
const backendExportedOpenapiPath = path.join(
  exportedOpenapiDir,
  "drive-backend-api.openapi.json",
);
const adminStorageExportedOpenapiPath = path.join(
  exportedOpenapiDir,
  "drive-admin-storage-api.openapi.json",
);
const openapiExportArgs = [
  "--output-dir",
  exportedOpenapiDir,
  "--open-input",
  openInput,
  "--app-input",
  appInput,
  "--backend-input",
  backendInput,
];
if (adminStorageInput) {
  openapiExportArgs.push("--admin-storage-input", adminStorageInput);
}
const schemaGateArgs = [
  "--open-openapi",
  openExportedOpenapiPath,
  "--app-openapi",
  appExportedOpenapiPath,
  "--backend-openapi",
  backendExportedOpenapiPath,
  "--admin-storage-openapi",
  adminStorageExportedOpenapiPath,
  "--special-spaces-schema",
  path.join(workspaceRoot, "docs/schema-registry/tables/002-drive-special-spaces.yaml"),
];
runNodeScript("tools/drive_openapi_export.mjs", openapiExportArgs);
runNodeScript("tools/drive_schema_quality_gate.mjs", schemaGateArgs);

if (!args.check) {
  const openSdkArgs = [];
  if (args.allLanguages) {
    openSdkArgs.push("--all-languages");
  } else {
    for (const language of languages) {
      openSdkArgs.push("--language", language);
    }
  }
  openSdkArgs.push("--input", openExportedOpenapiPath);
  if (args.baseUrl && args.baseUrl.trim()) {
    openSdkArgs.push("--base-url", args.baseUrl.trim());
  }
  openSdkArgs.push(...args.passthrough);
  runNodeScript("sdks/sdkwork-drive-sdk/bin/generate-sdk.mjs", openSdkArgs);

  const appSdkArgs = [];
  if (args.allLanguages) {
    appSdkArgs.push("--all-languages");
  } else {
    for (const language of languages) {
      appSdkArgs.push("--language", language);
    }
  }
  appSdkArgs.push("--input", appExportedOpenapiPath);
  if (args.baseUrl && args.baseUrl.trim()) {
    appSdkArgs.push("--base-url", args.baseUrl.trim());
  }
  appSdkArgs.push(...args.passthrough);
  runNodeScript("sdks/sdkwork-drive-app-sdk/bin/generate-sdk.mjs", appSdkArgs);

  const backendSdkArgs = [];
  if (args.allLanguages) {
    backendSdkArgs.push("--all-languages");
  } else {
    for (const language of languages) {
      backendSdkArgs.push("--language", language);
    }
  }
  backendSdkArgs.push("--input", backendExportedOpenapiPath);
  if (args.baseUrl && args.baseUrl.trim()) {
    backendSdkArgs.push("--base-url", args.baseUrl.trim());
  }
  backendSdkArgs.push(...args.passthrough);
  runNodeScript("sdks/sdkwork-drive-backend-sdk/bin/generate-sdk.mjs", [
    ...backendSdkArgs,
  ]);

  const adminStorageSdkArgs = [];
  if (args.allLanguages) {
    adminStorageSdkArgs.push("--all-languages");
  } else {
    for (const language of languages) {
      adminStorageSdkArgs.push("--language", language);
    }
  }
  adminStorageSdkArgs.push("--input", adminStorageExportedOpenapiPath);
  if (args.baseUrl && args.baseUrl.trim()) {
    adminStorageSdkArgs.push("--base-url", args.baseUrl.trim());
  }
  adminStorageSdkArgs.push(...args.passthrough);
  runNodeScript("sdks/sdkwork-drive-admin-storage-sdk/bin/generate-sdk.mjs", [
    ...adminStorageSdkArgs,
  ]);
}

process.stdout.write(
  `[drive_sdk_generate] ${args.check ? "check passed" : "generation completed"}\n`,
);
