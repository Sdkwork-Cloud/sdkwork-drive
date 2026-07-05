#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceOpenapiPath = path.join(
  repoRoot,
  "apis",
  "app-api",
  "drive",
  "drive-app-api.openapi.json",
);
const sdkName = "sdkwork-drive-app-sdk";

if (!existsSync(sourceOpenapiPath)) {
  console.error(`materialize_drive_sdk_generator_input: missing ${sourceOpenapiPath}`);
  process.exit(1);
}

const { toOwnerOnlyOpenApi } = await import(
  pathToFileURL(path.join(repoRoot, "tools", "drive_sdk_generator_runner.mjs")).href
);

const openapiDocument = JSON.parse(readFileSync(sourceOpenapiPath, "utf8"));
const ownerOnlyDocument = toOwnerOnlyOpenApi(openapiDocument);
const outputDir = path.join(repoRoot, "target", "drive-sdk-generator-input", sdkName);
mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, path.basename(sourceOpenapiPath));
writeFileSync(outputPath, `${JSON.stringify(ownerOnlyDocument, null, 2)}\n`, "utf8");

if (!/SdkWorkApiResponse/.test(JSON.stringify(ownerOnlyDocument))) {
  console.error(
    "materialize_drive_sdk_generator_input: owner-only OpenAPI is missing SdkWorkApiResponse envelope schemas",
  );
  process.exit(1);
}

console.log(`materialize_drive_sdk_generator_input: wrote ${path.relative(repoRoot, outputPath)}`);
