import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdksRoot = path.resolve(testDir, "..");
const workspaceRoot = path.resolve(sdksRoot, "..");

const families = [
  {
    root: "sdkwork-drive-sdk",
    owner: "sdkwork-drive",
    authority: "sdkwork-drive.open",
    input: "generated/openapi/drive-open-api.openapi.json",
  },
  {
    root: "sdkwork-drive-app-sdk",
    owner: "sdkwork-drive",
    authority: "sdkwork-drive.app",
    input: "generated/openapi/drive-app-api.openapi.json",
    dependencyWorkspace: "sdkwork-appbase-app-sdk",
    dependencyAuthority: "sdkwork-appbase.app",
  },
  {
    root: "sdkwork-drive-backend-sdk",
    owner: "sdkwork-drive",
    authority: "sdkwork-drive.backend",
    input: "generated/openapi/drive-backend-api.openapi.json",
    dependencyWorkspace: "sdkwork-appbase-backend-sdk",
    dependencyAuthority: "sdkwork-appbase.backend",
  },
  {
    root: "sdkwork-drive-admin-storage-sdk",
    owner: "sdkwork-drive",
    authority: "sdkwork-drive.admin.storage",
    input: "generated/openapi/drive-admin-storage-api.openapi.json",
    dependencyWorkspace: "sdkwork-appbase-backend-sdk",
    dependencyAuthority: "sdkwork-appbase.backend",
  },
];

const appbaseOwnedPathPrefixes = [
  "/app/v3/api/auth/",
  "/app/v3/api/iam/",
  "/app/v3/api/open_platform/",
  "/app/v3/api/system/iam/",
  "/backend/v3/api/auth/",
  "/backend/v3/api/iam/",
  "/backend/v3/api/open_platform/",
  "/backend/v3/api/system/iam/",
];

function isAllowedComposedAppbaseRoute(family, pathKey, operation) {
  return (
    family.root === "sdkwork-drive-app-sdk" &&
    appbaseOwnedPathPrefixes.some((prefix) => pathKey.startsWith(prefix)) &&
    operation["x-sdkwork-composed-from-owner"] === "sdkwork-appbase" &&
    String(operation["x-sdkwork-composed-from-api-authority"] || "").startsWith("sdkwork-appbase")
  );
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
}

function operationEntries(openapi) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(openapi.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!["get", "put", "post", "patch", "delete", "head", "options", "trace"].includes(method)) {
        continue;
      }
      entries.push({ pathKey, method, operation });
    }
  }
  return entries;
}

test("drive SDK family assemblies declare owner-only authority metadata", () => {
  for (const family of families) {
    const assembly = readJson(path.join("sdks", family.root, ".sdkwork-assembly.json"));

    assert.equal(assembly.sdkOwner, family.owner, `${family.root} must declare sdkOwner`);
    assert.equal(assembly.apiAuthority, family.authority, `${family.root} must declare apiAuthority`);
    assert.equal(
      assembly.generationInputSpec,
      `../../${family.input.replaceAll("\\", "/")}`,
      `${family.root} must generate from its owner-only input`,
    );

    if (family.dependencyWorkspace) {
      assert.deepEqual(
        assembly.sdkDependencies?.map((dependency) => ({
          workspace: dependency.workspace,
          apiAuthority: dependency.apiAuthority,
          dependencyMode: dependency.dependencyMode,
          generatedTransportImportPolicy: dependency.generatedTransportImportPolicy,
        })),
        [
          {
            workspace: family.dependencyWorkspace,
            apiAuthority: family.dependencyAuthority,
            dependencyMode: "consumer-sdk",
            generatedTransportImportPolicy: "forbidden",
          },
        ],
        `${family.root} must declare appbase as a consumer SDK dependency`,
      );
    }
  }
});

test("drive generated OpenAPI inputs contain only sdkwork-drive owned operations", () => {
  for (const family of families) {
    const openapi = readJson(family.input);
    assert.equal(openapi["x-sdkwork-owner"], family.owner);
    assert.equal(openapi["x-sdkwork-api-authority"], family.authority);

    for (const { pathKey, method, operation } of operationEntries(openapi)) {
      assert.equal(
        operation["x-sdkwork-owner"],
        family.owner,
        `${family.root} ${method.toUpperCase()} ${pathKey} must be drive-owned`,
      );
      assert.equal(
        operation["x-sdkwork-api-authority"],
        family.authority,
        `${family.root} ${method.toUpperCase()} ${pathKey} must use ${family.authority}`,
      );
      if (appbaseOwnedPathPrefixes.some((prefix) => pathKey.startsWith(prefix))) {
        assert(
          isAllowedComposedAppbaseRoute(family, pathKey, operation),
          `${family.root} must not copy appbase-owned route ${method.toUpperCase()} ${pathKey} without explicit composed-from metadata`,
        );
      }
    }
  }
});
