#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OFFICIAL_LANGUAGE_ORDER = ["typescript", "rust", "java", "python", "go"];
const DEFAULT_LANGUAGE = "typescript";
const SDK_NAME = "drive-app-sdk";
const SDK_TYPE = "app";
const API_PREFIX = "/app/v3/api";
const DEFAULT_BASE_URL = "http://127.0.0.1:18080";
const FIXED_SDK_VERSION = "0.1.0";

function fail(message) {
  process.stderr.write(`[${SDK_NAME}] ${message}\n`);
  process.exit(1);
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
  const result = {
    allLanguages: false,
    languages: [],
    baseUrl: DEFAULT_BASE_URL,
    input: null,
    passthrough: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--all-languages") {
      result.allLanguages = true;
      continue;
    }
    if (current === "--language") {
      result.languages.push(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current.startsWith("--language=")) {
      result.languages.push(current.slice("--language=".length));
      continue;
    }
    if (current === "--base-url") {
      result.baseUrl = argv[index + 1] || DEFAULT_BASE_URL;
      index += 1;
      continue;
    }
    if (current === "--input") {
      result.input = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (current.startsWith("--input=")) {
      result.input = current.slice("--input=".length);
      continue;
    }
    result.passthrough.push(current);
  }

  return result;
}

function resolveGeneratorCommand() {
  if (process.env.SDKWORK_SDK_GENERATOR_BIN && process.env.SDKWORK_SDK_GENERATOR_BIN.trim()) {
    return process.env.SDKWORK_SDK_GENERATOR_BIN.trim();
  }
  return "sdkwork-sdk-generator";
}

function commandExists(commandName) {
  const probe = process.platform === "win32"
    ? spawnSync("where", [commandName], { stdio: "ignore", shell: true })
    : spawnSync("which", [commandName], { stdio: "ignore" });
  return probe.status === 0;
}

function resolveGeneratorInvocation(workspaceRootPath) {
  const configured = process.env.SDKWORK_SDK_GENERATOR_BIN?.trim();
  if (configured) {
    return {
      command: configured,
      prefixArgs: [],
      shell: true,
    };
  }

  const defaultCommand = resolveGeneratorCommand();
  if (commandExists(defaultCommand)) {
    return {
      command: defaultCommand,
      prefixArgs: [],
      shell: process.platform === "win32",
    };
  }

  const fallbackPath = path.join(workspaceRootPath, "tools", "sdkwork_sdk_generator_stub.mjs");
  process.stdout.write(
    `[${SDK_NAME}] sdkwork-sdk-generator not found, using fallback: ${fallbackPath}\n`,
  );
  return {
    command: "node",
    prefixArgs: [fallbackPath],
    shell: false,
  };
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(sdkRoot, "../..");
const args = parseArgs(process.argv.slice(2));
const openapiPath = args.input
  ? (path.isAbsolute(args.input) ? args.input : path.resolve(workspaceRoot, args.input))
  : path.join(workspaceRoot, "generated/openapi/drive-app-api.openapi.json");
if (!existsSync(openapiPath)) {
  fail(`openapi file not found: ${openapiPath}`);
}
const languages = args.allLanguages
  ? OFFICIAL_LANGUAGE_ORDER
  : parseLanguages(args.languages.length > 0 ? args.languages : [DEFAULT_LANGUAGE]);
const generator = resolveGeneratorInvocation(workspaceRoot);

for (const language of languages) {
  const outputPath = path.join(sdkRoot, `${SDK_NAME}-${language}/generated/server-openapi`);
  const commandArgs = [
    "generate",
    "--input",
    openapiPath,
    "--output",
    outputPath,
    "--name",
    SDK_NAME,
    "--type",
    SDK_TYPE,
    "--language",
    language,
    "--base-url",
    args.baseUrl,
    "--api-prefix",
    API_PREFIX,
    "--fixed-sdk-version",
    FIXED_SDK_VERSION,
    "--sdk-root",
    sdkRoot,
    "--sdk-name",
    SDK_NAME,
    "--package-name",
    `sdkwork-drive-app-api-generated-${language}`,
    "--standard-profile",
    "sdkwork-v3",
    ...args.passthrough,
  ];

  const result = spawnSync(generator.command, [...generator.prefixArgs, ...commandArgs], {
    cwd: sdkRoot,
    stdio: "inherit",
    shell: generator.shell,
  });

  if (result.error) {
    fail(`failed to start generator for ${language}: ${result.error.message}`);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    fail(`generator failed for ${language} with exit code ${result.status}`);
  }
  if (result.signal) {
    fail(`generator terminated by signal ${result.signal}`);
  }
}
