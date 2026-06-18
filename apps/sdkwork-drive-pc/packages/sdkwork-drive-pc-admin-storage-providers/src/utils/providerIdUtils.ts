const MAX_PROVIDER_ID_LENGTH = 64;

export function slugifyProviderIdPart(text: string, maxLen = 20): string {
  const slug = text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);

  return slug;
}

export function createProviderUuidSuffix(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildProviderIdWithUuid(
  kindSlug: string,
  uuidSuffix: string,
  existingIds: ReadonlySet<string> = new Set(),
): string {
  const prefix = kindSlug.trim().slice(0, 20);
  const uuid = uuidSuffix.trim();
  if (!prefix || !uuid) {
    return '';
  }

  const candidate = `${prefix}-${uuid}`.slice(0, MAX_PROVIDER_ID_LENGTH);
  if (!existingIds.has(candidate)) {
    return candidate;
  }

  for (let index = 0; index < 5; index += 1) {
    const retry = buildProviderIdWithUuid(prefix, createProviderUuidSuffix(), existingIds);
    if (retry && !existingIds.has(retry)) {
      return retry;
    }
  }

  return candidate;
}

export function resolveProviderKindSlug(
  providerKind: string,
  customKind: string,
  shortLabel: string,
): string {
  if (providerKind === 'custom') {
    return customKind.trim() ? slugifyProviderIdPart(customKind, 20) : 'custom';
  }
  return slugifyProviderIdPart(shortLabel, 20);
}
