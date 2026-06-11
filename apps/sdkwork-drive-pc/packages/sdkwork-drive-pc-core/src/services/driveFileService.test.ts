import { describe, expect, it, vi } from 'vitest';
import {
  createDriveUploaderTransport,
  type DriveAppSdkClient,
  type DriveAppSdkRequest,
} from '../sdk/driveAppSdkClient';
import type {
  DriveAdminStorageSdkClient,
  DriveAdminStorageSdkRequest,
} from '../sdk/driveAdminStorageSdkClient';
import {
  createDriveUploaderClient,
  type DriveUploaderReplaceNodeContentRequest,
} from '@sdkwork/drive-app-sdk';
import type { SessionSnapshot } from '../session/sessionStore';
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
  tenantId: 'tenant-001',
  spaceId: 'my-storage',
  parentNodeId: 'root-folder',
  nodeType: 'folder',
  nodeName: 'Reports',
  lifecycleStatus: 'active',
  version: 1,
};

const sharedSpaceNode = {
  id: 'space-marketing',
  tenantId: 'tenant-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Marketing Assets',
  spaceType: 'team',
  lifecycleStatus: 'active',
  version: 1,
};

const personalSpaceNode = {
  id: 'my-storage',
  tenantId: 'tenant-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'My Storage',
  spaceType: 'personal',
  lifecycleStatus: 'active',
  version: 1,
};

const computerSpaceNode = {
  id: 'space-computer-001',
  tenantId: 'tenant-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Workstation Sync',
  spaceType: 'app_upload',
  lifecycleStatus: 'active',
  version: 1,
};

const gitRepositorySpaceNode = {
  id: 'space-git-repository-001',
  tenantId: 'tenant-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Git Repositories',
  spaceType: 'git_repository',
  lifecycleStatus: 'active',
  version: 1,
};

const knowledgeSpaceNode = {
  id: 'space-kb-engineering',
  tenantId: 'tenant-001',
  ownerSubjectType: 'user',
  ownerSubjectId: 'user-001',
  displayName: 'Engineering Knowledge Base',
  spaceType: 'knowledge_base',
  lifecycleStatus: 'active',
  version: 1,
};

const fileNode = {
  id: 'file-001',
  tenantId: 'tenant-001',
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

function createFakeAdminStorageClient(
  responses: Record<string, unknown>,
  requests: DriveAdminStorageSdkRequest[],
): DriveAdminStorageSdkClient {
  return {
    metadata: {} as DriveAdminStorageSdkClient['metadata'],
    operations: {} as DriveAdminStorageSdkClient['operations'],
    request: vi.fn(async (request: DriveAdminStorageSdkRequest): Promise<unknown> => {
      requests.push(request);
      return responses[request.operationId] ?? {};
    }) as DriveAdminStorageSdkClient['request'],
    setTokenManager: vi.fn(),
  };
}

function createEmptyAdminStorageClient(): DriveAdminStorageSdkClient {
  return createFakeAdminStorageClient({}, []);
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

function createRemoteService(
  responses: Record<string, unknown>,
  uploadFetch?: typeof fetch,
  downloadFetch?: typeof fetch,
): {
  service: DriveFileService;
  appSdkClient: DriveAppSdkClient;
  requests: DriveAppSdkRequest[];
  adminStorageRequests: DriveAdminStorageSdkRequest[];
} {
  const requests: DriveAppSdkRequest[] = [];
  const adminStorageRequests: DriveAdminStorageSdkRequest[] = [];
  const appSdkClient = createFakeClient(responses, requests);
  const adminStorageSdkClient = createFakeAdminStorageClient(responses, adminStorageRequests);
  const service = createDriveFileService({
    appSdkClient,
    adminStorageSdkClient,
    getSession: () => session,
    uploadFetch,
    downloadFetch,
  });

  return { service, appSdkClient, requests, adminStorageRequests };
}

describe('drive file service', () => {
  it('keeps Drive operations on the generated App SDK path without a local demo boundary', async () => {
    const appSdkClient = createFakeClient({}, []);
    const service = createDriveFileService({
      appSdkClient,
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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
      'nodeProperties.list': {
        items: [
          {
            propertyKey: 'ui.folderColor',
            propertyValue: 'blue',
          },
        ],
      },
    });

    const files = await service.listFiles('my-storage', undefined, 'root-folder');

    expect(requests[0]).toMatchObject({
      operationId: 'spaces.list',
      query: expect.objectContaining({
        tenantId: 'tenant-001',
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
      }),
    });
    expect(requests[1]).toMatchObject({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'my-storage' },
      query: {
        tenantId: 'tenant-001',
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
        color: 'blue',
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
      'nodeProperties.list': {
        items: [
          {
            propertyKey: 'ui.folderColor',
            propertyValue: 'blue',
          },
        ],
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
      expect.objectContaining({
        operationId: 'nodeProperties.list',
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
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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
          tenantId: 'tenant-001',
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
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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
        tenantId: 'tenant-001',
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
        displayName: 'My Storage',
        spaceType: 'personal',
        operatorId: 'actor-001',
      }),
    });
    expect(requests.find((request) => request.operationId === 'nodes.folders.create')).toMatchObject({
      body: expect.objectContaining({
        spaceId: 'space-created-personal',
      }),
    });
  });

  it('loads remote folder breadcrumb ancestors through the node path SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'nodes.path.get': {
        items: [
          {
            id: 'folder-root',
            tenantId: 'tenant-001',
            spaceId: 'my-storage',
            nodeType: 'folder',
            nodeName: 'Root',
            lifecycleStatus: 'active',
            version: 1,
          },
          {
            id: 'folder-child',
            tenantId: 'tenant-001',
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
        tenantId: 'tenant-001',
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
        tenantId: 'tenant-001',
        spaceId: 'my-storage',
        parentNodeId: 'root-folder',
        nodeName: 'Reports',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'nodes.update')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        tenantId: 'tenant-001',
        nodeName: 'Renamed.pdf',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'trash.move')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        tenantId: 'tenant-001',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'trash.restore')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      body: {
        tenantId: 'tenant-001',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'nodes.delete')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: { nodeId: 'file-001' },
      query: {
        tenantId: 'tenant-001',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'nodeProperties.set')).toMatchObject({
      signal: writeAbortController.signal,
      pathParams: {
        nodeId: 'folder-001',
        propertyKey: 'ui.folderColor',
      },
      body: {
        tenantId: 'tenant-001',
        value: 'emerald',
        visibility: 'private',
        operatorId: 'actor-001',
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
        tenantId: 'tenant-001',
        subjectType: 'user',
        subjectId: 'user-001',
        operatorId: 'actor-001',
      },
    });
    expect(requests[1]).toMatchObject({
      operationId: 'favorites.set',
      signal: favoriteAbortController.signal,
      pathParams: { nodeId: 'file-002' },
      body: {
        tenantId: 'tenant-001',
        subjectType: 'user',
        subjectId: 'user-001',
        operatorId: 'actor-001',
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
        tenantId: 'tenant-001',
        subjectType: 'user',
        subjectId: 'user-001',
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
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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

  it('lists the computers view from app upload spaces instead of a synthetic computers space id', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, computerSpaceNode, sharedSpaceNode],
      },
      'nodes.list': {
        items: [
          {
            ...fileNode,
            id: 'file-computer-001',
            spaceId: 'space-computer-001',
            parentNodeId: undefined,
            nodeName: 'Desktop Sync.pdf',
          },
        ],
      },
      'favorites.list': {
        items: [],
      },
    });

    const files = await service.listFiles('computers');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'file-computer-001',
        name: 'Desktop Sync.pdf',
        spaceId: 'space-computer-001',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-computer-001' },
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          pageSize: 200,
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          spaceId: 'space-computer-001',
        }),
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'computers'),
    ).toBe(false);
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
          tenantId: 'tenant-001',
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-git-repository-001' },
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          pageSize: 200,
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          spaceId: 'space-git-repository-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodeProperties.list',
        pathParams: { nodeId: 'folder-git-repository-sdkwork-drive' },
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          visibility: 'private',
          pageSize: 200,
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
        tenantId: 'tenant-001',
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
        displayName: 'Git Repositories',
        spaceType: 'git_repository',
        operatorId: 'actor-001',
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
      adminStorageSdkClient: createEmptyAdminStorageClient(),
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

    const files = await service.listFiles('kb-engineering');

    expect(files).toEqual([
      expect.objectContaining({
        id: 'file-kb-001',
        name: 'Runbook.md',
        spaceId: 'space-kb-engineering',
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.list',
        pathParams: { spaceId: 'space-kb-engineering' },
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          pageSize: 200,
        }),
      }),
      expect.objectContaining({
        operationId: 'favorites.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          spaceId: 'space-kb-engineering',
        }),
      }),
    ]);
    expect(
      requests.some((request) => request.operationId === 'nodes.list' && request.pathParams?.spaceId === 'kb-engineering'),
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

    const folder = await service.createFolder('Runbooks', 'kb-engineering');

    expect(folder).toMatchObject({
      id: 'folder-kb-001',
      name: 'Runbooks',
      spaceId: 'space-kb-engineering',
    });
    expect(requests).toEqual([
      expect.objectContaining({
        operationId: 'spaces.list',
        query: expect.objectContaining({
          tenantId: 'tenant-001',
          ownerSubjectType: 'user',
          ownerSubjectId: 'user-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodes.folders.create',
        body: expect.objectContaining({
          tenantId: 'tenant-001',
          spaceId: 'space-kb-engineering',
          nodeName: 'Runbooks',
          operatorId: 'actor-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'nodeProperties.list',
        pathParams: { nodeId: 'folder-kb-001' },
      }),
    ]);
  });

  it('uploads files in the computers view into the resolved app upload space', async () => {
    const uploadFetch = vi.fn<typeof fetch>(async () =>
      new Response('', {
        status: 200,
        headers: {
          ETag: '"etag-computer"',
        },
      }),
    );
    const { service, requests } = createRemoteService(
      {
        'spaces.list': {
          items: [personalSpaceNode, computerSpaceNode],
        },
        'uploader.uploads.prepare': {
          uploadItem: {
            id: 'upload-item-computer',
            taskId: 'task-computer',
            tenantId: 'tenant-001',
            userId: 'user-001',
            actorType: 'user',
            actorId: 'actor-001',
            appId: 'drive-pc',
            appResourceType: 'desktop-file-browser',
            appResourceId: 'computers',
            scene: 'drive_pc_file_upload',
            source: 'pc_local_file',
            uploadProfileCode: 'generic',
            fileFingerprint: 'pc:Desktop-Upload.txt:size:7:type:text.plain',
            spaceId: 'space-computer-001',
            nodeId: 'file-computer-upload',
            uploadSessionId: 'upload-computer',
            storageUploadId: 'storage-upload-computer',
            originalFileName: 'Desktop Upload.txt',
            contentType: 'text/plain',
            contentTypeGroup: 'text',
            contentLength: '7',
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
            id: 'upload-computer',
            tenantId: 'tenant-001',
            spaceId: 'space-computer-001',
            nodeId: 'file-computer-upload',
            bucket: 'bucket-s3',
            objectKey: 'objects/computer-upload',
            state: 'created',
            storageProviderId: 'provider-s3',
            storageUploadId: 'storage-upload-computer',
            expiresAtEpochMs: 1_800_000_000_000,
            version: 1,
          },
        },
        'uploadSessions.parts.presign': {
          uploadUrl: 'https://storage.example.test/computer-upload',
          method: 'PUT',
          partNo: 1,
          uploadId: 'storage-upload-computer',
          expiresAtEpochMs: 1_800_000_000_000,
        },
        'uploadSessions.complete': {
          id: 'upload-computer',
          state: 'completed',
        },
        'uploader.uploads.parts.markUploaded': {
          id: 'part-computer-1',
          status: 'uploaded',
        },
      },
      uploadFetch,
    );

    const uploaded = await service.uploadFile(
      new File(['desktop'], 'Desktop Upload.txt', { type: 'text/plain' }),
      'computers',
    );

    expect(uploaded).toMatchObject({
      id: 'file-computer-upload',
      name: 'Desktop Upload.txt',
      spaceId: 'space-computer-001',
      mimeType: 'text/plain',
    });
    expect(requests[0]).toMatchObject({
      operationId: 'spaces.list',
    });
    expect(requests[1]).toMatchObject({
      operationId: 'uploader.uploads.prepare',
      body: expect.objectContaining({
        tenantId: 'tenant-001',
        spaceId: 'space-computer-001',
        appId: 'drive-pc',
        appResourceType: 'desktop-file-browser',
        appResourceId: 'computers',
        scene: 'drive_pc_file_upload',
        source: 'pc_local_file',
        originalFileName: 'Desktop Upload.txt',
        operatorId: 'actor-001',
      }),
    });
    expect(requests.map((request) => request.operationId)).toEqual([
      'spaces.list',
      'uploader.uploads.prepare',
      'uploadSessions.parts.presign',
      'uploader.uploads.parts.markUploaded',
      'uploadSessions.complete',
    ]);
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
            tenantId: 'tenant-001',
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
            tenantId: 'tenant-001',
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
      tenantId: 'tenant-001',
      spaceId: 'my-storage',
      parentNodeId: 'folder-001',
      appId: 'drive-pc',
      appResourceType: 'desktop-file-browser',
      appResourceId: 'my-storage',
      scene: 'drive_pc_file_upload',
      source: 'pc_local_file',
      originalFileName: 'Roadmap.pdf',
      operatorId: 'actor-001',
    });
    expect(requests[2]).toMatchObject({
      pathParams: {
        uploadSessionId: 'upload-001',
        partNo: 1,
      },
      body: {
        tenantId: 'tenant-001',
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
        tenantId: 'tenant-001',
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
      tenantId: 'tenant-001',
      uploadId: 'storage-upload-001',
      contentType: 'application/pdf',
      contentLength: '5',
      checksumSha256Hex: 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      operatorId: 'actor-001',
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
            tenantId: 'tenant-001',
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
            tenantId: 'tenant-001',
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
    ]);
    expect(requests.every((request) => request.signal === abortController.signal)).toBe(true);
    expect(requests.some((request) => request.operationId === 'uploadSessions.abort')).toBe(false);
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
            tenantId: 'tenant-001',
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
            tenantId: 'tenant-001',
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
      tenantId: 'tenant-001',
      uploadId: 'storage-upload-generated',
      contentType: 'text/plain',
      contentLength: '11',
      checksumSha256Hex: 'sha256:71b6c1d53832f789a7f2435a7c629245fa3761ad8487775ebf4957330213a706',
      operatorId: 'actor-001',
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
        tenantId: 'tenant-001',
        requestedTtlSeconds: 300,
      },
      signal: downloadAbortController.signal,
    });
    expect(requests[1]).toMatchObject({
      operationId: 'downloadPackages.create',
      body: {
        tenantId: 'tenant-001',
        nodeIds: ['file-001', 'folder-001'],
        packageName: 'drive_export_2_items.zip',
        requestedTtlSeconds: 300,
        operatorId: 'actor-001',
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
        tenantId: 'tenant-001',
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
        query: {
          tenantId: 'tenant-001',
        },
        signal: summaryAbortController.signal,
      },
    ]);
  });

  it('manages storage providers through generated Drive Admin Storage SDK operations', async () => {
    const provider = {
      id: 'provider-s3-primary',
      providerKind: 's3_compatible',
      name: 'Primary S3',
      endpointUrl: 'https://s3.example.test',
      region: 'ap-southeast-1',
      bucket: 'drive-primary',
      pathStyle: true,
      credentialRef: 'secret:***',
      serverSideEncryptionMode: 'AES256',
      defaultStorageClass: 'STANDARD',
      status: 'active',
      version: 3,
      credentialConfigured: true,
    };
    const { service, requests, adminStorageRequests } = createRemoteService({
      'storageProviders.list': {
        items: [provider],
      },
      'storageProviders.create': provider,
      'storageProviders.update': {
        ...provider,
        name: 'Primary S3 Updated',
        version: 4,
      },
      'storageProviders.credentials.rotate': {
        ...provider,
        credentialRef: 'vault:***',
        version: 5,
      },
      'storageProviders.test': {
        providerId: 'provider-s3-primary',
        reachable: true,
      },
      'storageProviders.capabilities.get': {
        providerId: 'provider-s3-primary',
        providerKind: 's3_compatible',
        supportsMultipartUpload: true,
        supportsPresignedUploadPart: true,
        supportsPresignedDownload: true,
        supportsServerSideEncryption: true,
        supportsStorageClass: true,
        supportsCredentialRotation: true,
        supportedServerSideEncryptionModes: ['AES256'],
        supportedStorageClasses: ['STANDARD'],
      },
      'storageProviders.activate': provider,
      'storageProviders.deactivate': {
        ...provider,
        status: 'disabled',
      },
      'storageProviders.delete': {
        deleted: true,
      },
    });

    const listAbortController = new AbortController();
    const createAbortController = new AbortController();
    const updateAbortController = new AbortController();
    const rotateAbortController = new AbortController();
    const listed = await service.listStorageProviders('active', {
      signal: listAbortController.signal,
    });
    const created = await service.createStorageProvider({
      id: 'provider-s3-primary',
      providerKind: 's3_compatible',
      name: 'Primary S3',
      endpointUrl: 'https://s3.example.test',
      region: 'ap-southeast-1',
      bucket: 'drive-primary',
      pathStyle: true,
      credentialRef: 'secret:primary',
      serverSideEncryptionMode: 'AES256',
      defaultStorageClass: 'STANDARD',
      status: 'active',
    }, {
      signal: createAbortController.signal,
    });
    const updated = await service.updateStorageProvider('provider-s3-primary', {
      name: 'Primary S3 Updated',
      pathStyle: false,
    }, {
      signal: updateAbortController.signal,
    });
    const rotated = await service.rotateStorageProviderCredential(
      'provider-s3-primary',
      'vault:drive-primary',
      {
        signal: rotateAbortController.signal,
      },
    );
    const reachable = await service.testStorageProvider('provider-s3-primary');
    const capabilities = await service.getStorageProviderCapabilities('provider-s3-primary');
    const activated = await service.activateStorageProvider('provider-s3-primary');
    const deactivated = await service.deactivateStorageProvider('provider-s3-primary');
    const deleted = await service.deleteStorageProvider('provider-s3-primary');

    expect(listed).toEqual([provider]);
    expect(created).toEqual(provider);
    expect(updated).toMatchObject({ name: 'Primary S3 Updated', version: 4 });
    expect(rotated).toMatchObject({ credentialRef: 'vault:***', version: 5 });
    expect(reachable).toBe(true);
    expect(capabilities).toMatchObject({
      providerId: 'provider-s3-primary',
      supportsMultipartUpload: true,
      supportedStorageClasses: ['STANDARD'],
    });
    expect(activated).toMatchObject({ status: 'active' });
    expect(deactivated).toMatchObject({ status: 'disabled' });
    expect(deleted).toBe(true);
    expect(requests).toEqual([]);
    expect(adminStorageRequests).toEqual([
      expect.objectContaining({
        operationId: 'storageProviders.list',
        signal: listAbortController.signal,
        query: {
          status: 'active',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.create',
        signal: createAbortController.signal,
        body: expect.objectContaining({
          id: 'provider-s3-primary',
          providerKind: 's3_compatible',
          operatorId: 'actor-001',
        }),
      }),
      expect.objectContaining({
        operationId: 'storageProviders.update',
        signal: updateAbortController.signal,
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          name: 'Primary S3 Updated',
          pathStyle: false,
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.credentials.rotate',
        signal: rotateAbortController.signal,
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          credentialRef: 'vault:drive-primary',
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.test',
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.capabilities.get',
        pathParams: { providerId: 'provider-s3-primary' },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.activate',
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.deactivate',
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.delete',
        pathParams: { providerId: 'provider-s3-primary' },
        query: {
          operatorId: 'actor-001',
        },
      }),
    ]);
  });

  it('manages provider buckets, objects, and default bindings through generated Drive Admin Storage SDK operations', async () => {
    const provider = {
      id: 'provider-s3-primary',
      providerKind: 's3_compatible',
      name: 'Primary S3',
      endpointUrl: 'https://s3.example.test',
      bucket: 'drive-primary',
      pathStyle: true,
      status: 'active',
      version: 3,
      credentialConfigured: true,
    };
    const objectRecord = {
      providerId: 'provider-s3-primary',
      bucket: 'drive-primary',
      objectKey: 'tenants/tenant-001/spaces/my-storage/nodes/file-001/content',
      contentLength: 4096,
      contentType: 'application/pdf',
      etag: '"etag-001"',
      versionId: 'v1',
      storageClass: 'STANDARD',
      lastModifiedEpochMs: 1_800_000_000_000,
    };
    const binding = {
      id: 'default:tenant:tenant-001',
      tenantId: 'tenant-001',
      providerId: 'provider-s3-primary',
      bindingScope: 'tenant',
      purpose: 'primary',
      lifecycleStatus: 'active',
      version: 1,
      storageProvider: provider,
    };
    const { service, requests, adminStorageRequests } = createRemoteService({
      'storageProviders.bucket.head': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        exists: true,
      },
      'storageProviders.bucket.create': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        changed: true,
      },
      'storageProviders.bucket.delete': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        changed: false,
      },
      'storageProviders.buckets.list': {
        providerId: 'provider-s3-primary',
        configuredBucket: 'drive-primary',
        items: [
          {
            bucket: 'drive-primary',
            configured: true,
            creationDateEpochMs: 1_700_000_000_000,
          },
          {
            bucket: 'drive-archive',
            configured: false,
          },
        ],
      },
      'storageProviders.objects.list': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        prefix: 'tenants/tenant-001/',
        items: [objectRecord],
        nextPageToken: 'next-page',
      },
      'storageProviders.objects.head': objectRecord,
      'storageProviders.objects.delete': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        objectKey: objectRecord.objectKey,
        changed: true,
      },
      'storageProviders.objects.copy': {
        providerId: 'provider-s3-primary',
        bucket: 'drive-primary',
        objectKey: 'tenants/tenant-001/copied/file-001/content',
        changed: true,
      },
      'storageProviderBindings.default.get': binding,
      'storageProviderBindings.default.set': {
        ...binding,
        id: 'default:space:tenant-001:my-storage',
        spaceId: 'my-storage',
        bindingScope: 'space',
        version: 2,
      },
      'storageProviderBindings.list': {
        items: [
          binding,
          {
            ...binding,
            id: 'default:space:tenant-001:my-storage',
            spaceId: 'my-storage',
            bindingScope: 'space',
            version: 2,
          },
        ],
      },
      'storageProviderBindings.default.delete': {
        deleted: true,
      },
    });

    const objectAbortController = new AbortController();
    const bucketListAbortController = new AbortController();
    const bindingListAbortController = new AbortController();
    const deleteBindingAbortController = new AbortController();
    const bucket = await service.headStorageProviderBucket('provider-s3-primary');
    const createdBucket = await service.createStorageProviderBucket('provider-s3-primary');
    const deletedBucket = await service.deleteStorageProviderBucket('provider-s3-primary');
    const bucketList = await service.listStorageProviderBuckets('provider-s3-primary', {
      signal: bucketListAbortController.signal,
    });
    const objects = await service.listStorageProviderObjects(
      'provider-s3-primary',
      {
        prefix: 'tenants/tenant-001/',
        delimiter: '/',
        pageToken: 'page-1',
        pageSize: 50,
      },
      {
        signal: objectAbortController.signal,
      },
    );
    const object = await service.headStorageProviderObject('provider-s3-primary', objectRecord.objectKey);
    const deletedObject = await service.deleteStorageProviderObject('provider-s3-primary', objectRecord.objectKey);
    const copiedObject = await service.copyStorageProviderObject('provider-s3-primary', {
      sourceObjectKey: objectRecord.objectKey,
      destinationObjectKey: 'tenants/tenant-001/copied/file-001/content',
      metadataDirective: 'COPY',
    });
    const tenantBinding = await service.getDefaultStorageProviderBinding();
    const spaceBinding = await service.setDefaultStorageProviderBinding({
      providerId: 'provider-s3-primary',
      spaceId: 'my-storage',
    });
    const bindings = await service.listStorageProviderBindings(
      {
        spaceId: 'my-storage',
        providerId: 'provider-s3-primary',
        lifecycleStatus: 'active',
      },
      {
        signal: bindingListAbortController.signal,
      },
    );
    const deletedDefaultBinding = await service.deleteDefaultStorageProviderBinding(
      {
        spaceId: 'my-storage',
      },
      {
        signal: deleteBindingAbortController.signal,
      },
    );

    expect(bucket).toEqual({
      providerId: 'provider-s3-primary',
      bucket: 'drive-primary',
      exists: true,
    });
    expect(createdBucket.changed).toBe(true);
    expect(deletedBucket.changed).toBe(false);
    expect(bucketList).toEqual({
      providerId: 'provider-s3-primary',
      configuredBucket: 'drive-primary',
      items: [
        {
          bucket: 'drive-primary',
          configured: true,
          creationDateEpochMs: 1_700_000_000_000,
        },
        {
          bucket: 'drive-archive',
          configured: false,
        },
      ],
    });
    expect(objects).toEqual({
      providerId: 'provider-s3-primary',
      bucket: 'drive-primary',
      prefix: 'tenants/tenant-001/',
      items: [objectRecord],
      nextPageToken: 'next-page',
    });
    expect(object).toEqual(objectRecord);
    expect(deletedObject).toEqual({
      providerId: 'provider-s3-primary',
      bucket: 'drive-primary',
      objectKey: objectRecord.objectKey,
      changed: true,
    });
    expect(copiedObject).toEqual({
      providerId: 'provider-s3-primary',
      bucket: 'drive-primary',
      objectKey: 'tenants/tenant-001/copied/file-001/content',
      changed: true,
    });
    expect(tenantBinding).toEqual(binding);
    expect(spaceBinding).toMatchObject({
      id: 'default:space:tenant-001:my-storage',
      tenantId: 'tenant-001',
      spaceId: 'my-storage',
      providerId: 'provider-s3-primary',
      bindingScope: 'space',
    });
    expect(bindings).toHaveLength(2);
    expect(bindings[1]).toMatchObject({
      id: 'default:space:tenant-001:my-storage',
      spaceId: 'my-storage',
      providerId: 'provider-s3-primary',
    });
    expect(deletedDefaultBinding).toBe(true);
    expect(requests).toEqual([]);
    expect(adminStorageRequests).toEqual([
      expect.objectContaining({
        operationId: 'storageProviders.bucket.head',
        pathParams: { providerId: 'provider-s3-primary' },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.bucket.create',
        pathParams: { providerId: 'provider-s3-primary' },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.bucket.delete',
        pathParams: { providerId: 'provider-s3-primary' },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.buckets.list',
        signal: bucketListAbortController.signal,
        pathParams: { providerId: 'provider-s3-primary' },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.objects.list',
        signal: objectAbortController.signal,
        pathParams: { providerId: 'provider-s3-primary' },
        query: {
          prefix: 'tenants/tenant-001/',
          delimiter: '/',
          pageToken: 'page-1',
          pageSize: 50,
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.objects.head',
        pathParams: {
          providerId: 'provider-s3-primary',
          objectKey: objectRecord.objectKey,
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.objects.delete',
        pathParams: {
          providerId: 'provider-s3-primary',
          objectKey: objectRecord.objectKey,
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviders.objects.copy',
        pathParams: { providerId: 'provider-s3-primary' },
        body: {
          sourceObjectKey: objectRecord.objectKey,
          destinationObjectKey: 'tenants/tenant-001/copied/file-001/content',
          metadataDirective: 'COPY',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviderBindings.default.get',
        query: {
          tenantId: 'tenant-001',
          spaceId: undefined,
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviderBindings.default.set',
        body: {
          tenantId: 'tenant-001',
          spaceId: 'my-storage',
          providerId: 'provider-s3-primary',
          operatorId: 'actor-001',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviderBindings.list',
        signal: bindingListAbortController.signal,
        query: {
          tenantId: 'tenant-001',
          spaceId: 'my-storage',
          providerId: 'provider-s3-primary',
          lifecycleStatus: 'active',
        },
      }),
      expect.objectContaining({
        operationId: 'storageProviderBindings.default.delete',
        signal: deleteBindingAbortController.signal,
        query: {
          tenantId: 'tenant-001',
          spaceId: 'my-storage',
          operatorId: 'actor-001',
        },
      }),
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
      'https://drive.example.test/download/file-001',
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
      tenantId: 'tenant-001',
      userId: 'user-001',
      spaceId: 'my-storage',
      nodeId: 'file-001',
      appId: 'drive-pc',
      appResourceType: 'desktop-file-editor',
      appResourceId: 'file-001',
      scene: 'drive_pc_text_save',
      source: 'pc_text_editor',
      uploadProfileCode: 'text',
      originalFileName: 'Roadmap.md',
      contentType: 'text/markdown',
      operatorId: 'actor-001',
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
      tenantId: 'tenant-001',
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
            tenantId: 'tenant-001',
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
        query: {
          tenantId: 'tenant-001',
        },
      }),
      expect.objectContaining({
        operationId: 'archiveEntries.extract',
        signal: archiveExtractAbortController.signal,
        pathParams: { nodeId: 'file-archive' },
        body: {
          tenantId: 'tenant-001',
          entryPaths: ['docs/readme.txt'],
          operatorId: 'actor-001',
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
          tenantId: 'tenant-001',
          visibility: 'private',
          operatorId: 'actor-001',
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

  it('lists, creates, and deletes shared spaces through the Drive spaces SDK surface', async () => {
    const { service, requests } = createRemoteService({
      'spaces.list': {
        items: [personalSpaceNode, sharedSpaceNode],
      },
      'spaces.create': {
        ...sharedSpaceNode,
        id: 'space-design',
        displayName: 'Design Team',
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
        icon: 'Folder',
        color: 'blue',
        isCustom: true,
      },
    ]);
    expect(created).toMatchObject({
      id: 'space-design',
      name: 'Design Team',
      color: 'blue',
      icon: 'Folder',
      isCustom: true,
    });
    expect(requests.find((request) => request.operationId === 'spaces.list')).toMatchObject({
      signal: listAbortController.signal,
      query: {
        tenantId: 'tenant-001',
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'spaces.create')).toMatchObject({
      signal: createAbortController.signal,
      body: {
        tenantId: 'tenant-001',
        ownerSubjectType: 'user',
        ownerSubjectId: 'user-001',
        displayName: 'Design Team',
        spaceType: 'team',
        operatorId: 'actor-001',
      },
    });
    expect(requests.find((request) => request.operationId === 'spaces.delete')).toMatchObject({
      signal: deleteAbortController.signal,
      pathParams: { spaceId: 'space-design' },
      query: {
        tenantId: 'tenant-001',
        operatorId: 'actor-001',
      },
    });
  });

  it('does not synthesize unpersisted shared space presentation metadata after create', async () => {
    const { service } = createRemoteService({
      'spaces.create': {
        ...sharedSpaceNode,
        id: 'space-product',
        displayName: 'Product Team',
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
      icon: 'Folder',
      color: 'blue',
      isCustom: true,
    });
    expect(service.getSharedSpaces()).toEqual([created]);
  });

  it('does not expose demo shared spaces before the remote spaces API responds', () => {
    const appSdkClient = createFakeClient({}, []);

    const service = createDriveFileService({
      appSdkClient,
      adminStorageSdkClient: createEmptyAdminStorageClient(),
      getSession: () => session,
    });

    expect(service.getSharedSpaces()).toEqual([]);
  });
});
