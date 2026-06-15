import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CreateShortcutRequest, DriveNode } from '../types';


export class NodesShortcutsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create a shortcut node */
  async create(body: CreateShortcutRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/shortcuts`), body, undefined, undefined, 'application/json');
  }
}

export class NodesApi {
  private client: HttpClient;
  public readonly shortcuts: NodesShortcutsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.shortcuts = new NodesShortcutsApi(client);
  }

}

export function createNodesApi(client: HttpClient): NodesApi {
  return new NodesApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}


