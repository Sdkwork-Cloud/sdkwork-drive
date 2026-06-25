#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);

function fail(message) {
  process.stderr.write(`[sdkwork_sdk_generator_stub] ${message}\n`);
  process.exit(1);
}

function resolveAbsolute(baseDir, inputPath) {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(baseDir, inputPath);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    fail("missing subcommand; expected: generate");
  }
  const subcommand = argv[0];
  if (subcommand !== "generate") {
    fail(`unsupported subcommand: ${subcommand}`);
  }

  const parsed = {};
  for (let index = 1; index < argv.length; index += 1) {
    const keyToken = argv[index];
    if (!keyToken.startsWith("--")) {
      fail(`invalid argument: ${keyToken}`);
    }
    const key = keyToken.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`missing value for --${key}`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function collectOperations(openapiDocument) {
  const operations = [];
  for (const [pathKey, methods] of Object.entries(openapiDocument.paths || {})) {
    if (!methods || typeof methods !== "object") {
      continue;
    }
    for (const [methodName, operation] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(methodName)) {
        continue;
      }
      const operationId = operation?.operationId
        ? String(operation.operationId)
        : `${methodName}.${pathKey}`;
      operations.push({
        operationId,
        method: methodName.toUpperCase(),
        path: pathKey,
      });
    }
  }
  operations.sort((left, right) =>
    left.operationId.localeCompare(right.operationId),
  );
  return operations;
}

function writeLanguageSkeleton(language, outputDir, operations, manifest) {
  if (language === "typescript") {
    const operationLines = operations
      .map(
        (item) =>
          `  "${item.operationId}": { method: "${item.method}", path: "${item.path}" },`,
      )
      .join("\n");
    const source = `export const sdkMetadata = {
  name: "${manifest.sdkName}",
  packageName: "${manifest.packageName}",
  language: "${manifest.language}",
  standardProfile: "${manifest.standardProfile}",
  baseUrl: "${manifest.baseUrl}",
  apiPrefix: "${manifest.apiPrefix}",
};

export const operations = {
${operationLines}
};
`;
    const targetPath = path.join(outputDir, "src", "index.ts");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, source, "utf8");
    return;
  }

  if (language === "rust") {
    const operationLines = operations
      .map(
        (item) =>
          `    ("${item.operationId}", "${item.method}", "${item.path}"),`,
      )
      .join("\n");
    const source = `pub const SDK_NAME: &str = "${manifest.sdkName}";
pub const PACKAGE_NAME: &str = "${manifest.packageName}";
pub const STANDARD_PROFILE: &str = "${manifest.standardProfile}";
pub const BASE_URL: &str = "${manifest.baseUrl}";
pub const API_PREFIX: &str = "${manifest.apiPrefix}";

pub fn operations() -> &'static [(&'static str, &'static str, &'static str)] {
  &[
${operationLines}
  ]
}
`;
    const targetPath = path.join(outputDir, "src", "lib.rs");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, source, "utf8");
    return;
  }

  if (language === "python") {
    const operationLines = operations
      .map(
        (item) =>
          `    "${item.operationId}": {"method": "${item.method}", "path": "${item.path}"},`,
      )
      .join("\n");
    const source = `SDK_NAME = "${manifest.sdkName}"
PACKAGE_NAME = "${manifest.packageName}"
STANDARD_PROFILE = "${manifest.standardProfile}"
BASE_URL = "${manifest.baseUrl}"
API_PREFIX = "${manifest.apiPrefix}"

OPERATIONS = {
${operationLines}
}
`;
    const targetPath = path.join(outputDir, "sdkwork_drive_generated", "__init__.py");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, source, "utf8");
    return;
  }

  if (language === "java") {
    const operationLines = operations
      .map(
        (item) =>
          `    operations.put("${item.operationId}", "${item.method} ${item.path}");`,
      )
      .join("\n");
    const source = `package com.sdkwork.generated;

import java.util.LinkedHashMap;
import java.util.Map;

public final class SdkMetadata {
  public static final String SDK_NAME = "${manifest.sdkName}";
  public static final String PACKAGE_NAME = "${manifest.packageName}";
  public static final String STANDARD_PROFILE = "${manifest.standardProfile}";
  public static final String BASE_URL = "${manifest.baseUrl}";
  public static final String API_PREFIX = "${manifest.apiPrefix}";

  public static Map<String, String> operations() {
    Map<String, String> operations = new LinkedHashMap<>();
${operationLines}
    return operations;
  }

  private SdkMetadata() {}
}
`;
    const targetPath = path.join(
      outputDir,
      "src",
      "main",
      "java",
      "com",
      "sdkwork",
      "generated",
      "SdkMetadata.java",
    );
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, source, "utf8");
    return;
  }

  if (language === "go") {
    const operationLines = operations
      .map(
        (item) =>
          `\t"${item.operationId}": {Method: "${item.method}", Path: "${item.path}"},`,
      )
      .join("\n");
    const source = `package generated

type Operation struct {
\tMethod string
\tPath   string
}

const (
\tSdkName         = "${manifest.sdkName}"
\tPackageName     = "${manifest.packageName}"
\tStandardProfile = "${manifest.standardProfile}"
\tBaseURL         = "${manifest.baseUrl}"
\tApiPrefix       = "${manifest.apiPrefix}"
)

var Operations = map[string]Operation{
${operationLines}
}
`;
    const targetPath = path.join(outputDir, "client.go");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, source, "utf8");
    return;
  }

  fail(`unsupported language: ${language}`);
}

const args = parseArgs(process.argv.slice(2));
const requiredKeys = [
  "input",
  "output",
  "name",
  "type",
  "language",
  "base-url",
  "api-prefix",
  "fixed-sdk-version",
  "sdk-root",
  "sdk-name",
  "package-name",
  "standard-profile",
];
for (const key of requiredKeys) {
  if (!args[key]) {
    fail(`missing required argument: --${key}`);
  }
}
if (args["standard-profile"] !== "sdkwork-v3") {
  fail(`unsupported standard profile: ${args["standard-profile"]}`);
}

const baseDir = process.cwd();
const inputPath = resolveAbsolute(baseDir, args.input);
const outputDir = resolveAbsolute(baseDir, args.output);
if (!existsSync(inputPath)) {
  fail(`input OpenAPI file not found: ${inputPath}`);
}

let openapiDocument;
try {
  openapiDocument = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (error) {
  fail(`failed to parse input OpenAPI JSON: ${error.message}`);
}

const operations = collectOperations(openapiDocument);
const manifest = {
  sdkName: args["sdk-name"],
  packageName: args["package-name"],
  generatorName: "sdkwork_sdk_generator_stub",
  sdkType: args.type,
  language: args.language,
  baseUrl: args["base-url"],
  apiPrefix: args["api-prefix"],
  standardProfile: args["standard-profile"],
  fixedSdkVersion: args["fixed-sdk-version"],
  operationCount: operations.length,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  path.join(outputDir, "sdk-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  path.join(outputDir, "source-openapi.json"),
  `${JSON.stringify(openapiDocument, null, 2)}\n`,
  "utf8",
);
writeLanguageSkeleton(args.language, outputDir, operations, manifest);
writeFileSync(
  path.join(outputDir, "README.md"),
  `# ${manifest.sdkName} (${manifest.language})\n\nGenerated by sdkwork_sdk_generator_stub with profile ${manifest.standardProfile}.\n`,
  "utf8",
);

process.stdout.write(
  `[sdkwork_sdk_generator_stub] generated ${manifest.sdkName} (${manifest.language}) to ${outputDir}\n`,
);
