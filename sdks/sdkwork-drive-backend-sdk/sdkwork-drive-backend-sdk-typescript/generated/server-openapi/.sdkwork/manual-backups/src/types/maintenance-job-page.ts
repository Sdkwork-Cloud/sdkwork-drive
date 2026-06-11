import type { MaintenanceJob } from './maintenance-job';

export interface MaintenanceJobPage {
  items: MaintenanceJob[];
  page: number;
  pageSize: number;
  total: string;
}
