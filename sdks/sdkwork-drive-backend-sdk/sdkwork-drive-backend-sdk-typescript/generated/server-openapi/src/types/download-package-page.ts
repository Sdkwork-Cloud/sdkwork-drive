import type { DownloadPackage } from './download-package';

export interface DownloadPackagePage {
  items: DownloadPackage[];
  page: number;
  pageSize: number;
  total: string;
}
