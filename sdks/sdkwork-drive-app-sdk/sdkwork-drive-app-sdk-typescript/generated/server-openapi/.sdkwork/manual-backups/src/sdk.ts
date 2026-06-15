import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { DriveApi, createDriveApi } from './api/drive';
import { NodeLabelsApi, createNodeLabelsApi } from './api/node-labels';
import { NodePropertiesApi, createNodePropertiesApi } from './api/node-properties';
import { NodesApi, createNodesApi } from './api/nodes';
import { WatchChannelsApi, createWatchChannelsApi } from './api/watch-channels';

export class SdkworkAppClient {
  private httpClient: HttpClient;

  public readonly drive: DriveApi;
  public readonly nodeLabels: NodeLabelsApi;
  public readonly nodeProperties: NodePropertiesApi;
  public readonly nodes: NodesApi;
  public readonly watchChannels: WatchChannelsApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.drive = createDriveApi(this.httpClient);

    this.nodeLabels = createNodeLabelsApi(this.httpClient);

    this.nodeProperties = createNodePropertiesApi(this.httpClient);

    this.nodes = createNodesApi(this.httpClient);

    this.watchChannels = createWatchChannelsApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }

  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkAppConfig): SdkworkAppClient {
  return new SdkworkAppClient(config);
}

export default SdkworkAppClient;


