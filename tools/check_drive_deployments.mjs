#!/usr/bin/env node
/**
 * Validates deployment descriptor presence for SDKWork Drive.
 * Governed by DEPLOYMENT_SPEC.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function deploymentBlock(manifest, deploymentName) {
  const start = manifest.indexOf(`name: ${deploymentName}`);
  if (start < 0) {
    return null;
  }
  const end = manifest.indexOf('\n---', start);
  return end < 0 ? manifest.slice(start) : manifest.slice(start, end);
}

function requirePath(relativePath, reason) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} is required (${reason})`);
  }
}

requirePath('deployments/kubernetes/drive-services.yaml', 'cloud HA topology');

const kubernetesManifest = fs.readFileSync(
  path.join(repoRoot, 'deployments/kubernetes/drive-services.yaml'),
  'utf8',
);
if (!/kind:\s*Ingress/u.test(kubernetesManifest)) {
  failures.push('deployments/kubernetes/drive-services.yaml must declare an Ingress resource');
}
if (!/nginx\.ingress\.kubernetes\.io\/limit-rps/u.test(kubernetesManifest)) {
  failures.push('drive Kubernetes Ingress must configure nginx limit-rps edge rate limiting');
}
for (const deploymentName of [
  'sdkwork-drive-app-api',
  'sdkwork-drive-backend-api',
  'sdkwork-drive-open-api',
]) {
  const block = deploymentBlock(kubernetesManifest, deploymentName);
  if (!block) {
    failures.push(`deployments/kubernetes/drive-services.yaml must declare Deployment ${deploymentName}`);
    continue;
  }
  if (!/OTEL_EXPORTER_OTLP_ENDPOINT/u.test(block)) {
    failures.push(`${deploymentName} Deployment must configure OTEL_EXPORTER_OTLP_ENDPOINT`);
  }
  if (!/OTEL_SERVICE_NAME/u.test(block)) {
    failures.push(`${deploymentName} Deployment must configure OTEL_SERVICE_NAME`);
  }
}
for (const deploymentName of ['sdkwork-drive-app-api', 'sdkwork-drive-backend-api']) {
  const block = deploymentBlock(kubernetesManifest, deploymentName);
  if (!block) {
    continue;
  }
  if (!/sdkwork-drive-iam/u.test(block)) {
    failures.push(
      `${deploymentName} Deployment must mount sdkwork-drive-iam secrets for production JWT validation`,
    );
  }
}
for (const [deploymentName, envName] of [
  ['sdkwork-drive-app-api', 'SDKWORK_DRIVE_APP_API_RATE_LIMIT_MAX_REQUESTS'],
  ['sdkwork-drive-open-api', 'SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_MAX_REQUESTS'],
]) {
  const block = deploymentBlock(kubernetesManifest, deploymentName);
  if (!block) {
    continue;
  }
  if (!block.includes(envName)) {
    failures.push(`${deploymentName} Deployment must configure ${envName}`);
  }
}
const appApiBlock = deploymentBlock(kubernetesManifest, 'sdkwork-drive-app-api');
if (appApiBlock && !/SDKWORK_DRIVE_UPLOAD_CONTENT_POLICY_MODE/u.test(appApiBlock)) {
  failures.push('sdkwork-drive-app-api Deployment must enforce upload content policy in production');
}
requirePath('deployments/nginx/drive-edge-rate-limit.conf.example', 'edge rate limiting');
requirePath('deployments/docker-compose.minio-test.yml', 'object storage dev profile');
requirePath('docs/runbooks/drive-production-operations.md', 'production runbook');

for (const service of [
  'sdkwork-drive-app-api.service',
  'sdkwork-drive-backend-api.service',
  'sdkwork-drive-open-api.service',
  'sdkwork-drive-standalone-gateway.service',
]) {
  requirePath(`deployments/systemd/${service}`, 'systemd deployment');
}

if (failures.length > 0) {
  console.error('[deploy-validate] failures:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('[deploy-validate] deployment descriptors ok');
