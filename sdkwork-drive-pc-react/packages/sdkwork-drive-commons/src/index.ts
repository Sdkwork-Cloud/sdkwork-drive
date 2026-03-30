export type ServiceSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ServiceFailure<T> = {
  success: false;
  data?: T;
  message: string;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure<T>;

export const Result = {
  success<T>(data: T, message?: string): ServiceResult<T> {
    return { success: true, data, message };
  },
  error<T>(message: string, data?: T): ServiceResult<T> {
    return { success: false, message, data };
  },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const factor = 1024;
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(factor)), units.length - 1);
  const value = bytes / factor ** index;
  return `${value.toFixed(index === 0 ? 0 : decimals)} ${units[index]}`;
}

export const pathUtils = {
  join(...parts: string[]) {
    if (parts.length === 0) {
      return '';
    }

    const normalized = parts
      .filter((part) => part !== '')
      .map((part, index) => {
        const safe = part.replace(/\\/g, '/');
        if (index === 0) {
          return safe.replace(/\/+$/g, '') || '/';
        }
        return safe.replace(/^\/+/g, '').replace(/\/+$/g, '');
      })
      .filter(Boolean)
      .join('/');

    return normalized.replace(/\/{2,}/g, '/');
  },
  dirname(path: string) {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/g, '') || '/';
    if (normalized === '/') {
      return '/';
    }

    const parts = normalized.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },
  basename(path: string) {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/g, '');
    return normalized.split('/').pop() || '';
  },
  extname(path: string) {
    const basename = this.basename(path);
    const index = basename.lastIndexOf('.');
    return index > 0 ? basename.slice(index) : '';
  },
};
