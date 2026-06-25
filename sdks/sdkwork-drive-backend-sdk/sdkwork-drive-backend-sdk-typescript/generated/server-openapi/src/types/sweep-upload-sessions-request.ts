export interface SweepUploadSessionsRequest {
  nowEpochMs: string;
  dryRun: boolean;
  limit?: string;
  operatorId: string;
  requestId?: string;
  traceId?: string;
}
