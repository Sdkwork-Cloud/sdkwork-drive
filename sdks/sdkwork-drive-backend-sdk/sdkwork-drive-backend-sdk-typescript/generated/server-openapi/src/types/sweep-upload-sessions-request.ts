export interface SweepUploadSessionsRequest {
  nowEpochMs: string;
  dryRun: boolean;
  limit?: string;
  operatorId: string;
  correlationId?: string;
  traceId?: string;
}
