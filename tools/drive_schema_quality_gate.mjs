#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const defaultAppOpenapiPath = path.join(
  workspaceRoot,
  "generated",
  "openapi",
  "drive-app-api.openapi.json",
);
const defaultBackendOpenapiPath = path.join(
  workspaceRoot,
  "generated",
  "openapi",
  "drive-backend-api.openapi.json",
);
const defaultSpecialSpacesSchemaPath = path.join(
  workspaceRoot,
  "docs",
  "schema-registry",
  "tables",
  "002-drive-special-spaces.yaml",
);
const defaultSecurityAuditSchemaPath = path.join(
  workspaceRoot,
  "docs",
  "schema-registry",
  "tables",
  "004-drive-security-audit.yaml",
);
const defaultStorageSchemaPath = path.join(
  workspaceRoot,
  "docs",
  "schema-registry",
  "tables",
  "003-drive-storage.yaml",
);
const STORAGE_PROVIDER_KIND_ENUM = [
  "local_filesystem",
  "s3_compatible",
  "azure_blob",
  "google_cloud_storage",
  "aliyun_oss",
];
const STORAGE_PROVIDER_KIND_PATTERN =
  "^(local_filesystem|s3_compatible|azure_blob|google_cloud_storage|aliyun_oss|custom:[a-z0-9_-]{2,32})$";

function fail(message) {
  process.stderr.write(`[drive_schema_quality_gate] ${message}\n`);
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

function parseArgs(argv) {
  const parsed = {
    appOpenapiPath: defaultAppOpenapiPath,
    backendOpenapiPath: defaultBackendOpenapiPath,
    specialSpacesSchemaPath: defaultSpecialSpacesSchemaPath,
    securityAuditSchemaPath: defaultSecurityAuditSchemaPath,
    storageSchemaPath: defaultStorageSchemaPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--app-openapi") {
      parsed.appOpenapiPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--backend-openapi") {
      parsed.backendOpenapiPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--special-spaces-schema") {
      parsed.specialSpacesSchemaPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--security-audit-schema") {
      parsed.securityAuditSchemaPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (current === "--storage-schema") {
      parsed.storageSchemaPath = resolveWorkspacePath(argv[index + 1] || "");
      index += 1;
      continue;
    }
    fail(`unknown argument: ${current}`);
  }

  return parsed;
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    fail(`missing file: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid json ${filePath}: ${error.message}`);
  }
}

function assertPathExists(document, pathKey, label) {
  if (!document.paths || !document.paths[pathKey]) {
    fail(`${label} missing path: ${pathKey}`);
  }
}

function assertProblemDetailSchema(document, label) {
  if (!document.components || !document.components.schemas || !document.components.schemas.ProblemDetail) {
    fail(`${label} missing components.schemas.ProblemDetail`);
  }
  const properties = document.components.schemas.ProblemDetail.properties || {};
  const requiredProperties = ["type", "title", "status", "detail", "code", "traceId", "requestId"];
  for (const propertyName of requiredProperties) {
    if (!properties[propertyName]) {
      fail(`${label} ProblemDetail missing property: ${propertyName}`);
    }
  }
}

function assertSchemaHasProperties(document, schemaName, requiredProperties, label) {
  const schemas = document.components && document.components.schemas;
  if (!schemas || !schemas[schemaName]) {
    fail(`${label} missing components.schemas.${schemaName}`);
  }
  const properties = schemas[schemaName].properties || {};
  for (const propertyName of requiredProperties) {
    if (!properties[propertyName]) {
      fail(`${label} ${schemaName} missing property: ${propertyName}`);
    }
  }
}

function assertSchemaPropertyFormat(document, schemaName, propertyName, expectedFormat, label) {
  const schemas = document.components && document.components.schemas;
  if (!schemas || !schemas[schemaName]) {
    fail(`${label} missing components.schemas.${schemaName}`);
  }
  const properties = schemas[schemaName].properties || {};
  const property = properties[propertyName];
  if (!property) {
    fail(`${label} ${schemaName} missing property: ${propertyName}`);
  }
  if (property.format !== expectedFormat) {
    fail(
      `${label} ${schemaName}.${propertyName} format must be ${expectedFormat}, got ${String(property.format)}`,
    );
  }
}

function assertSchemaPropertyEnum(document, schemaName, propertyName, expectedValues, label) {
  const schemas = document.components && document.components.schemas;
  if (!schemas || !schemas[schemaName]) {
    fail(`${label} missing components.schemas.${schemaName}`);
  }
  const properties = schemas[schemaName].properties || {};
  const property = properties[propertyName];
  if (!property) {
    fail(`${label} ${schemaName} missing property: ${propertyName}`);
  }
  if (!Array.isArray(property.enum)) {
    fail(`${label} ${schemaName}.${propertyName} enum must be an array`);
  }

  const actual = [...property.enum].map((value) => String(value)).sort();
  const expected = [...expectedValues].map((value) => String(value)).sort();
  if (actual.length !== expected.length) {
    fail(
      `${label} ${schemaName}.${propertyName} enum mismatch: expected ${expected.join(",")}, got ${actual.join(",")}`,
    );
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      fail(
        `${label} ${schemaName}.${propertyName} enum mismatch: expected ${expected.join(",")}, got ${actual.join(",")}`,
      );
    }
  }
}

function assertSchemaPropertyStringConstraints(
  document,
  schemaName,
  propertyName,
  expectedMaxLength,
  expectedPattern,
  label,
) {
  const schemas = document.components && document.components.schemas;
  if (!schemas || !schemas[schemaName]) {
    fail(`${label} missing components.schemas.${schemaName}`);
  }
  const properties = schemas[schemaName].properties || {};
  const property = properties[propertyName];
  if (!property) {
    fail(`${label} ${schemaName} missing property: ${propertyName}`);
  }
  if (property.maxLength !== expectedMaxLength) {
    fail(
      `${label} ${schemaName}.${propertyName} maxLength must be ${expectedMaxLength}, got ${String(property.maxLength)}`,
    );
  }
  if (property.pattern !== expectedPattern) {
    fail(
      `${label} ${schemaName}.${propertyName} pattern must be ${expectedPattern}, got ${String(property.pattern)}`,
    );
  }
}

function assertSchemaPropertyEnumAndPattern(
  document,
  schemaName,
  propertyName,
  expectedValues,
  expectedPattern,
  label,
) {
  assertSchemaPropertyEnum(document, schemaName, propertyName, expectedValues, label);
  const schemas = document.components && document.components.schemas;
  if (!schemas || !schemas[schemaName]) {
    fail(`${label} missing components.schemas.${schemaName}`);
  }
  const properties = schemas[schemaName].properties || {};
  const property = properties[propertyName];
  if (!property) {
    fail(`${label} ${schemaName} missing property: ${propertyName}`);
  }
  if (property.pattern !== expectedPattern) {
    fail(
      `${label} ${schemaName}.${propertyName} pattern must be ${expectedPattern}, got ${String(property.pattern)}`,
    );
  }
}

function assertQueryParameterEnum(
  document,
  pathKey,
  method,
  parameterName,
  expectedValues,
  label,
) {
  const pathItem = document.paths && document.paths[pathKey];
  if (!pathItem || !pathItem[method]) {
    fail(`${label} missing ${method.toUpperCase()} ${pathKey}`);
  }
  const parameters = Array.isArray(pathItem[method].parameters) ? pathItem[method].parameters : [];
  const parameter = parameters.find(
    (item) => item && item.in === "query" && item.name === parameterName,
  );
  if (!parameter) {
    fail(`${label} missing query parameter ${parameterName} at ${method.toUpperCase()} ${pathKey}`);
  }
  const enumValues = parameter.schema && Array.isArray(parameter.schema.enum)
    ? parameter.schema.enum.map((value) => String(value)).sort()
    : null;
  if (!enumValues) {
    fail(
      `${label} query parameter ${parameterName} enum must be present at ${method.toUpperCase()} ${pathKey}`,
    );
  }

  const expected = expectedValues.map((value) => String(value)).sort();
  if (enumValues.length !== expected.length) {
    fail(
      `${label} query parameter ${parameterName} enum mismatch at ${method.toUpperCase()} ${pathKey}: expected ${expected.join(",")}, got ${enumValues.join(",")}`,
    );
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (enumValues[index] !== expected[index]) {
      fail(
        `${label} query parameter ${parameterName} enum mismatch at ${method.toUpperCase()} ${pathKey}: expected ${expected.join(",")}, got ${enumValues.join(",")}`,
      );
    }
  }
}

function assertQueryParameterStringConstraints(
  document,
  pathKey,
  method,
  parameterName,
  expectedMaxLength,
  expectedPattern,
  label,
) {
  const pathItem = document.paths && document.paths[pathKey];
  if (!pathItem || !pathItem[method]) {
    fail(`${label} missing ${method.toUpperCase()} ${pathKey}`);
  }
  const parameters = Array.isArray(pathItem[method].parameters) ? pathItem[method].parameters : [];
  const parameter = parameters.find(
    (item) => item && item.in === "query" && item.name === parameterName,
  );
  if (!parameter) {
    fail(`${label} missing query parameter ${parameterName} at ${method.toUpperCase()} ${pathKey}`);
  }
  const schema = parameter.schema || {};
  if (schema.maxLength !== expectedMaxLength) {
    fail(
      `${label} query parameter ${parameterName} maxLength must be ${expectedMaxLength} at ${method.toUpperCase()} ${pathKey}, got ${String(schema.maxLength)}`,
    );
  }
  if (schema.pattern !== expectedPattern) {
    fail(
      `${label} query parameter ${parameterName} pattern must be ${expectedPattern} at ${method.toUpperCase()} ${pathKey}, got ${String(schema.pattern)}`,
    );
  }
}

function assertOpenapiVersion31(document, label) {
  if (!document.openapi || !String(document.openapi).startsWith("3.1")) {
    fail(`${label} must use OpenAPI 3.1.x`);
  }
}

function assertPathPrefix(document, prefix, label) {
  for (const pathKey of Object.keys(document.paths || {})) {
    if (!pathKey.startsWith(prefix)) {
      fail(`${label} path must start with ${prefix}: ${pathKey}`);
    }
  }
}

function collectOperationIds(document, label) {
  const httpMethods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);
  const ids = [];
  for (const [pathKey, methods] of Object.entries(document.paths || {})) {
    if (!methods || typeof methods !== "object") {
      continue;
    }
    for (const [methodName, operation] of Object.entries(methods)) {
      if (!httpMethods.has(methodName)) {
        continue;
      }
      const operationId = operation && operation.operationId ? String(operation.operationId) : "";
      if (!operationId) {
        fail(`${label} ${methodName.toUpperCase()} ${pathKey} missing operationId`);
      }
      if (!operationId.includes(".")) {
        fail(`${label} operationId must be dotted: ${operationId}`);
      }
      ids.push(operationId);
    }
  }
  return ids;
}

function assertUniqueOperationIds(operationIds, label) {
  const seen = new Set();
  for (const operationId of operationIds) {
    if (seen.has(operationId)) {
      fail(`${label} duplicated operationId: ${operationId}`);
    }
    seen.add(operationId);
  }
}

function assertContains(source, marker, label) {
  if (!source.includes(marker)) {
    fail(`${label} missing marker: ${marker}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const appOpenapi = readJson(args.appOpenapiPath);
const backendOpenapi = readJson(args.backendOpenapiPath);
const specialSpacesSchema = readFileSync(args.specialSpacesSchemaPath, "utf8");
const securityAuditSchema = readFileSync(args.securityAuditSchemaPath, "utf8");
const storageSchema = readFileSync(args.storageSchemaPath, "utf8");

assertOpenapiVersion31(appOpenapi, "app openapi");
assertOpenapiVersion31(backendOpenapi, "backend openapi");
assertPathPrefix(appOpenapi, "/app/v3/api", "app openapi");
assertPathPrefix(backendOpenapi, "/backend/v3/api", "backend openapi");

assertPathExists(appOpenapi, "/app/v3/api/drive/spaces", "app openapi");
assertPathExists(appOpenapi, "/app/v3/api/drive/upload_sessions", "app openapi");
assertPathExists(appOpenapi, "/app/v3/api/drive/download_urls", "app openapi");
assertPathExists(
  appOpenapi,
  "/app/v3/api/drive/download_tokens/{token}",
  "app openapi",
);
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/storage_providers",
  "backend openapi",
);
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/storage_providers/{providerId}",
  "backend openapi",
);
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/storage_providers/{providerId}/test",
  "backend openapi",
);
assertPathExists(backendOpenapi, "/backend/v3/api/drive/audit_events", "backend openapi");
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/object_sweep",
  "backend openapi",
);
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/upload_session_sweep",
  "backend openapi",
);
assertPathExists(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/jobs",
  "backend openapi",
);
assertPathExists(backendOpenapi, "/backend/v3/api/drive/spaces", "backend openapi");
assertPathExists(backendOpenapi, "/backend/v3/api/drive/quotas", "backend openapi");
assertProblemDetailSchema(appOpenapi, "app openapi");
assertProblemDetailSchema(backendOpenapi, "backend openapi");
assertSchemaHasProperties(
  backendOpenapi,
  "SweepObjectStoreRequest",
  ["requestId", "traceId"],
  "backend openapi",
);
assertSchemaHasProperties(
  backendOpenapi,
  "SweepUploadSessionsRequest",
  ["requestId", "traceId"],
  "backend openapi",
);
for (const fieldName of ["startedAt", "finishedAt", "createdAt"]) {
  assertSchemaPropertyFormat(
    backendOpenapi,
    "MaintenanceJob",
    fieldName,
    "date-time",
    "backend openapi",
  );
}
assertSchemaPropertyEnum(
  backendOpenapi,
  "CreateStorageProviderRequest",
  "providerKind",
  STORAGE_PROVIDER_KIND_ENUM,
  "backend openapi",
);
assertSchemaPropertyEnumAndPattern(
  backendOpenapi,
  "StorageProvider",
  "providerKind",
  STORAGE_PROVIDER_KIND_ENUM,
  STORAGE_PROVIDER_KIND_PATTERN,
  "backend openapi",
);
assertSchemaPropertyEnumAndPattern(
  backendOpenapi,
  "CreateStorageProviderRequest",
  "providerKind",
  STORAGE_PROVIDER_KIND_ENUM,
  STORAGE_PROVIDER_KIND_PATTERN,
  "backend openapi",
);
assertSchemaHasProperties(
  backendOpenapi,
  "CreateStorageProviderRequest",
  [
    "name",
    "region",
    "pathStyle",
    "serverSideEncryptionMode",
    "defaultStorageClass",
  ],
  "backend openapi",
);
assertSchemaHasProperties(
  backendOpenapi,
  "UpdateStorageProviderRequest",
  [
    "name",
    "region",
    "pathStyle",
    "serverSideEncryptionMode",
    "defaultStorageClass",
  ],
  "backend openapi",
);
assertSchemaHasProperties(
  backendOpenapi,
  "StorageProvider",
  [
    "name",
    "region",
    "pathStyle",
    "serverSideEncryptionMode",
    "defaultStorageClass",
  ],
  "backend openapi",
);
assertSchemaPropertyEnum(
  backendOpenapi,
  "MaintenanceJob",
  "jobType",
  ["object_sweep", "upload_session_sweep"],
  "backend openapi",
);
assertSchemaPropertyEnum(
  backendOpenapi,
  "MaintenanceJob",
  "status",
  ["completed", "failed"],
  "backend openapi",
);
for (const schemaName of ["SweepObjectStoreRequest", "SweepUploadSessionsRequest"]) {
  assertSchemaPropertyStringConstraints(
    backendOpenapi,
    schemaName,
    "operatorId",
    128,
    "^[A-Za-z0-9._:@-]+$",
    "backend openapi",
  );
  assertSchemaPropertyStringConstraints(
    backendOpenapi,
    schemaName,
    "requestId",
    64,
    "^[A-Za-z0-9._:@-]+$",
    "backend openapi",
  );
  assertSchemaPropertyStringConstraints(
    backendOpenapi,
    schemaName,
    "traceId",
    128,
    "^[A-Za-z0-9._:@-]+$",
    "backend openapi",
  );
}
assertSchemaPropertyStringConstraints(
  backendOpenapi,
  "MaintenanceJob",
  "operatorId",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertSchemaPropertyStringConstraints(
  backendOpenapi,
  "MaintenanceJob",
  "requestId",
  64,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertSchemaPropertyStringConstraints(
  backendOpenapi,
  "MaintenanceJob",
  "traceId",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterEnum(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/jobs",
  "get",
  "jobType",
  ["object_sweep", "upload_session_sweep"],
  "backend openapi",
);
assertQueryParameterEnum(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/jobs",
  "get",
  "status",
  ["completed", "failed"],
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/maintenance/jobs",
  "get",
  "operatorId",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/audit_events",
  "get",
  "action",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/audit_events",
  "get",
  "resourceType",
  64,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/audit_events",
  "get",
  "resourceId",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/audit_events",
  "get",
  "requestId",
  64,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertQueryParameterStringConstraints(
  backendOpenapi,
  "/backend/v3/api/drive/audit_events",
  "get",
  "traceId",
  128,
  "^[A-Za-z0-9._:@-]+$",
  "backend openapi",
);
assertUniqueOperationIds(collectOperationIds(appOpenapi, "app openapi"), "app openapi");
assertUniqueOperationIds(
  collectOperationIds(backendOpenapi, "backend openapi"),
  "backend openapi",
);

assertContains(
  specialSpacesSchema,
  "drive_knowledge_space_profile",
  "special spaces schema",
);
assertContains(
  specialSpacesSchema,
  "drive_ai_generation_space_profile",
  "special spaces schema",
);
assertContains(
  specialSpacesSchema,
  "drive_app_upload_space_profile",
  "special spaces schema",
);
for (const indexName of [
  "ix_drive_audit_event_tenant_created",
  "ix_drive_audit_event_resource",
  "ix_drive_audit_event_action_created",
  "ix_drive_audit_event_request_created",
  "ix_drive_audit_event_trace_created",
]) {
  assertContains(securityAuditSchema, indexName, "security audit schema");
}
assertContains(storageSchema, "drive_storage_provider", "storage schema");
assertContains(storageSchema, "provider_kind", "storage schema");
for (const fieldName of [
  "name",
  "region",
  "path_style",
  "server_side_encryption_mode",
  "default_storage_class",
]) {
  assertContains(storageSchema, fieldName, "storage schema");
}
assertContains(
  storageSchema,
  "local_filesystem, s3_compatible, azure_blob, google_cloud_storage, aliyun_oss",
  "storage schema",
);
assertContains(storageSchema, STORAGE_PROVIDER_KIND_PATTERN, "storage schema");

process.stdout.write("[drive_schema_quality_gate] passed\n");
