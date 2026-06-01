#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const generatedOpenapiDir = path.join(workspaceRoot, "generated", "openapi");
const defaultAppOpenapiPath = path.join(
  generatedOpenapiDir,
  "drive-app-api.openapi.json",
);
const defaultBackendOpenapiPath = path.join(
  generatedOpenapiDir,
  "drive-backend-api.openapi.json",
);

function fail(message) {
  process.stderr.write(`[drive_openapi_export] ${message}\n`);
  process.exit(1);
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

function ensureReadableJson(filePath) {
  if (!existsSync(filePath)) {
    fail(`missing OpenAPI file: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${filePath}: ${error.message}`);
  }
}

function normalizeOpenapiDocument(document, label) {
  if (!document || typeof document !== "object") {
    fail(`${label} is not a JSON object`);
  }
  if (!document.openapi || !String(document.openapi).startsWith("3.1")) {
    fail(`${label} must use OpenAPI 3.1.x`);
  }
  if (!document.info || typeof document.info !== "object") {
    fail(`${label} missing info object`);
  }
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    outputDir: generatedOpenapiDir,
    appInput: defaultAppOpenapiPath,
    backendInput: defaultBackendOpenapiPath,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--check") {
      parsed.check = true;
      continue;
    }
    if (current === "--app-input") {
      parsed.appInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--backend-input") {
      parsed.backendInput = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--output-dir") {
      parsed.outputDir = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    fail(`unknown argument: ${current}`);
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const appOpenapi = ensureReadableJson(args.appInput);
const backendOpenapi = ensureReadableJson(args.backendInput);
normalizeOpenapiDocument(appOpenapi, "app openapi");
normalizeOpenapiDocument(backendOpenapi, "backend openapi");

if (!args.check) {
  mkdirSync(args.outputDir, { recursive: true });
  writeFileSync(
    path.join(args.outputDir, "drive-app-api.openapi.json"),
    `${JSON.stringify(appOpenapi, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.outputDir, "drive-backend-api.openapi.json"),
    `${JSON.stringify(backendOpenapi, null, 2)}\n`,
    "utf8",
  );
}

process.stdout.write("[drive_openapi_export] ok\n");
