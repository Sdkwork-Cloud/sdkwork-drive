const DESKTOP_RELEASE_TARGETS = [
  { platform: 'windows', arch: 'x64', target: 'x86_64-pc-windows-msvc' },
  { platform: 'windows', arch: 'arm64', target: 'aarch64-pc-windows-msvc' },
  { platform: 'linux', arch: 'x64', target: 'x86_64-unknown-linux-gnu' },
  { platform: 'linux', arch: 'arm64', target: 'aarch64-unknown-linux-gnu' },
  { platform: 'macos', arch: 'x64', target: 'x86_64-apple-darwin' },
  { platform: 'macos', arch: 'arm64', target: 'aarch64-apple-darwin' },
];

export function listDesktopReleaseTargets() {
  return DESKTOP_RELEASE_TARGETS.map((entry) => ({ ...entry }));
}

export function resolveDesktopReleaseTarget(options = {}) {
  const platform = String(options.platform ?? '').trim().toLowerCase();
  const arch = String(options.arch ?? '').trim().toLowerCase();

  const match = DESKTOP_RELEASE_TARGETS.find(
    (entry) => entry.platform === platform && entry.arch === arch,
  );

  if (!match) {
    throw new Error(`Unsupported desktop release target: ${platform || '<missing>'}/${arch || '<missing>'}`);
  }

  return { ...match };
}

export function findDesktopReleaseTargetByTriple(targetTriple = '') {
  const normalizedTarget = String(targetTriple ?? '').trim().toLowerCase();
  return DESKTOP_RELEASE_TARGETS.find((entry) => entry.target === normalizedTarget) ?? null;
}
