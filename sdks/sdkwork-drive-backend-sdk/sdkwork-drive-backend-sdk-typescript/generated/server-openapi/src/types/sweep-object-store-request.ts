export interface SweepObjectStoreRequest {
  dryRun: boolean;
  limit?: string;
  operatorId: string;
  correlationId?: string;
  traceId?: string;
}
