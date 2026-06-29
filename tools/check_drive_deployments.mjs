#!/usr/bin/env node
/**
 * Validates deployment descriptor presence for SDKWork Drive.
 * Governed by DEPLOYMENT_SPEC.md and SDKWORK_DEPLOY_SPEC.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploy } from '../../sdkwork-specs/tools/deploy/validate.mjs';

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

requirePath('deployments/deploy.yaml', 'SDKWORK_DEPLOY_SPEC.md deployctl contract');

const deployResult = validateDeploy(
  repoRoot,
  process.env.SDKWORK_DRIVE_PROFILE_ID ?? process.env.SDKWORK_DEPLOY_PROFILE,
);
for (const warning of deployResult.warnings ?? []) {
  console.warn(`[deploy-validate] warning: ${warning}`);
}
if (!deployResult.ok) {
  for (const error of deployResult.errors ?? []) {
    failures.push(`deploy.yaml: ${error}`);
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
for (const deploymentName of ['sdkwork-drive-open-api', 'sdkwork-drive-admin-storage-api']) {
  const block = deploymentBlock(kubernetesManifest, deploymentName);
  if (!block) {
    continue;
  }
  if (!/sdkwork-drive-iam/u.test(block)) {
    failures.push(
      `${deploymentName} Deployment must mount sdkwork-drive-iam secrets for IAM database session resolution`,
    );
  }
}
for (const [deploymentName, envName] of [
  ['sdkwork-drive-app-api', 'SDKWORK_DRIVE_APP_API_RATE_LIMIT_MAX_REQUESTS'],
  ['sdkwork-drive-backend-api', 'SDKWORK_DRIVE_BACKEND_API_RATE_LIMIT_MAX_REQUESTS'],
  ['sdkwork-drive-open-api', 'SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_MAX_REQUESTS'],
  ['sdkwork-drive-admin-storage-api', 'SDKWORK_DRIVE_ADMIN_STORAGE_API_RATE_LIMIT_MAX_REQUESTS'],
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
requirePath('docs/runbooks/drive-backup-disaster-recovery.md', 'backup and DR runbook');
requirePath('docs/guides/operator/pre-launch-checklist.md', 'pre-launch operator checklist');
requirePath('deployments/docker/Dockerfile.app-api', 'container build descriptor');
requirePath('deployments/container/README.md', 'container packaging notes');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

for (const service of [
  'sdkwork-drive-app-api.service',
  'sdkwork-drive-backend-api.service',
  'sdkwork-drive-open-api.service',
  'sdkwork-drive-admin-storage-api.service',
  'sdkwork-drive-install-worker.service',
  'sdkwork-drive-standalone-gateway.service',
]) {
  requirePath(`deployments/systemd/${service}`, 'systemd deployment');
  const unitPath = path.join(repoRoot, `deployments/systemd/${service}`);
  if (!fs.existsSync(unitPath)) {
    continue;
  }
  const unit = readText(`deployments/systemd/${service}`);
  if (!unit.includes('SDKWORK_DRIVE_DEPLOYMENT_PROFILE=')) {
    failures.push(
      `${service} must set SDKWORK_DRIVE_DEPLOYMENT_PROFILE for metrics and tracing labels`,
    );
  }
  if (unit.includes('SDKWORK_DRIVE_DEPLOYMENT_MODE')) {
    failures.push(`${service} must not use deprecated SDKWORK_DRIVE_DEPLOYMENT_MODE`);
  }
}

if (failures.length > 0) {
  console.error('[deploy-validate] failures:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('[deploy-validate] deployment descriptors ok');
