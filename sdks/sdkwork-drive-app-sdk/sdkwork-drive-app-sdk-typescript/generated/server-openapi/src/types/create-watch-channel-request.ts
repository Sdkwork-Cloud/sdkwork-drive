export interface CreateWatchChannelRequest {
  id: string;
  tenantId: string;
  spaceId?: string;
  address: string;
  token?: string;
  channelType?: 'web_hook';
  expirationEpochMs: string;
  operatorId?: string;
}


