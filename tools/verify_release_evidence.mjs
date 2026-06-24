#!/usr/bin/env node
/**
 * Cross-check release manifest checksums against on-disk artifacts and evidence files.
 * Follows QUALITY_GATE_SPEC.md release gate evidence requirements.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

async function sha256File(absolutePath) {
  const digest = createHash('sha256');
  digest.update(await readFile(absolutePath));
  return digest.digest('hex');
}

function isPlaceholderChecksum(checksum) {
  if (typeof checksum !== 'string' || checksum.length < 16) {
    return true;
  }
  const sample = checksum.slice(0, 8);
  return checksum === sample.repeat(Math.ceil(checksum.length / sample.length)).slice(0, checksum.length);
}

async function main() {
  const manifestPath = path.join(repoRoot, 'sdkwork.app.config.json');
  const evidencePath = path.join(repoRoot, 'target', 'release', 'release-evidence.json');
  const catalogEvidencePath = path.join(repoRoot, 'target', 'release', 'catalog-media-evidence.json');

  if (!existsSync(manifestPath)) {
    fail('sdkwork.app.config.json must exist');
    report();
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const packages = manifest.artifacts?.installConfig?.packages ?? [];

  for (const pkg of packages) {
    if (pkg.enabled === false || pkg.metadata?.releaseBuildDeferred === true) {
      continue;
    }
    const artifactRelative = pkg.metadata?.releaseArtifactPath;
    if (!artifactRelative) {
      fail(`package ${pkg.id} is enabled and not deferred but missing metadata.releaseArtifactPath`);
      continue;
    }
    const artifactPath = path.join(repoRoot, artifactRelative);
    if (!existsSync(artifactPath)) {
      fail(`package ${pkg.id} artifact missing on disk: ${artifactRelative}`);
      continue;
    }
    const checksum = await sha256File(artifactPath);
    if (checksum !== pkg.checksum) {
      fail(`package ${pkg.id} manifest checksum does not match artifact ${artifactRelative}`);
    }
    if (isPlaceholderChecksum(pkg.checksum)) {
      fail(`package ${pkg.id} still uses a placeholder checksum`);
    }
  }

  if (!existsSync(evidencePath)) {
    fail('target/release/release-evidence.json must exist after release evidence materialization');
  } else {
    const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
    for (const entry of evidence.packages ?? []) {
      const pkg = packages.find((candidate) => candidate.id === entry.id);
      if (!pkg) {
        fail(`release evidence references unknown package ${entry.id}`);
        continue;
      }
      if (entry.checksum !== pkg.checksum) {
        fail(`release evidence checksum mismatch for package ${entry.id}`);
      }
    }
  }

  if (!existsSync(catalogEvidencePath)) {
    fail('target/release/catalog-media-evidence.json must exist after catalog media staging');
  } else {
    const catalogEvidence = JSON.parse(await readFile(catalogEvidencePath, 'utf8'));
    for (const entry of catalogEvidence.catalogMedia ?? []) {
      const stagedPath = path.join(repoRoot, entry.stagedPath);
      if (!existsSync(stagedPath)) {
        fail(`catalog media staged artifact missing on disk: ${entry.stagedPath}`);
        continue;
      }
      const checksum = await sha256File(stagedPath);
      if (checksum !== entry.checksum) {
        fail(`catalog media evidence checksum mismatch for ${entry.id}`);
      }
    }
  }

  const sbomPath = path.join(repoRoot, 'target', 'release', 'sbom.sdkwork-drive.json');
  if (manifest.security?.sbomRequired === true && !existsSync(sbomPath)) {
    fail('target/release/sbom.sdkwork-drive.json must exist when security.sbomRequired is true');
  }

  report();
}

function report() {
  if (failures.length > 0) {
    for (const message of failures) {
      console.error(`[release-evidence-verify] error: ${message}`);
    }
    process.exit(1);
  }
  console.log('[release-evidence-verify] passed');
}

main().catch((error) => {
  console.error(`[release-evidence-verify] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
