#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testFiles = [
  'crates/sdkwork-router-drive-app-api/tests/command_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/observability_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/version_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/drive_routes.rs',
];

function defaultUserForTenant(tenant) {
  if (tenant.startsWith('tenant-')) {
    return `user-${tenant.slice('tenant-'.length)}`;
  }
  return 'user-001';
}

function tenantFromUri(uri) {
  const match = uri.match(/[?&]tenantId=([^&"']+)/);
  return match?.[1] ?? null;
}

function userFromUri(uri, tenant) {
  const subjectMatch = uri.match(/[?&]subjectId=([^&"']+)/);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  const operatorMatch = uri.match(/[?&]operatorId=([^&"']+)/);
  if (operatorMatch) {
    return operatorMatch[1];
  }
  return defaultUserForTenant(tenant);
}

function tenantFromJson(jsonText) {
  const match = jsonText.match(/"tenantId"\s*:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function userFromJson(jsonText, tenant) {
  const operatorMatch = jsonText.match(/"operatorId"\s*:\s*"([^"]+)"/);
  if (operatorMatch) {
    return operatorMatch[1];
  }
  const subjectMatch = jsonText.match(/"subjectId"\s*:\s*"([^"]+)"/);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  return defaultUserForTenant(tenant);
}

function tenantFromSqlContext(context) {
  const matches = [...context.matchAll(/tenant_id='([^']+)'/gi)];
  return matches.at(-1)?.[1] ?? null;
}

function stripTenantIdFromUri(uri) {
  return uri
    .replace(/([?&])tenantId=[^&"']+&/g, '$1')
    .replace(/&tenantId=[^&"']+/g, '')
    .replace(/\?tenantId=[^&"']+(?=")/g, '');
}

function stripTenantIdFromJson(jsonText) {
  return jsonText
    .replace(/"tenantId"\s*:\s*"[^"]*"\s*,\s*/g, '')
    .replace(/,\s*"tenantId"\s*:\s*"[^"]*"/g, '')
    .replace(/"tenantId"\s*:\s*"[^"]*"/g, '');
}

function authHeaderBlock(indent, tenant, user) {
  return `${indent}.header(
${indent}    "authorization",
${indent}    format!("Bearer {}", common::auth_token("${tenant}", "${user}")),
${indent})
${indent}.header("access-token", common::access_token("${tenant}", "${user}"))`;
}

function stripAuthHeaders(block) {
  return block
    .replace(/\n\s*\.header\(\s*\n\s*"authorization",[\s\S]*?\)\s*\n\s*\.header\(\s*\n\s*"access-token",[\s\S]*?\)\s*/g, '\n')
    .replace(/\n\s*\.header\(\s*"authorization",[\s\S]*?\)\s*\n\s*\.header\(\s*"access-token",[\s\S]*?\)\s*/g, '\n');
}

function inferAuthPair(context) {
  const uriMatch = context.match(/\.uri\(([^)\n]+)\)/);
  const bodyMatch = context.match(/Body::from\(\s*r#"(.*?)"#/s) ?? context.match(/Body::from\(\s*"(.*?)"\s*\)/s);
  const uriLiteral = uriMatch?.[1] ?? '';
  const bodyLiteral = bodyMatch?.[1] ?? '';
  const tenant =
    tenantFromUri(uriLiteral) ??
    tenantFromJson(bodyLiteral) ??
    tenantFromSqlContext(context) ??
    'tenant-001';
  const user = userFromUri(uriLiteral, tenant) ?? userFromJson(bodyLiteral, tenant);
  return { tenant, user };
}

function migrateRequestBlocks(source) {
  const lines = source.split('\n');
  let output = '';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (
      line.includes('async fn fetch_paged_items(')
      || line.includes('async fn fetch_json(')
    ) {
      output += `${line}\n`;
      index += 1;
      while (index < lines.length && !/^}\s*$/.test(lines[index])) {
        output += `${lines[index]}\n`;
        index += 1;
      }
      if (index < lines.length) {
        output += `${lines[index]}\n`;
        index += 1;
      }
      continue;
    }
    if (!line.includes('Request::builder()')) {
      output += `${line}\n`;
      index += 1;
      continue;
    }

    const builderLine = line;
    const builderStart = output.length;
    output += `${builderLine}\n`;
    index += 1;

    let rest = '';
    while (index < lines.length) {
      rest += `${lines[index]}\n`;
      if (/^\s*\.expect\([^\n]+\)\s*$/.test(lines[index])) {
        index += 1;
        break;
      }
      index += 1;
    }

    const blockStartLine = output.slice(0, builderStart).split('\n').length - 1;
    const context = source.split('\n').slice(Math.max(0, blockStartLine - 40), index).join('\n');
    const { tenant, user } = inferAuthPair(`${context}\n${rest}`);
    let cleanedRest = stripAuthHeaders(rest);
    cleanedRest = cleanedRest.replace(/\.uri\("([^"]*)"\)/g, (_, uri) => `.uri("${stripTenantIdFromUri(uri)}")`);
    cleanedRest = cleanedRest.replace(/Body::from\(\s*r#"(.*?)"#/gs, (full, raw) => {
      if (!raw.includes('tenantId')) {
        return full;
      }
      return `Body::from(r#"${stripTenantIdFromJson(raw)}"#`;
    });
    cleanedRest = cleanedRest.replace(
      /format!\(\s*\n?\s*"([^"]*tenantId=[^"]*)"\s*\)/g,
      (_, template) => `format!(\n            "${stripTenantIdFromUri(template)}"\n        )`,
    );

    const indent = builderLine.match(/^(\s*)/)?.[1] ?? '';
    output += `${authHeaderBlock(indent, tenant, user)}\n${cleanedRest}`;
  }

  return output.replace(/\n$/, '');
}

function stripTenantIdLiterals(source) {
  return source
    .replace(/\?tenantId=[^&"']+&/g, '?')
    .replace(/&tenantId=[^&"']+/g, '')
    .replace(/\?tenantId=[^&"']+(?=")/g, '');
}

function stripTenantIdFromJsonBodies(source) {
  return source
    .replace(/"tenantId"\s*:\s*"[^"]*"\s*,\s*\n/g, '')
    .replace(/"tenantId"\s*:\s*"[^"]*"\s*,\s*/g, '')
    .replace(/,\s*\n?\s*"tenantId"\s*:\s*"[^"]*"/g, '');
}

function ensureCommonModule(source) {
  if (source.includes('mod common;')) {
    return source;
  }
  const useEnd = source.lastIndexOf('\nuse ');
  if (useEnd === -1) {
    return `mod common;\n\n${source}`;
  }
  const lineEnd = source.indexOf('\n', useEnd + 1);
  return `${source.slice(0, lineEnd + 1)}\nmod common;\n${source.slice(lineEnd + 1)}`;
}

for (const relativeFile of testFiles) {
  const absolutePath = path.join(repoRoot, relativeFile);
  let source = fs.readFileSync(absolutePath, 'utf8');
  source = ensureCommonModule(source);
  source = source.replace(
    /use sdkwork_router_drive_app_api::build_router_with_pool;\n?/g,
    '',
  );
  source = source.replaceAll('build_router_with_pool(', 'common::test_router_with_pool(');
  source = migrateRequestBlocks(source);
  // Keep tenantId in fetch_* URI literals; helpers strip before dispatch and infer auth first.
  fs.writeFileSync(absolutePath, `${source}\n`);
  const count = (source.match(/common::auth_token\(/g) ?? []).length;
  process.stdout.write(`${relativeFile}: normalized ${count} authed requests\n`);
}
