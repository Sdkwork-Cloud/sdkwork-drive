import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import type {
  AuditEventView,
  CreateLabelInput,
  UpdateLabelInput,
  DownloadPackageView,
  DriveSpaceListView,
  LabelListView,
  ListAuditEventsQuery,
  ListDownloadPackagesQuery,
  ListLabelsQuery,
  ListMaintenanceJobsQuery,
  ListSpacesAdminQuery,
  MaintenanceJobView,
  MaintenanceJobType,
  MaintenanceSweepResultView,
  QuotaSummaryView,
  StartMaintenanceSweepInput,
  UpdateQuotaPolicyInput,
} from '../types/driveOperationsAdminTypes';
import {
  normalizeBackendOffsetListPage,
  type BackendOffsetListPage,
  type BackendOffsetListWire,
} from '../utils/normalizeBackendOffsetListPage';

const MAINTENANCE_SWEEP_OPERATIONS: Record<
  MaintenanceJobType,
  keyof DriveBackendSdkClient['operations']
> = {
  object_sweep: 'maintenance.objectSweep.start',
  upload_session_sweep: 'maintenance.uploadSessionSweep.start',
  expired_upload_content_sweep: 'maintenance.expiredUploadContentSweep.start',
  abandoned_upload_task_sweep: 'maintenance.abandonedUploadTaskSweep.start',
};

export interface DriveOperationsAdminService {
  listAuditEvents(query?: ListAuditEventsQuery): Promise<BackendOffsetListPage<AuditEventView>>;
  listMaintenanceJobs(query?: ListMaintenanceJobsQuery): Promise<BackendOffsetListPage<MaintenanceJobView>>;
  startMaintenanceSweep(input: StartMaintenanceSweepInput): Promise<MaintenanceSweepResultView>;
  getQuotaSummary(signal?: AbortSignal): Promise<QuotaSummaryView>;
  updateQuotaPolicy(input: UpdateQuotaPolicyInput): Promise<QuotaSummaryView>;
  listLabels(query?: ListLabelsQuery): Promise<LabelListView>;
  createLabel(input: CreateLabelInput): Promise<LabelListView['items'][number]>;
  updateLabel(labelId: string, input: UpdateLabelInput): Promise<LabelListView['items'][number]>;
  deleteLabel(labelId: string): Promise<void>;
  listSpaces(query?: ListSpacesAdminQuery): Promise<DriveSpaceListView>;
  listDownloadPackages(query?: ListDownloadPackagesQuery): Promise<BackendOffsetListPage<DownloadPackageView>>;
}

export interface DriveOperationsAdminServiceOptions {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function resolveOperatorId(getSession: () => SessionSnapshot): string {
  const session = getSession();
  return session.context?.actorId
    || session.context?.userId
    || session.user?.id
    || 'unknown-operator';
}

export function createDriveOperationsAdminService({
  backendSdkClient,
  getSession,
}: DriveOperationsAdminServiceOptions): DriveOperationsAdminService {
  return {
    async listAuditEvents(query = {}) {
      const payload = await backendSdkClient.request<BackendOffsetListWire<AuditEventView>>({
        operationId: 'auditEvents.list',
        query: {
          action: query.action,
          resourceType: query.resourceType,
          resourceId: query.resourceId,
          requestId: query.requestId,
          traceId: query.traceId,
          page: query.page,
          pageSize: query.pageSize,
        },
        signal: query.signal,
      });
      return normalizeBackendOffsetListPage(payload);
    },

    async listMaintenanceJobs(query = {}) {
      const payload = await backendSdkClient.request<BackendOffsetListWire<MaintenanceJobView>>({
        operationId: 'maintenance.jobs.list',
        query: {
          jobType: query.jobType,
          status: query.status,
          operatorId: query.operatorId,
          page: query.page,
          pageSize: query.pageSize,
        },
        signal: query.signal,
      });
      return normalizeBackendOffsetListPage(payload);
    },

    async startMaintenanceSweep({ jobType, dryRun, limit }) {
      const operatorId = resolveOperatorId(getSession);
      const operationId = MAINTENANCE_SWEEP_OPERATIONS[jobType];
      const body: Record<string, unknown> = {
        dryRun,
        operatorId,
      };
      if (limit !== undefined) {
        body.limit = limit;
      }
      if (jobType === 'upload_session_sweep') {
        body.nowEpochMs = Date.now();
      }
      return backendSdkClient.request<MaintenanceSweepResultView>({
        operationId,
        body,
      });
    },

    async getQuotaSummary(signal) {
      return backendSdkClient.request<QuotaSummaryView>({
        operationId: 'quotas.summary',
        signal,
      });
    },

    async updateQuotaPolicy(input) {
      return backendSdkClient.request<QuotaSummaryView>({
        operationId: 'quotas.update',
        body: {
          quotaBytes: input.quotaBytes,
          clearTenantPolicy: input.clearTenantPolicy,
          operatorId: resolveOperatorId(getSession),
        },
      });
    },

    async listLabels(query = {}) {
      return backendSdkClient.request<LabelListView>({
        operationId: 'labels.list',
        query: {
          lifecycleStatus: query.lifecycleStatus,
          pageSize: query.pageSize,
          pageToken: query.pageToken,
        },
        signal: query.signal,
      });
    },

    async createLabel(input) {
      return backendSdkClient.request<LabelListView['items'][number]>({
        operationId: 'labels.create',
        body: {
          ...input,
          operatorId: resolveOperatorId(getSession),
        },
      });
    },

    async updateLabel(labelId, input) {
      return backendSdkClient.request<LabelListView['items'][number]>({
        operationId: 'labels.update',
        pathParams: { labelId },
        body: {
          ...input,
          operatorId: resolveOperatorId(getSession),
        },
      });
    },

    async deleteLabel(labelId) {
      await backendSdkClient.request({
        operationId: 'labels.delete',
        pathParams: { labelId },
        query: {
          operatorId: resolveOperatorId(getSession),
        },
      });
    },

    async listSpaces(query = {}) {
      return backendSdkClient.request<DriveSpaceListView>({
        operationId: 'spaces.admin.list',
        query: {
          ownerSubjectType: query.ownerSubjectType,
          ownerSubjectId: query.ownerSubjectId,
        },
        signal: query.signal,
      });
    },

    async listDownloadPackages(query = {}) {
      const payload = await backendSdkClient.request<BackendOffsetListWire<DownloadPackageView>>({
        operationId: 'downloadPackages.list',
        query: {
          state: query.state,
          page: query.page,
          pageSize: query.pageSize,
        },
        signal: query.signal,
      });
      return normalizeBackendOffsetListPage(payload);
    },
  };
}
