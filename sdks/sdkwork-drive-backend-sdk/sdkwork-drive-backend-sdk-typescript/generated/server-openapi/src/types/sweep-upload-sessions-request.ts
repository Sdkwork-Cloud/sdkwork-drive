export interface SweepUploadSessionsRequest {
  nowEpochMs: string;
  dryRun: boolean;
  limit?: string;
  correlationId?: string;
  traceId?: string;
}
