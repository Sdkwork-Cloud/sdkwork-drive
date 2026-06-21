import { describe, expect, it, vi } from 'vitest';
import {
  createDriveUploaderTransport,
  type DriveAppSdkClient,
  type DriveAppSdkRequest,
} from '../sdk/driveAppSdkClient';
import {
  createDriveUploaderClient,
  type DriveUploaderReplaceNodeContentRequest,
} from '@sdkwork/drive-app-sdk';
import type { SessionSnapshot } from '../session/sessionStore';
import type { HostAdapter } from '../host/hostAdapter';
import { encodeLocalFilesystemId } from 'sdkwork-drive-pc-types';
import {
  createDriveFileService,
  type DriveFileService,
} from './driveFileService';

const session: SessionSnapshot = {
  user: {
    id: 'user-001',
    displayName: 'Ada',
  },
  context: {
    tenantId: 'tenant-001',
    userId: 'user-001',
    actorId: 'actor-001',
    actorKind: 'user',
  },
};

const folderNode = {
  id: 'folder-001',
  spaceId: 'my-storage',
  parentNodeId: 'root-folder',
  nodeType: 'folder',
  nodeName: 'Reports',
  lifecycleStatus: 'active',
  version: 1,
};

const sharedSpaceNode = {
  id: 'space-marketing',
  ownerSubjectType: 'group',
  ownerSubjectId: 'space-marketing',
  displayName: 'Marketing Assets',
  spaceType: 'team',
  presentationIcon: 'Palette',
  presentationColor: 'violet',
  description: 'Marketing collateral',
  lifecycleStatus: 'active',
  version: 1,
  createdBy: 'actor-001',
};

const personalSpaceNode = {
  id: 'my-storage',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'My Storage',
  spaceType: 'personal',
  lifecycleStatus: 'active',
  version: 1,
};

const computerSpaceNode = {
  id: 'space-computer-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Workstation Sync',
  spaceType: 'app_upload',
  lifecycleStatus: 'active',
  version: 1,
};

const gitRepositorySpaceNode = {
  id: 'space-git-repository-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Git Repositories',
  spaceType: 'git_repository',
  lifecycleStatus: 'active',
  version: 1,
};

const knowledgeSpaceNode = {
  id: 'space-kb-engineering',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Engineering Knowledge Base',
  spaceType: 'knowledge_base',
  lifecycleStatus: 'active',
  version: 1,
};

const fileNode = {
  id: 'file-001',
  spaceId: 'my-storage',
  parentNodeId: 'folder-001',
  nodeType: 'file',
  nodeName: 'Roadmap.pdf',
  lifecycleStatus: 'active',
  version: 1,
};

function createFakeClient(
  responses: Record<string, unknown>,
  requests: DriveAppSdkRequest[],
): DriveAppSdkClient {
  const client = {
    metadata: {} as DriveAppSdkClient['metadata'],
    operations: {} as DriveAppSdkClient['operations'],
    uploader: undefined as unknown as DriveAppSdkClient['uploader'],
    request: (vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
      requests.push(request);
      const response = responses[request.operationId];
      if (response === undefined) {
        if (request.operationId === 'spaces.list') {
          return { items: [personalSpaceNode] };
        }
        return {};
      }
      return response;
    }) as DriveAppSdkClient['request']),
    setTokenManager: vi.fn(),
  };
  client.uploader = createDriveUploaderClient({
    transport: createDriveUploaderTransport(client),
  });
  return client;
}

function attachUploader(
  client: Omit<DriveAppSdkClient, 'uploader' | 'setTokenManager'>
    & Partial<Pick<DriveAppSdkClient, 'setTokenManager'>>,
): DriveAppSdkClient {
  const sdkClient = {
    ...client,
    setTokenManager: client.setTokenManager ?? vi.fn(),
    uploader: undefined as unknown as DriveAppSdkClient['uploader'],
  };
  sdkClient.uploader = createDriveUploaderClient({
    transport: createDriveUploaderTransport(sdkClient),
  });
  return sdkClient;
}

function createDesktopHost(
  listLocalFilesystem: HostAdapter['listLocalFilesystem'],
): HostAdapter {
  return {
    isNativeHost: true,
    windowControl: async () => undefined,
    openExternal: async () => undefined,
    writeTextToClipboard: async () => undefined,
    listLocalFilesystem,
    openLocalPath: async () => undefined,
    pickLocalUploadFiles: async () => [],
    describeLocalUploadFile: async (path) => ({
      path,
      name: path.split(/[/\\]/).pop() ?? path,
      size: 0,
      modifiedAt: new Date(0).toISOString(),
      mimeType: 'application/octet-stream',
    }),
    readLocalUploadRange: async () => new ArrayBuffer(0),
    checksumLocalUploadFile: async () => 'sha256:0',
    saveDownloadFile: async () => true,
  };
}

function createRemoteService(
  responses: Record<string, unknown>,
  uploadFetch?: typeof fetch,
  downloadFetch?: typeof fetch,
  hostAdapter?: HostAdapter,
): {
  service: DriveFileService;
  appSdkClient: DriveAppSdkClient;
  requests: DriveAppSdkRequest[];
} {
  const requests: DriveAppSdkRequest[] = [];
  const appSdkClient = createFakeClient(responses, requests);
  const service = createDriveFileService({
    appSdkClient,
    getSession: () => session,
    hostAdapter,
    uploadFetch,
    downloadFetch,
  });

  return { service, appSdkClient, requests };
}

describe('drive file service', () => {
  it('keeps Drive operations on the generated App SDK path without a local demo boundary', async () => {
    const appSdkClient = createFakeClient({}, []);
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const files = await service.listFiles('my-storage');

    expect(files).toEqual([]);
    expect(appSdkClient.request).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'spaces.list',
    }));
    expect(appSdkClient.request).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'my-storage' },
    }));
  });

  it('lists Drive nodes through the generated App SDK contract and maps them to DriveFile view models', async () => {
    const { service, requests } = createRemoteService({
      'nodes.list': {
        items: [folderNode],
      },
      'favorites.list': {
        items: [],
      },
    });

    const files = await service.listFiles('my-storage', undefined, 'root-folder');

    expect(requests[0]).toMatchObject({
      operationId: 'spaces.list',
      query: expect.objectContaining({
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
      }),
    });
    expect(requests[1]).toMatchObject({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'my-storage' },
      query: {
        parentNodeId: 'root-folder',
        pageSize: 200,
      },
    });
    expect(files).toEqual([
      {
        id: 'folder-001',
        name: 'Reports',
        type: 'folder',
        spaceId: 'my-storage',
        updatedAt: expect.any(String),
        ownerId: 'Ada',
        parentId: 'root-folder',
        isStarred: undefined,
      },
    ]);
  });

  it('passes file list abort signals through every generated App SDK read request', async () => {
    const { service, requests } = createRemoteService({
      'nodes.list': {
        items: [folderNode],
      },
      'favorites.list': {
        items: [],
      },
    });
    const listAbortController = new AbortController();

    await service.listFiles('my-storage', undefined, 'root-folder', {
      signal: listAbortController.signal,
    });

    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        signal: listAbortController.signal,
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        signal: listAbortController.signal,
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        signal: listAbortController.signal,
      }),
    ]);
  });

  it('resolves the my-storage view through the current user personal space before listing remote nodes', async () => {
    const requests: DriveAppSdkRequest[] = [];
    const appSdkClient = attachUploader({
      metadata: {} as DriveAppSdkClient['metadata'],
      operations: {} as DriveAppSdkClient['operations'],
      request: vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
        requests.push(request);
        if (request.operationId === 'spaces.list') {
          return {
            items: [
              {
                ...personalSpaceNode,
                id: 'space-personal-real',
              },
            ],
          };
        }
        if (request.operationId === 'nodes.list') {
          return {
            items: [
              {
                ...fileNode,
                id: 'file-personal-real',
                spaceId: 'space-personal-real',
                parentNodeId: undefined,
              },
            ],
          };
        }
        if (request.operationId === 'favorites.list') {
          return { items: [] };
        }
        return {};
      }) as DriveAppSdkClient['request'],
    });
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const files = await service.listFiles('my-storage');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'file-personal-real',
        spaceId: 'space-personal-real',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        query: expect.objectContaining({
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-personal-real' },
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          spaceId: 'space-personal-real',
        }),
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'my-storage'),
    ).toBe(false);
  });

  it('provisions a personal space when the real backend has not created one yet', async () => {
    const requests: DriveAppSdkRequest[] = [];
    const appSdkClient = attachUploader({
      metadata: {} as DriveAppSdkClient['metadata'],
      operations: {} as DriveAppSdkClient['operations'],
      request: vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
        requests.push(request);
        if (request.operationId === 'spaces.list') {
          return { items: [] };
        }
        if (request.operationId === 'spaces.create') {
          return {
            ...personalSpaceNode,
            id: 'space-created-personal',
            displayName: 'My Storage',
          };
        }
        if (request.operationId === 'nodes.folders.create') {
          return {
            ...folderNode,
            id: 'folder-created-personal',
            spaceId: 'space-created-personal',
            parentNodeId: undefined,
          };
        }
        if (request.operationId === 'nodeProperties.list') {
          return { items: [] };
        }
        return {};
      }) as DriveAppSdkClient['request'],
    });
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const folder = await service.createFolder('Reports', 'my-storage');

    expect(folder).toEqual(expect.objectContaining({
      id: 'folder-created-personal',
      spaceId: 'space-created-personal',
    }));
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'spaces.create',
      'nodes.folders.create',
      'nodeProperties.list',
    ]);
    expect(requests.find((request) => request.operationId === 'spaces.create')).toMatchObject({
      body: expect.objectContaining({
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
        displayName: 'My Storage',
        spaceType: 'personal',
      }),
    });
    const createFolderRequest = requests.find((request) => request.operationId === 'nodes.folders.create');
    expect(createFolderRequest?.body).toEqual(expect.objectContaining({
      spaceId: 'space-created-personal',
    }));
    expect(createFolderRequest?.body).not.toHaveProperty('id');
  });

  it('loads remote folder breadcrumb ancestors through the node path SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'nodes.path.get': {
        items: [
          {
            id: 'folder-root',
            spaceId: 'my-storage',
            nodeType: 'folder',
            nodeName: 'Root',
            lifecycleStatus: 'active',
            version: 1,
          },
          {
            id: 'folder-child',
            spaceId: 'my-storage',
            parentNodeId: 'folder-root',
            nodeType: 'folder',
            nodeName: 'Project',
            lifecycleStatus: 'active',
            version: 1,
          },
        ],
        pathSegments: ['Root', 'Project'],
      },
      'nodeProperties.list': {
        items: [],
      },
    });

    const pathAbortController = new AbortController();
    const path = await service.getFolderPath('folder-child', {
      signal: pathAbortController.signal,
    });

    expect(requests[0]).toMatchObject({
      operationId: 'nodes.path.get',
      signal: pathAbortController.signal,
      pathParams: { nodeId: 'folder-child' },
      query: {
      },
    });
    expect(path).toEqual([
      {
        id: 'folder-root',
        name: 'Root',
        type: 'folder',
        spaceId: 'my-storage',
        updatedAt: expect.any(String),
        ownerId: 'Ada',
      },
      {
        id: 'folder-child',
        name: 'Project',
        type: 'folder',
        spaceId: 'my-storage',
        updatedAt: expect.any(String),
        ownerId: 'Ada',
        parentId: 'folder-root',
      },
    ]);
  });

  it('creates, renames, trashes, restores, permanently deletes, and colors nodes through SDK operations', async () => {
    const { service, requests } = createRemoteService({
      'nodes.folders.create': folderNode,
      'nodes.update': { ...fileNode, nodeName: 'Renamed.pdf' },
      'trash.move': { ...fileNode, lifecycleStatus: 'trashed' },
      'trash.restore': fileNode,
      'nodes.delete': { deleted: true },
      'nodeProperties.set': {
        propertyKey: 'ui.folderColor',
        propertyValue: 'emerald',
      },
    });

    const writeAbortController = new AbortController();
    const writeOptions = { signal: writeAbortController.signal };
    const created = await service.createFolder('Reports', 'my-storage', 'root-folder', writeOptions);
    await service.renameFile('file-001', 'Renamed.pdf', writeOptions);
    await service.deleteFile('file-001', writeOptions);
    await service.restoreFile('file-001', writeOptions);
    await service.permanentlyDeleteFile('file-001', writeOptions);
    await service.setFolderColor('folder-001', 'emerald', writeOptions);

    expect(created).toMatchObject({
      id: 'folder-001',
      name: 'Reports',
      type: 'folder',
      parentId: 'root-folder',
    });
    expect(requests.find((request) => request.operationId === 'nodes.folders.create')).toMatchObject({
      signal: writeAbortController.signal,
      body: {
        spaceId: 'my-storage',
        parentNodeId: 'root-folder',
        nodeName: 'Reports',
      },
    });
    expect(requests.find((request) => request.operationId === 'nodes.update')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        nodeName: 'Renamed.pdf',
      },
    });
    expect(requests.find((request) => request.operationId === 'trash.move')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
      },
    });
    expect(requests.find((request) => request.operationId === 'trash.restore')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
      },
    });
    expect(requests.find((request) => request.operationId === 'nodes.delete')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      query: {
      },
    });
    expect(requests.find((request) => request.operationId === 'nodeProperties.set')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: {
        nodeId: 'folder-001',
        propertyKey: 'ui.folderColor',
      },
      body: {
        value: 'emerald',
        visibility: 'private',
      },
    });
  });

  it('moves, copies, and empties trash through the Drive node SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'nodes.move': {
        ...fileNode,
        parentNodeId: 'folder-001',
      },
      'nodes.copy': {
        ...fileNode,
        id: 'file-copy-001',
        nodeName: 'Contract Copy.pdf',
        parentNodeId: 'folder-001',
      },
      'trash.empty': {
        deletedCount: 3,
      },
    });

    const writeAbortController = new AbortController();
    const writeOptions = { signal: writeAbortController.signal };
    const moved = await service.moveFile('file-001', 'folder-001', writeOptions);
    const copied = await service.copyFile('file-001', {
      ...writeOptions,
      id: 'file-copy-001',
      targetParentNodeId: 'folder-001',
      nodeName: 'Contract Copy.pdf',
    });
    const deletedCount = await service.emptyTrash(writeOptions);

    expect(moved).toMatchObject({
      id: 'file-001',
      parentId: 'folder-001',
    });
    expect(copied).toMatchObject({
      id: 'file-copy-001',
      name: 'Contract Copy.pdf',
      parentId: 'folder-001',
    });
    expect(deletedCount).toBe(3);
    expect(requests.find((request) => request.operationId === 'nodes.move')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        targetParentNodeId: 'folder-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'nodes.copy')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        id: 'file-copy-001',
        targetParentNodeId: 'folder-001',
        nodeName: 'Contract Copy.pdf',
      },
    });
    expect(requests.find((request) => request.operationId === 'trash.empty')).toMatchObject({
      signal: writeAbortController.signal,
      body: {
      },
    });
  });

  it('rejects write operations from aggregate Drive views before calling the App SDK', async () => {
    const { service, requests } = createRemoteService({});
    const readOnlyViews = ['recent', 'starred', 'shared', 'trash', 'transfer'];

    for (const section of readOnlyViews) {
      await expect(service.createFolder('Reports', section)).rejects.toThrow(
        /does not support folder creation/,
      );
      await expect(
        service.uploadFile(new File(['x'], `${section}.txt`, { type: 'text/plain' }), section),
      ).rejects.toThrow(/does not support uploads/);
    }

    await expect(service.createFolder('Desktop Folder', 'computers')).rejects.toThrow(
      /does not support folder creation/,
    );
    expect(requests).toEqual([]);
  });

  it('lists folder children when drilling down from the recent view', async () => {
    const { service, requests } = createRemoteService({
      'recent.list': {
        items: [folderNode],
      },
      'nodes.list': {
        items: [
          {
            ...fileNode,
            id: 'file-recent-child',
            nodeName: 'Quarterly Plan.pdf',
            parentNodeId: 'folder-001',
            spaceId: 'my-storage',
          },
        ],
      },
      'favorites.list': {
        items: [],
      },
    });

    const recentItems = await service.listFiles('recent');
    requests.splice(0, requests.length);

    const folderChildren = await service.listFiles('recent', undefined, 'folder-001');

    expect(recentItems).toEqual([
      expect.objectContaining({
        id: 'folder-001',
        name: 'Reports',
        type: 'folder',
      }),
    ]);
    expect(folderChildren).toEqual([
      expect.objectContaining({
        id: 'file-recent-child',
        name: 'Quarterly Plan.pdf',
        parentId: 'folder-001',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'my-storage' },
        query: expect.objectContaining({
          parentNodeId: 'folder-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          spaceId: 'my-storage',
        }),
      }),
    ]);
    expect(requests.some((request) => request.operationId === 'recent.list')).toBe(false);
  });

  it('resolves folder space through nodes.get when drilling down from an aggregate view', async () => {
    const { service, requests } = createRemoteService({
      'nodes.get': {
        ...folderNode,
        id: 'folder-remote',
        spaceId: 'space-personal-real',
      },
      'nodes.list': {
        items: [
          {
            ...fileNode,
            id: 'file-remote-child',
            parentNodeId: 'folder-remote',
            spaceId: 'space-personal-real',
          },
        ],
      },
      'favorites.list': {
        items: [],
      },
    });

    const folderChildren = await service.listFiles('recent', undefined, 'folder-remote');

    expect(folderChildren).toEqual([
      expect.objectContaining({
        id: 'file-remote-child',
        parentId: 'folder-remote',
        spaceId: 'space-personal-real',
      }),
    ]);
    expect(requests[0]).toMatchObject({
      operationId: 'nodes.get',
      pathParams: { nodeId: 'folder-remote' },
    });
    expect(requests[1]).toMatchObject({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'space-personal-real' },
      query: expect.objectContaining({
        parentNodeId: 'folder-remote',
      }),
    });
  });

  it('tracks favorite state through the favorites SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'favorites.list': {
        items: [fileNode],
      },
      'favorites.delete': {
        favorited: false,
      },
      'favorites.set': {
        favorited: true,
      },
    });

    const favoriteFiles = await service.listFiles('starred');
    requests.splice(0, requests.length);

    const favoriteAbortController = new AbortController();
    const unstarred = await service.toggleStar('file-001', {
      signal: favoriteAbortController.signal,
    });
    const starred = await service.toggleStar('file-002', {
      signal: favoriteAbortController.signal,
    });

    expect(favoriteFiles[0].isStarred).toBe(true);
    expect(unstarred).toBe(false);
    expect(starred).toBe(true);
    expect(requests[0]).toMatchObject({
      operationId: 'favorites.delete',
      signal: favoriteAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      query: {
      },
    });
    expect(requests[1]).toMatchObject({
      operationId: 'favorites.set',
      signal: favoriteAbortController.signal,
      pathParams: { nodeId: 'file-002' },
      body: {
      },
    });
  });

  it('decorates regular node lists with favorite state from the Drive favorites SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'nodes.list': {
        items: [
          fileNode,
          {
            ...fileNode,
            id: 'file-002',
            nodeName: 'Notes.txt',
          },
        ],
      },
      'favorites.list': {
        items: [fileNode],
      },
    });

    const files = await service.listFiles('my-storage');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'file-001',
        isStarred: true,
      }),
      expect.objectContaining({
        id: 'file-002',
      }),
    ]);
    expect(files[1].isStarred).toBeUndefined();
    expect(requests.find((request) => request.operationId === 'favorites.list')).toMatchObject({
      query: {
        spaceId: 'my-storage',
        pageSize: 200,
      },
    });
  });

  it('paginates remote node lists so large real spaces are complete', async () => {
    const requests: DriveAppSdkRequest[] = [];
    const appSdkClient = attachUploader({
      metadata: {} as DriveAppSdkClient['metadata'],
      operations: {} as DriveAppSdkClient['operations'],
      request: vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
        requests.push(request);
        if (request.operationId === 'spaces.list') {
          return { items: [personalSpaceNode] };
        }
        if (request.operationId === 'favorites.list') {
          return { items: [] };
        }
        if (request.operationId === 'nodes.list' && request.query?.pageToken === 'node-page-2') {
          return {
            items: [
              {
                ...fileNode,
                id: 'file-page-2',
                nodeName: 'Second page.pdf',
              },
            ],
          };
        }
        if (request.operationId === 'nodes.list') {
          return {
            items: [
              {
                ...fileNode,
                id: 'file-page-1',
                nodeName: 'First page.pdf',
              },
            ],
            nextPageToken: 'node-page-2',
          };
        }
        return {};
      }) as DriveAppSdkClient['request'],
    });
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const files = await service.listFiles('my-storage');

    expect(files.map((file) => file.id)).toEqual(['file-page-1', 'file-page-2']);
    expect(
      requests.filter((request) => request.operationId === 'nodes.list').map((request) => request.query?.pageToken),
    ).toEqual([undefined, 'node-page-2']);
  });

  it('keeps observed remote nodes available for transfer retry lookup across workspace refreshes', async () => {
    const requests: DriveAppSdkRequest[] = [];
    const appSdkClient = attachUploader({
      metadata: {} as DriveAppSdkClient['metadata'],
      operations: {} as DriveAppSdkClient['operations'],
      request: vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
        requests.push(request);
        if (request.operationId === 'spaces.list') {
          return { items: [personalSpaceNode] };
        }
        if (request.operationId === 'favorites.list') {
          return { items: [] };
        }
        if (request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'space-marketing') {
          return {
            items: [
              {
                ...fileNode,
                id: 'file-shared-space',
                spaceId: 'space-marketing',
                parentNodeId: 'folder-deep',
                nodeName: 'Brand Kit.pdf',
              },
            ],
          };
        }
        if (request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'my-storage') {
          return { items: [] };
        }
        return {};
      }) as DriveAppSdkClient['request'],
    });
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const sharedFiles = await service.listFiles('space-marketing', undefined, 'folder-deep');
    const workspaceAbortController = new AbortController();
    const allKnownFiles = await service.getAllWorkspaceFiles({
      signal: workspaceAbortController.signal,
    });

    expect(sharedFiles).toEqual([
      expect.objectContaining({
        id: 'file-shared-space',
        name: 'Brand Kit.pdf',
        spaceId: 'space-marketing',
        parentId: 'folder-deep',
      }),
    ]);
    expect(allKnownFiles).toEqual([
      expect.objectContaining({
        id: 'file-shared-space',
        name: 'Brand Kit.pdf',
      }),
    ]);
    expect(requests.find((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'my-storage')).toBeTruthy();
    expect(
      requests
        .filter((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'my-storage')
        .every((request) => request.signal === workspaceAbortController.signal),
    ).toBe(true);
  });

  it('lists the computers view from the desktop host local filesystem adapter', async () => {
    const documentsPath = 'C:\\Users\\Ada\\Documents';
    const localFilePath = `${documentsPath}\\Desktop Sync.pdf`;
    const hostAdapter = createDesktopHost(async (path) => {
      if (!path) {
        return [
          {
            name: 'Documents',
            path: documentsPath,
            isDirectory: true,
            entryKind: 'documents',
          },
        ];
      }
      if (path === documentsPath) {
        return [
          {
            name: 'Desktop Sync.pdf',
            path: localFilePath,
            isDirectory: false,
            size: 1024,
            modifiedAt: '1710000000000',
            mimeType: 'application/pdf',
            entryKind: 'file',
          },
        ];
      }
      return [];
    });
    const { service, requests } = createRemoteService({}, undefined, undefined, hostAdapter);

    const roots = await service.listFiles('computers');
    const files = await service.listFiles(
      'computers',
      undefined,
      encodeLocalFilesystemId(documentsPath),
    );

    expect(roots).toEqual([
      expect.objectContaining({
        id: encodeLocalFilesystemId(documentsPath),
        name: 'Documents',
        type: 'folder',
      }),
    ]);
    expect(files).toEqual([
      expect.objectContaining({
        id: encodeLocalFilesystemId(localFilePath),
        name: 'Desktop Sync.pdf',
        type: 'file',
        mimeType: 'application/pdf',
        size: 1024,
      }),
    ]);
    expect(requests).toEqual([]);
  });

  it('loads local computer folder breadcrumbs with native Windows paths', async () => {
    const documentsPath = 'C:\\Users\\Ada\\Documents';
    const hostAdapter = createDesktopHost(async () => []);
    const { service } = createRemoteService({}, undefined, undefined, hostAdapter);

    const path = await service.getFolderPath(encodeLocalFilesystemId(documentsPath));

    expect(path).toEqual([
      expect.objectContaining({
        id: encodeLocalFilesystemId('C:\\'),
        name: 'C:',
        type: 'folder',
      }),
      expect.objectContaining({
        id: encodeLocalFilesystemId('C:\\Users'),
        name: 'Users',
        type: 'folder',
        parentId: encodeLocalFilesystemId('C:\\'),
      }),
      expect.objectContaining({
        id: encodeLocalFilesystemId('C:\\Users\\Ada'),
        name: 'Ada',
        type: 'folder',
        parentId: encodeLocalFilesystemId('C:\\Users'),
      }),
      expect.objectContaining({
        id: encodeLocalFilesystemId(documentsPath),
        name: 'Documents',
        type: 'folder',
        parentId: encodeLocalFilesystemId('C:\\Users\\Ada'),
      }),
    ]);
  });

  it('rejects computers uploads because the local browse view is read-only', async () => {
    const hostAdapter = createDesktopHost(async () => []);
    const { service, requests } = createRemoteService({}, undefined, undefined, hostAdapter);

    await expect(
      service.uploadFile(
        new File(['desktop'], 'Desktop Upload.txt', { type: 'text/plain' }),
        'computers',
      ),
    ).rejects.toThrow(/does not support uploads/);
    expect(requests).toEqual([]);
  });

  it('lists the apps view from the current user git repository space', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, gitRepositorySpaceNode, computerSpaceNode, sharedSpaceNode],
      },
      'nodes.list': {
        items: [
          {
            ...folderNode,
            id: 'folder-git-repository-sdkwork-drive',
            spaceId: 'space-git-repository-001',
            parentNodeId: undefined,
            nodeName: 'sdkwork-drive',
          },
        ],
      },
      'favorites.list': {
        items: [],
      },
    });

    const files = await service.listFiles('apps');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'folder-git-repository-sdkwork-drive',
        name: 'sdkwork-drive',
        type: 'folder',
        spaceId: 'space-git-repository-001',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        query: expect.objectContaining({
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-git-repository-001' },
        query: expect.objectContaining({
          pageSize: 200,
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          spaceId: 'space-git-repository-001',
        }),
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'apps'),
    ).toBe(false);
  });

  it('provisions a user git repository space before creating the first repository directory', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode],
      },
      'spaces.create': {
        ...gitRepositorySpaceNode,
        id: 'space-created-git-repository',
      },
      'nodes.folders.create': {
        ...folderNode,
        id: 'folder-created-git-repository',
        spaceId: 'space-created-git-repository',
        parentNodeId: undefined,
        nodeName: 'sdkwork-drive',
      },
      'nodeProperties.list': {
        items: [],
      },
    });

    const folder = await service.createFolder('sdkwork-drive', 'apps');

    expect(folder).toEqual(expect.objectContaining({
      id: 'folder-created-git-repository',
      name: 'sdkwork-drive',
      spaceId: 'space-created-git-repository',
    }));
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'spaces.create',
      'nodes.folders.create',
      'nodeProperties.list',
    ]);
    expect(requests.find((request) => request.operationId === 'spaces.create')).toMatchObject({
      body: expect.objectContaining({
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
        displayName: 'Git Repositories',
        spaceType: 'git_repository',
      }),
    });
    expect(requests.find((request) => request.operationId === 'nodes.folders.create')).toMatchObject({
      body: expect.objectContaining({
        spaceId: 'space-created-git-repository',
        nodeName: 'sdkwork-drive',
      }),
    });
  });

  it('reuses the user git repository space when concurrent provisioning reaches the owner type uniqueness constraint', async () => {
    const requests: DriveAppSdkRequest[] = [];
    let listCalls = 0;
    const appSdkClient = attachUploader({
      metadata: {} as DriveAppSdkClient['metadata'],
      operations: {} as DriveAppSdkClient['operations'],
      request: vi.fn(async (request: DriveAppSdkRequest): Promise<unknown> => {
        requests.push(request);
        if (request.operationId === 'spaces.list') {
          listCalls += 1;
          return {
            items: listCalls === 1
              ? [personalSpaceNode]
              : [personalSpaceNode, { ...gitRepositorySpaceNode, id: 'space-existing-git-repository' }],
          };
        }
        if (request.operationId === 'spaces.create') {
          throw Object.assign(new Error('git repository space already exists'), {
            status: 409,
            code: 'drive.space.owner_type_conflict',
          });
        }
        if (request.operationId === 'nodes.folders.create') {
          return {
            ...folderNode,
            id: 'folder-existing-git-repository',
            spaceId: 'space-existing-git-repository',
            parentNodeId: undefined,
            nodeName: 'sdkwork-drive',
          };
        }
        if (request.operationId === 'nodeProperties.list') {
          return { items: [] };
        }
        return {};
      }) as DriveAppSdkClient['request'],
    });
    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    const folder = await service.createFolder('sdkwork-drive', 'apps');

    expect(folder).toEqual(expect.objectContaining({
      id: 'folder-existing-git-repository',
      spaceId: 'space-existing-git-repository',
    }));
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'spaces.create',
      'spaces.list',
      'nodes.folders.create',
      'nodeProperties.list',
    ]);
    expect(requests.find((request) => request.operationId === 'nodes.folders.create')).toMatchObject({
      body: expect.objectContaining({
        spaceId: 'space-existing-git-repository',
        nodeName: 'sdkwork-drive',
      }),
    });
  });

  it('lists knowledge base views from knowledge base spaces instead of synthetic kb section ids', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, knowledgeSpaceNode, sharedSpaceNode],
      },
      'nodes.list': {
        items: [
          {
            ...fileNode,
            id: 'file-kb-001',
            spaceId: 'space-kb-engineering',
            parentNodeId: undefined,
            nodeName: 'Runbook.md',
          },
        ],
      },
      'favorites.list': {
        items: [],
      },
    });

    const files = await service.listFiles('space-kb-engineering');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'file-kb-001',
        name: 'Runbook.md',
        spaceId: 'space-kb-engineering',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-kb-engineering' },
        query: expect.objectContaining({
          pageSize: 200,
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          spaceId: 'space-kb-engineering',
        }),
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'spaces.list'),
    ).toBe(false);
  });

  it('creates folders in the resolved knowledge base space instead of a synthetic kb section id', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, knowledgeSpaceNode],
      },
      'nodes.folders.create': {
        ...folderNode,
        id: 'folder-kb-001',
        spaceId: 'space-kb-engineering',
        parentNodeId: undefined,
        nodeName: 'Runbooks',
      },
    });

    const folder = await service.createFolder('Runbooks', 'space-kb-engineering');

    expect(folder).toMatchObject({
      id: 'folder-kb-001',
      name: 'Runbooks',
      spaceId: 'space-kb-engineering',
    });
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'nodes.folders.create',
        body: expect.objectContaining({
          spaceId: 'space-kb-engineering',
          nodeName: 'Runbooks',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodeProperties.list',
        pathParams: { nodeId: 'folder-kb-001' },
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'spaces.list'),
    ).toBe(false);
  });

  it('uploads a selected browser File through Drive upload session grants and completion APIs', async () => {
    const uploadFetch = vi.fn<typeof fetch>(async () =>
      new Response('', {
        status: 200,
        headers: {
          ETag: '"etag-001"',
        },
      }),
    );
    const { service, requests } = createRemoteService(
      {
        'uploader.uploads.prepare': {
          uploadItem: {
            id: 'upload-item-001',
            taskId: 'task-001',
            userId: 'user-001',
            actorType: 'user',
            actorId: 'actor-001',
            appId: 'drive-pc',
            appResourceType: 'desktop-file-browser',
            appResourceId: 'my-storage',
            scene: 'drive_pc_file_upload',
            source: 'pc_local_file',
            uploadProfileCode: 'generic',
            fileFingerprint: 'pc:Roadmap.pdf:size:5:type:application.pdf',
            spaceId: 'my-storage',
            nodeId: 'file-001',
            uploadSessionId: 'upload-001',
            storageUploadId: 'storage-upload-001',
            originalFileName: 'Roadmap.pdf',
            contentType: 'application/pdf',
            contentTypeGroup: 'document',
            contentLength: '5',
            chunkSizeBytes: '8388608',
            totalParts: '1',
            uploadedPartsCount: '0',
            uploadedBytes: '0',
            status: 'prepared',
            retentionMode: 'long_term',
            cleanupStatus: 'active',
            postProcessStatus: 'not_required',
          },
          uploadSession: {
            id: 'upload-001',
            spaceId: 'my-storage',
            nodeId: 'file-001',
            bucket: 'bucket-s3',
            objectKey: 'objects/upload-001',
            state: 'created',
            storageProviderId: 'provider-s3',
            storageUploadId: 'storage-upload-001',
            expiresAtEpochMs: 1_800_000_000_000,
            version: 1,
          },
        },
        'uploadSessions.parts.presign': {
          uploadUrl: 'https://storage.example.test/upload',
          method: 'PUT',
          headers: {
            'x-amz-meta-sdkwork': 'drive',
          },
          partNo: 1,
          uploadId: 'storage-upload-001',
          expiresAtEpochMs: 1_800_000_000_000,
        },
        'uploadSessions.complete': {
          id: 'upload-001',
          state: 'completed',
        },
        'uploader.uploads.parts.markUploaded': {
          id: 'part-001',
          status: 'uploaded',
        },
      },
      uploadFetch,
    );

    const uploaded = await service.uploadFile(
      new File(['hello'], 'Roadmap.pdf', { type: 'application/pdf' }),
      'my-storage',
      'folder-001',
    );

    expect(uploaded).toMatchObject({
      id: 'file-001',
      name: 'Roadmap.pdf',
      type: 'file',
      size: 5,
      mimeType: 'application/pdf',
      parentId: 'folder-001',
    });
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'uploader.uploads.prepare',
      'uploadSessions.parts.presign',
      'uploader.uploads.parts.markUploaded',
      'uploadSessions.complete',
    ]);
    expect(requests[1].body).toMatchObject({
      spaceId: 'my-storage',
      parentNodeId: 'folder-001',
      appResourceType: 'desktop-file-browser',
      appResourceId: 'my-storage',
      scene: 'drive_pc_file_upload',
      source: 'pc_local_file',
      originalFileName: 'Roadmap.pdf',
    });
    expect(requests[2]).toMatchObject({
      pathParams: {
        uploadSessionId: 'upload-001',
        partNo: 1,
      },
      body: {
        uploadId: 'storage-upload-001',
        requestedTtlSeconds: 300,
      },
    });
    expect(requests[3]).toMatchObject({
      operationId: 'uploader.uploads.parts.markUploaded',
      pathParams: {
        uploadItemId: 'upload-item-001',
        partNo: 1,
      },
      body: expect.objectContaining({
        uploadSessionId: 'upload-001',
        offsetBytes: '0',
        sizeBytes: '5',
        etag: '"etag-001"',
      }),
    });
    expect(uploadFetch).toHaveBeenCalledWith(
      'https://storage.example.test/upload',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'x-amz-meta-sdkwork': 'drive',
        },
        body: expect.any(Blob),
      }),
    );
    expect(requests[4].body).toMatchObject({
      uploadId: 'storage-upload-001',
      contentType: 'application/pdf',
      contentLength: '5',
      checksumSha256Hex: 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      parts: [
        {
          partNo: 1,
          etag: '"etag-001"',
        },
      ],
    });
  });

  it('keeps cancellable uploads on the SDK uploader boundary with the caller abort signal', async () => {
    const abortController = new AbortController();
    const uploadFetch = vi.fn<typeof fetch>(async (_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      if (signal !== abortController.signal) {
        throw new Error('upload fetch did not receive the caller abort signal');
      }

      return await new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Drive upload aborted by user.', 'AbortError'));
        });
      });
    });
    const { service, requests } = createRemoteService(
      {
        'uploader.uploads.prepare': {
          uploadItem: {
            id: 'upload-item-cancellable',
            taskId: 'task-cancellable',
            userId: 'user-001',
            actorType: 'user',
            actorId: 'actor-001',
            appId: 'drive-pc',
            appResourceType: 'desktop-file-browser',
            appResourceId: 'my-storage',
            scene: 'drive_pc_file_upload',
            source: 'pc_local_file',
            uploadProfileCode: 'generic',
            fileFingerprint: 'pc:Roadmap.pdf:size:5:type:application.pdf',
            spaceId: 'my-storage',
            nodeId: 'file-001',
            uploadSessionId: 'upload-cancellable',
            storageUploadId: 'storage-upload-cancellable',
            originalFileName: 'Roadmap.pdf',
            contentType: 'application/pdf',
            contentTypeGroup: 'document',
            contentLength: '5',
            chunkSizeBytes: '8388608',
            totalParts: '1',
            uploadedPartsCount: '0',
            uploadedBytes: '0',
            status: 'prepared',
            retentionMode: 'long_term',
            cleanupStatus: 'active',
            postProcessStatus: 'not_required',
          },
          uploadSession: {
            id: 'upload-cancellable',
            spaceId: 'my-storage',
            nodeId: 'file-001',
            bucket: 'bucket-s3',
            objectKey: 'objects/upload-cancellable',
            state: 'created',
            storageProviderId: 'provider-s3',
            storageUploadId: 'storage-upload-cancellable',
            expiresAtEpochMs: 1_800_000_000_000,
            version: 1,
          },
        },
        'uploadSessions.parts.presign': {
          uploadUrl: 'https://storage.example.test/upload-cancellable',
          method: 'PUT',
          partNo: 1,
          uploadId: 'storage-upload-cancellable',
          expiresAtEpochMs: 1_800_000_000_000,
        },
        'uploadSessions.abort': {
          id: 'upload-cancellable',
          state: 'aborted',
        },
        'nodes.delete': {
          deleted: true,
        },
      },
      uploadFetch,
    );

    const upload = service.uploadFile(
      new File(['hello'], 'Roadmap.pdf', { type: 'application/pdf' }),
      'my-storage',
      'folder-001',
      { signal: abortController.signal },
    );
    await vi.waitFor(() => expect(uploadFetch).toHaveBeenCalled());
    abortController.abort();

    await expect(upload).rejects.toThrow(/aborted/i);
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'uploader.uploads.prepare',
      'uploadSessions.parts.presign',
      'uploadSessions.abort',
      'nodes.delete',
    ]);
    expect(requests.every((request) => request.operationId !== 'nodes.delete' || request.pathParams?.nodeId === 'file-001')).toBe(true);
    expect(requests.every((request) => request.signal === abortController.signal)).toBe(true);
  });

  it('discards prepared upload nodes when provider upload fails before completion', async () => {
    const uploadFetch = vi.fn<typeof fetch>(async () => new Response('', { status: 503 }));
    const { service, requests } = createRemoteService(
      {
        'uploader.uploads.prepare': {
          uploadItem: {
            id: 'upload-item-failed',
            taskId: 'task-failed',
            userId: 'user-001',
            actorType: 'user',
            actorId: 'actor-001',
            appId: 'drive-pc',
            appResourceType: 'desktop-file-browser',
            appResourceId: 'my-storage',
            scene: 'drive_pc_file_upload',
            source: 'pc_local_file',
            uploadProfileCode: 'generic',
            fileFingerprint: 'pc:Roadmap.pdf:size:5:type:application.pdf',
            spaceId: 'my-storage',
            nodeId: 'file-failed',
            uploadSessionId: 'upload-failed',
            storageUploadId: 'storage-upload-failed',
            originalFileName: 'Roadmap.pdf',
            contentType: 'application/pdf',
            contentTypeGroup: 'document',
            contentLength: '5',
            chunkSizeBytes: '8388608',
            totalParts: '1',
            uploadedPartsCount: '0',
            uploadedBytes: '0',
            status: 'prepared',
            retentionMode: 'long_term',
            cleanupStatus: 'active',
            postProcessStatus: 'not_required',
          },
          uploadSession: {
            id: 'upload-failed',
            spaceId: 'my-storage',
            nodeId: 'file-failed',
            bucket: 'bucket-s3',
            objectKey: 'objects/upload-failed',
            state: 'created',
            storageProviderId: 'provider-s3',
            storageUploadId: 'storage-upload-failed',
            expiresAtEpochMs: 1_800_000_000_000,
            version: 1,
          },
        },
        'uploadSessions.parts.presign': {
          uploadUrl: 'https://storage.example.test/upload-failed',
          method: 'PUT',
          partNo: 1,
          uploadId: 'storage-upload-failed',
          expiresAtEpochMs: 1_800_000_000_000,
        },
        'uploadSessions.abort': {
          id: 'upload-failed',
          state: 'aborted',
        },
        'nodes.delete': {
          deleted: true,
        },
      },
      uploadFetch,
    );

    await expect(
      service.uploadFile(
        new File(['hello'], 'Roadmap.pdf', { type: 'application/pdf' }),
        'my-storage',
        'folder-001',
      ),
    ).rejects.toThrow(/HTTP 503/);

    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'uploader.uploads.prepare',
      'uploadSessions.parts.presign',
    ]);
    expect(requests.some((request) => request.operationId === 'uploadSessions.abort')).toBe(false);
    expect(requests.some((request) => request.operationId === 'nodes.delete')).toBe(false);
  });

  it('uploads generated Drive files through the same real upload completion flow', async () => {
    const uploadFetch = vi.fn<typeof fetch>(async () =>
      new Response('', {
        status: 200,
        headers: {
          ETag: '"etag-generated"',
        },
      }),
    );
    const { service, requests } = createRemoteService(
      {
        'uploader.uploads.prepare': {
          uploadItem: {
            id: 'upload-item-generated',
            taskId: 'task-generated',
            userId: 'user-001',
            actorType: 'user',
            actorId: 'actor-001',
            appId: 'drive-pc',
            appResourceType: 'desktop-file-browser',
            appResourceId: 'my-storage',
            scene: 'drive_pc_file_upload',
            source: 'pc_local_file',
            uploadProfileCode: 'generic',
            fileFingerprint: 'pc:extracted.txt:size:11:type:text.plain',
            spaceId: 'my-storage',
            nodeId: 'file-generated',
            uploadSessionId: 'upload-generated',
            storageUploadId: 'storage-upload-generated',
            originalFileName: 'extracted.txt',
            contentType: 'text/plain',
            contentTypeGroup: 'text',
            contentLength: '11',
            chunkSizeBytes: '8388608',
            totalParts: '1',
            uploadedPartsCount: '0',
            uploadedBytes: '0',
            status: 'prepared',
            retentionMode: 'long_term',
            cleanupStatus: 'active',
            postProcessStatus: 'not_required',
          },
          uploadSession: {
            id: 'upload-generated',
            spaceId: 'my-storage',
            nodeId: 'file-generated',
            bucket: 'bucket-s3',
            objectKey: 'objects/upload-generated',
            state: 'created',
            storageProviderId: 'provider-s3',
            storageUploadId: 'storage-upload-generated',
            expiresAtEpochMs: 1_800_000_000_000,
            version: 1,
          },
        },
        'uploadSessions.parts.presign': {
          uploadUrl: 'https://storage.example.test/generated-upload',
          method: 'PUT',
          headers: {
            'x-amz-meta-sdkwork': 'drive',
          },
          partNo: 1,
          uploadId: 'storage-upload-generated',
          expiresAtEpochMs: 1_800_000_000_000,
        },
        'uploadSessions.complete': {
          id: 'upload-generated',
          state: 'completed',
        },
        'uploader.uploads.parts.markUploaded': {
          id: 'part-generated',
          status: 'uploaded',
        },
      },
      uploadFetch,
    );

    const uploaded = await service.uploadFile(
      new File([new Uint8Array(11)], 'extracted.txt', { type: 'text/plain' }),
      'my-storage',
      'folder-001',
    );

    expect(uploaded).toMatchObject({
      id: 'file-generated',
      name: 'extracted.txt',
      type: 'file',
      mimeType: 'text/plain',
      size: 11,
      parentId: 'folder-001',
    });
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'uploader.uploads.prepare',
      'uploadSessions.parts.presign',
      'uploader.uploads.parts.markUploaded',
      'uploadSessions.complete',
    ]);
    expect(uploadFetch).toHaveBeenCalledWith(
      'https://storage.example.test/generated-upload',
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(Blob),
      }),
    );
    expect(requests[4].body).toMatchObject({
      uploadId: 'storage-upload-generated',
      contentType: 'text/plain',
      contentLength: '11',
      checksumSha256Hex: 'sha256:71b6c1d53832f789a7f2435a7c629245fa3761ad8487775ebf4957330213a706',
      parts: [
        {
          partNo: 1,
          etag: '"etag-generated"',
        },
      ],
    });
  });

  it('creates single-file download grants and multi-node archive packages through the Drive SDK', async () => {
    const { service, requests } = createRemoteService({
      'nodes.downloadUrls.create': {
        downloadUrl: 'https://drive.example.test/download/file-001',
        signedSourceUrl: 'https://storage.example.test/file-001',
        expiresAtEpochMs: 1_800_000_000_000,
        method: 'GET',
      },
      'downloadPackages.create': {
        id: 'package-001',
        packageName: 'drive_export_2_items.zip',
        downloadUrl: 'https://drive.example.test/download/package-001',
        signedSourceUrl: 'https://storage.example.test/package-001',
        expiresAtEpochMs: 1_800_000_000_000,
        method: 'GET',
        fileCount: 2,
        totalBytes: 4096,
      },
    });

    const downloadAbortController = new AbortController();
    const packageAbortController = new AbortController();
    const grant = await service.createDownloadUrl({
      id: 'file-001',
      name: 'Roadmap.pdf',
      type: 'file',
      mimeType: 'application/pdf',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'Ada',
    }, {
      signal: downloadAbortController.signal,
    });
    const bundle = await service.createDownloadPackage(
      [
        {
          id: 'file-001',
          name: 'Roadmap.pdf',
          type: 'file',
          updatedAt: '2026-01-01T00:00:00.000Z',
          ownerId: 'Ada',
        },
        {
          id: 'folder-001',
          name: 'Reports',
          type: 'folder',
          updatedAt: '2026-01-01T00:00:00.000Z',
          ownerId: 'Ada',
        },
      ],
      'drive_export_2_items.zip',
      {
        signal: packageAbortController.signal,
      },
    );

    expect(grant.signedSourceUrl).toBe('https://storage.example.test/file-001');
    expect(bundle).toMatchObject({
      id: 'package-001',
      packageName: 'drive_export_2_items.zip',
      fileCount: 2,
      totalBytes: 4096,
    });
    expect(requests[0]).toMatchObject({
      operationId: 'nodes.downloadUrls.create',
      pathParams: { nodeId: 'file-001' },
      query: {
        requestedTtlSeconds: 300,
      },
      signal: downloadAbortController.signal,
    });
    expect(requests[1]).toMatchObject({
      operationId: 'downloadPackages.create',
      body: {
        nodeIds: ['file-001', 'folder-001'],
        packageName: 'drive_export_2_items.zip',
        requestedTtlSeconds: 300,
      },
      signal: packageAbortController.signal,
    });
  });

  it('rejects malformed backend download grants before the UI can mark transfers ready', async () => {
    const { service } = createRemoteService({
      'nodes.downloadUrls.create': {
        expiresAtEpochMs: 1_800_000_000_000,
        method: 'GET',
      },
      'downloadPackages.create': {
        id: 'package-001',
        packageName: 'drive_export.zip',
        fileCount: 1,
        totalBytes: 4096,
      },
    });
    const file = {
      id: 'file-001',
      name: 'Roadmap.pdf',
      type: 'file' as const,
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'Ada',
    };

    await expect(service.createDownloadUrl(file)).rejects.toThrow(
      /did not return a download URL/,
    );
    await expect(service.createDownloadPackage([file], 'drive_export.zip')).rejects.toThrow(
      /did not return a download URL/,
    );
  });

  it('loads storage usage summary through the Drive quota SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'quotas.summary': {
        usedBytes: 4_294_967_296,
        objectCount: 42,
      },
    });

    const summaryAbortController = new AbortController();
    const summary = await service.getStorageSummary({
      signal: summaryAbortController.signal,
    });

    expect(summary).toEqual({
      tenantId: 'tenant-001',
      usedBytes: 4_294_967_296,
      objectCount: 42,
    });
    expect(requests).toEqual([
      {
        operationId: 'quotas.summary',
        signal: summaryAbortController.signal,
      },
    ]);
  });

  it('reads text file preview content through an App SDK download grant and core data-plane fetch', async () => {
    const downloadFetch = vi.fn(async () =>
      new Response('# Roadmap\n\nReal file content', {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
        },
      }),
    ) as unknown as typeof fetch;
    const { service, requests } = createRemoteService(
      {
        'nodes.downloadUrls.create': {
          downloadUrl: 'https://drive.example.test/download/file-001',
          signedSourceUrl: 'https://storage.example.test/file-001',
          expiresAtEpochMs: 1_800_000_000_000,
          method: 'GET',
        },
      },
      undefined,
      downloadFetch,
    );

    const content = await service.readFileText({
      id: 'file-001',
      name: 'Roadmap.md',
      type: 'file',
      mimeType: 'text/markdown',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'Ada',
    });

    expect(content).toEqual({
      content: '# Roadmap\n\nReal file content',
      contentType: 'text/markdown',
      downloadUrl: 'https://drive.example.test/download/file-001',
      signedSourceUrl: 'https://storage.example.test/file-001',
      expiresAtEpochMs: 1_800_000_000_000,
    });
    expect(requests[0]).toMatchObject({
      operationId: 'nodes.downloadUrls.create',
      pathParams: { nodeId: 'file-001' },
    });
    expect(downloadFetch).toHaveBeenCalledWith(
      'https://storage.example.test/file-001',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('saves edited text content through the composed Drive uploader boundary', async () => {
    const uploadFetch = vi.fn<typeof fetch>(async () =>
      new Response('', {
        status: 200,
        headers: {
          ETag: '"etag-text-save"',
        },
      }),
    );
    const { service, appSdkClient, requests } = createRemoteService({}, uploadFetch);
    const replaceNodeContent = vi.fn(async (_request: DriveUploaderReplaceNodeContentRequest) => ({
      uploadSession: {
        id: 'upload-text-save',
        state: 'completed',
      },
      parts: [
        {
          partNo: 1,
          etag: '"etag-text-save"',
          offsetBytes: 0,
          sizeBytes: 10,
        },
      ],
    }));
    Object.assign(appSdkClient.uploader, { replaceNodeContent });

    const saveAbortController = new AbortController();
    await service.saveFileText(
      {
        id: 'file-001',
        name: 'Roadmap.md',
        type: 'file',
        spaceId: 'my-storage',
        mimeType: 'text/markdown',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ownerId: 'Ada',
      },
      '# Updated\n',
      'text/markdown',
      {
        signal: saveAbortController.signal,
      },
    );

    expect(replaceNodeContent).toHaveBeenCalledTimes(1);
    expect(replaceNodeContent).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 'my-storage',
      nodeId: 'file-001',
      appResourceType: 'desktop-file-editor',
      appResourceId: 'file-001',
      scene: 'drive_pc_text_save',
      source: 'pc_text_editor',
      uploadProfileCode: 'text',
      originalFileName: 'Roadmap.md',
      contentType: 'text/markdown',
      requestedPartTtlSeconds: 300,
      uploadFetch,
      signal: saveAbortController.signal,
    }));
    const replacementFile = replaceNodeContent.mock.calls[0]?.[0].file;
    expect(replacementFile).toEqual(expect.any(File));
    expect(new TextDecoder().decode(await replacementFile?.arrayBuffer())).toBe('# Updated\n');
    expect(requests).toEqual([]);
    expect(uploadFetch).not.toHaveBeenCalled();
  });

  it('resolves missing file space ids before passing edited text content to the composed uploader', async () => {
    const { service, appSdkClient, requests } = createRemoteService(
      {
        'nodes.get': {
          ...fileNode,
          id: 'file-001',
          spaceId: 'space-resolved-from-node',
        },
      },
    );
    const replaceNodeContent = vi.fn(async (_request: DriveUploaderReplaceNodeContentRequest) => ({
      uploadSession: {
        id: 'upload-text-save-resolved-space',
        state: 'completed',
      },
      parts: [],
    }));
    Object.assign(appSdkClient.uploader, { replaceNodeContent });

    const saveAbortController = new AbortController();
    await service.saveFileText(
      {
        id: 'file-001',
        name: 'Roadmap.md',
        type: 'file',
        mimeType: 'text/markdown',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ownerId: 'Ada',
      },
      '# Updated\n',
      'text/markdown',
      {
        signal: saveAbortController.signal,
      },
    );

    expect(requests.map((request) => request.operationId)).toEqual([
      'nodes.get',
    ]);
    expect(requests[0]).toMatchObject({
      operationId: 'nodes.get',
      signal: saveAbortController.signal,
    });
    expect(replaceNodeContent).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 'space-resolved-from-node',
      nodeId: 'file-001',
      signal: saveAbortController.signal,
    }));
    expect(replaceNodeContent).not.toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 'file-001',
    }));
  });

  it('leaves text save upload-session cleanup inside the composed uploader', async () => {
    const { service, appSdkClient, requests } = createRemoteService({});
    const replaceNodeContent = vi.fn(async (_request: DriveUploaderReplaceNodeContentRequest) => {
      throw new Error('Drive uploader signed upload failed with HTTP 503.');
    });
    Object.assign(appSdkClient.uploader, { replaceNodeContent });

    await expect(service.saveFileText(
      {
        id: 'file-001',
        name: 'Roadmap.md',
        type: 'file',
        spaceId: 'my-storage',
        mimeType: 'text/markdown',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ownerId: 'Ada',
      },
      '# Updated\n',
      'text/markdown',
    )).rejects.toThrow('Drive uploader signed upload failed with HTTP 503.');

    expect(replaceNodeContent).toHaveBeenCalledTimes(1);
    expect(requests).toEqual([]);
  });

  it('lists and extracts ZIP archive entries through generated Drive App SDK operations', async () => {
    const { service, requests } = createRemoteService({
      'archiveEntries.list': {
        items: [
          {
            path: 'docs/',
            name: 'docs',
            isDirectory: true,
            uncompressedSizeBytes: '0',
            compressedSizeBytes: '0',
          },
          {
            path: 'docs/readme.txt',
            name: 'readme.txt',
            isDirectory: false,
            uncompressedSizeBytes: '18',
            compressedSizeBytes: '18',
            contentType: 'text/plain',
          },
        ],
      },
      'archiveEntries.extract': {
        extractedCount: '1',
        items: [
          {
            id: 'node-extracted-readme',
            spaceId: 'my-storage',
            parentNodeId: 'folder-docs',
            nodeType: 'file',
            nodeName: 'readme.txt',
            lifecycleStatus: 'active',
            version: 1,
          },
        ],
      },
    });
    const archiveFile = {
      id: 'file-archive',
      name: 'report.zip',
      type: 'file' as const,
      spaceId: 'my-storage',
      mimeType: 'application/zip',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'Ada',
    };

    const archiveListAbortController = new AbortController();
    const archiveExtractAbortController = new AbortController();
    const entries = await service.listArchiveEntries(archiveFile, {
      signal: archiveListAbortController.signal,
    });
    const extracted = await service.extractArchiveEntries(archiveFile, ['docs/readme.txt'], {
      signal: archiveExtractAbortController.signal,
    });

    expect(entries).toEqual([
      {
        path: 'docs/',
        name: 'docs',
        isDirectory: true,
        uncompressedSizeBytes: 0,
        compressedSizeBytes: 0,
      },
      {
        path: 'docs/readme.txt',
        name: 'readme.txt',
        isDirectory: false,
        uncompressedSizeBytes: 18,
        compressedSizeBytes: 18,
        contentType: 'text/plain',
      },
    ]);
    expect(extracted).toEqual([
      expect.objectContaining({
        id: 'node-extracted-readme',
        name: 'readme.txt',
        type: 'file',
        parentId: 'folder-docs',
        spaceId: 'my-storage',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'archiveEntries.list',
        signal: archiveListAbortController.signal,
        pathParams: { nodeId: 'file-archive' },
      }),
      expect.objectContaining({
        operationId: 'archiveEntries.extract',
        signal: archiveExtractAbortController.signal,
        pathParams: { nodeId: 'file-archive' },
        body: {
          entryPaths: ['docs/readme.txt'],
        },
      }),
    ]);
  });

  it('records PDF signatures through the generated Drive App SDK node property surface', async () => {
    const { service, requests } = createRemoteService({
      'nodeProperties.set': {
        propertyKey: 'workflow.pdfSignature',
        propertyValue: '{"signatureType":"metadata_acknowledgement"}',
        visibility: 'private',
      },
    });

    const signAbortController = new AbortController();
    await service.signPdfFile({
      id: 'file-pdf',
      name: 'Contract.pdf',
      type: 'file',
      spaceId: 'my-storage',
      mimeType: 'application/pdf',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'Ada',
    }, {
      signal: signAbortController.signal,
    });

    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'nodeProperties.set',
        signal: signAbortController.signal,
        pathParams: {
          nodeId: 'file-pdf',
          propertyKey: 'workflow.pdfSignature',
        },
        body: expect.objectContaining({
          visibility: 'private',
        }),
      }),
    ]);
    const signatureBody = requests[0].body as { value?: unknown };
    expect(JSON.parse(String(signatureBody.value))).toEqual({
      signatureType: 'metadata_acknowledgement',
      signedBy: 'user-001',
      signedByDisplayName: 'Ada',
      signedAt: expect.any(String),
      fileName: 'Contract.pdf',
    });
  });

  it('lists knowledge base spaces from tenant-wide spaces.list results', async () => {
    const productKnowledgeSpaceNode = {
      ...knowledgeSpaceNode,
      id: 'space-kb-product',
      displayName: 'Product Handbooks',
    };
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, knowledgeSpaceNode, productKnowledgeSpaceNode, sharedSpaceNode],
      },
    });

    const listAbortController = new AbortController();
    const spaces = await service.listKnowledgeBaseSpaces({
      signal: listAbortController.signal,
    });

    expect(spaces).toEqual([
      {
        id: 'space-kb-engineering',
        name: 'Engineering Knowledge Base',
        icon: 'Book',
        color: 'blue',
      },
      {
        id: 'space-kb-product',
        name: 'Product Handbooks',
        icon: 'Book',
        color: 'blue',
      },
    ]);
    expect(service.getKnowledgeBaseSpaces()).toEqual(spaces);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        signal: listAbortController.signal,
      }),
    ]);
  });

  it('lists, creates, and deletes shared spaces through the Drive spaces SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, sharedSpaceNode],
      },
      'spaces.create': {
        ...sharedSpaceNode,
        id: 'space-design',
        displayName: 'Design Team',
        presentationIcon: 'Palette',
        presentationColor: 'blue',
        description: 'Design files',
      },
      'spaces.delete': {
        deleted: true,
      },
    });

    const listAbortController = new AbortController();
    const createAbortController = new AbortController();
    const deleteAbortController = new AbortController();
    const spaces = await service.listSharedSpaces({
      signal: listAbortController.signal,
    });
    const created = await service.createSharedSpace(
      'Design Team',
      'Palette',
      'blue',
      'Design files',
      {
        signal: createAbortController.signal,
      },
    );
    await service.deleteSharedSpace(created.id, {
      signal: deleteAbortController.signal,
    });

    expect(spaces).toEqual([
      {
        id: 'space-marketing',
        name: 'Marketing Assets',
        icon: 'Palette',
        color: 'violet',
        description: 'Marketing collateral',
        isCustom: true,
      },
    ]);
    expect(created).toMatchObject({
      id: 'space-design',
      name: 'Design Team',
      icon: 'Palette',
      color: 'blue',
      description: 'Design files',
      isCustom: true,
    });
    expect(requests.find((request) => request.operationId === 'spaces.list')).toMatchObject({
      signal: listAbortController.signal,
      query: {
      },
    });
    expect(requests.find((request) => request.operationId === 'spaces.create')).toMatchObject({
      signal: createAbortController.signal,
      body: {
        ownerSubjectType: 'group',
        ownerSubjectId: expect.any(String),
        displayName: 'Design Team',
        spaceType: 'team',
        presentationIcon: 'Palette',
        presentationColor: 'blue',
        description: 'Design files',
      },
    });
    expect(requests.find((request) => request.operationId === 'spaces.delete')).toMatchObject({
      signal: deleteAbortController.signal,
      pathParams: { spaceId: 'space-design' },
      query: {
      },
    });
  });

  it('merges shared space presentation metadata from the create request into the session cache', async () => {
    const { service } = createRemoteService({
      'spaces.create': {
        ...sharedSpaceNode,
        id: 'space-product',
        displayName: 'Product Team',
        presentationIcon: 'Palette',
        presentationColor: 'violet',
        description: 'Product specs',
      },
    });

    const created = await service.createSharedSpace(
      'Product Team',
      'Palette',
      'violet',
      'Product specs',
    );

    expect(created).toEqual({
      id: 'space-product',
      name: 'Product Team',
      icon: 'Palette',
      color: 'violet',
      description: 'Product specs',
      isCustom: true,
    });
    expect(service.getSharedSpaces()).toEqual([created]);
  });

  it('does not expose demo shared spaces before the remote spaces API responds', () => {
    const appSdkClient = createFakeClient({}, []);

    const service = createDriveFileService({
      appSdkClient,
      getSession: () => session,
    });

    expect(service.getSharedSpaces()).toEqual([]);
  });
});
