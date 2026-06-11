import { describe, expect, it, vi } from 'vitest';
import {
  createDriveUploaderClient,
  type DriveUploaderTransport,
} from '@sdkwork/drive-app-sdk';

function createReplacementTransport(): {
  transport: DriveUploaderTransport;
  calls: string[];
} {
  const calls: string[] = [];
  const transport: DriveUploaderTransport = {
    drive: {
      uploader: {
        uploads: {
          prepare: vi.fn(),
          parts: {
            markUploaded: vi.fn(),
          },
        },
      },
      uploadSessions: {
        create: vi.fn(async (body) => {
          calls.push('uploadSessions.create');
          return {
            id: body.sessionId,
            tenantId: body.tenantId,
            spaceId: body.spaceId,
            nodeId: body.nodeId,
            bucket: 'bucket-001',
            objectKey: 'objects/replacement',
            idempotencyKey: body.idempotencyKey,
            state: 'created' as const,
            expiresAtEpochMs: body.expiresAtEpochMs,
            version: '1',
            storageProviderId: 'provider-001',
            storageUploadId: 'storage-upload-replacement',
          };
        }),
        parts: {
          presign: vi.fn(async (_uploadSessionId, partNo) => {
            calls.push('uploadSessions.parts.presign');
            return {
              uploadUrl: `https://storage.example.test/replacement/${partNo}`,
              method: 'PUT' as const,
              headers: {
                'x-sdkwork-drive': 'replacement',
              },
              partNo,
              uploadId: 'storage-upload-replacement',
              expiresAtEpochMs: '1800000000000',
            };
          }),
        },
        complete: vi.fn(async (uploadSessionId, body) => {
          calls.push('uploadSessions.complete');
          return {
            id: uploadSessionId,
            tenantId: body.tenantId,
            spaceId: 'my-storage',
            nodeId: 'file-001',
            bucket: 'bucket-001',
            objectKey: 'objects/replacement',
            state: 'completed' as const,
            expiresAtEpochMs: '1800000000000',
            version: '2',
            storageProviderId: 'provider-001',
            storageUploadId: body.uploadId || 'storage-upload-replacement',
          };
        }),
        abort: vi.fn(async (uploadSessionId, body) => {
          calls.push('uploadSessions.abort');
          return {
            id: uploadSessionId,
            tenantId: body.tenantId,
            spaceId: 'my-storage',
            nodeId: 'file-001',
            bucket: 'bucket-001',
            objectKey: 'objects/replacement',
            state: 'aborted' as const,
            expiresAtEpochMs: '1800000000000',
            version: '1',
            storageProviderId: 'provider-001',
            storageUploadId: 'storage-upload-replacement',
          };
        }),
      },
    },
  };
  return { transport, calls };
}

describe('Drive uploader composed client contract', () => {
  it('replaces existing node content inside the composed SDK boundary', async () => {
    const { transport, calls } = createReplacementTransport();
    const uploadFetch = vi.fn<typeof fetch>(async () =>
      new Response('', {
        status: 200,
        headers: {
          ETag: '"etag-replacement"',
        },
      }),
    );
    const client = createDriveUploaderClient({ transport, uploadFetch });

    const result = await client.replaceNodeContent({
      file: new File(['# Updated\n'], 'Roadmap.md', { type: 'text/markdown' }),
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
      nowEpochMs: '1800000000000',
    });

    expect(calls).toEqual([
      'uploadSessions.create',
      'uploadSessions.parts.presign',
      'uploadSessions.complete',
    ]);
    expect(transport.drive.uploadSessions.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-001',
      spaceId: 'my-storage',
      nodeId: 'file-001',
      operatorId: 'actor-001',
    }), expect.any(Object));
    expect(uploadFetch).toHaveBeenCalledWith(
      'https://storage.example.test/replacement/1',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'x-sdkwork-drive': 'replacement',
        },
        body: expect.any(Blob),
      }),
    );
    expect(transport.drive.uploadSessions.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tenantId: 'tenant-001',
        uploadId: 'storage-upload-replacement',
        contentType: 'text/markdown',
        contentLength: '10',
        checksumSha256Hex: 'sha256:ff5ae8bf981b37541f866f85b80010440b7349a1bc57cd83c79c0b2be12cc04b',
        operatorId: 'actor-001',
        parts: [
          {
            partNo: 1,
            etag: '"etag-replacement"',
          },
        ],
      }),
      expect.any(Object),
    );
    expect(result.uploadSession.state).toBe('completed');
    expect(result.parts).toEqual([
      {
        partNo: 1,
        etag: '"etag-replacement"',
        offsetBytes: 0,
        sizeBytes: 10,
      },
    ]);
  });

  it('aborts replacement sessions inside the composed SDK when provider upload fails', async () => {
    const { transport, calls } = createReplacementTransport();
    const client = createDriveUploaderClient({
      transport,
      uploadFetch: vi.fn<typeof fetch>(async () => new Response('', { status: 503 })),
    });

    await expect(client.replaceNodeContent({
      file: new File(['# Updated\n'], 'Roadmap.md', { type: 'text/markdown' }),
      tenantId: 'tenant-001',
      spaceId: 'my-storage',
      nodeId: 'file-001',
      appId: 'drive-pc',
      appResourceType: 'desktop-file-editor',
      appResourceId: 'file-001',
      originalFileName: 'Roadmap.md',
      contentType: 'text/markdown',
      operatorId: 'actor-001',
      nowEpochMs: '1800000000000',
    })).rejects.toThrow('Drive uploader signed upload failed with HTTP 503.');

    expect(calls).toEqual([
      'uploadSessions.create',
      'uploadSessions.parts.presign',
      'uploadSessions.abort',
    ]);
    expect(transport.drive.uploadSessions.abort).toHaveBeenCalledWith(
      expect.any(String),
      {
        tenantId: 'tenant-001',
        operatorId: 'actor-001',
      },
      expect.any(Object),
    );
  });

  it('plans multipart replacement uploads inside the composed SDK boundary', async () => {
    const { transport, calls } = createReplacementTransport();
    const uploadedBodies: string[] = [];
    const client = createDriveUploaderClient({
      transport,
      defaultChunkSizeBytes: 5,
      uploadFetch: vi.fn<typeof fetch>(async (url, init) => {
        const body = init?.body as Blob;
        uploadedBodies.push(new TextDecoder().decode(await body.arrayBuffer()));
        return new Response('', {
          status: 200,
          headers: {
            ETag: `"etag-${String(url).slice(-1)}"`,
          },
        });
      }),
    });

    const result = await client.replaceNodeContent({
      file: new File(['0123456789'], 'split.txt', { type: 'text/plain' }),
      tenantId: 'tenant-001',
      spaceId: 'my-storage',
      nodeId: 'file-001',
      appId: 'drive-pc',
      appResourceType: 'desktop-file-editor',
      appResourceId: 'file-001',
      originalFileName: 'split.txt',
      contentType: 'text/plain',
      operatorId: 'actor-001',
      nowEpochMs: '1800000000000',
    });

    expect(calls).toEqual([
      'uploadSessions.create',
      'uploadSessions.parts.presign',
      'uploadSessions.parts.presign',
      'uploadSessions.complete',
    ]);
    expect(uploadedBodies).toEqual(['01234', '56789']);
    expect(transport.drive.uploadSessions.parts.presign).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      1,
      expect.any(Object),
      expect.any(Object),
    );
    expect(transport.drive.uploadSessions.parts.presign).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      2,
      expect.any(Object),
      expect.any(Object),
    );
    expect(result.parts).toEqual([
      {
        partNo: 1,
        etag: '"etag-1"',
        offsetBytes: 0,
        sizeBytes: 5,
      },
      {
        partNo: 2,
        etag: '"etag-2"',
        offsetBytes: 5,
        sizeBytes: 5,
      },
    ]);
    expect(transport.drive.uploadSessions.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        parts: [
          {
            partNo: 1,
            etag: '"etag-1"',
          },
          {
            partNo: 2,
            etag: '"etag-2"',
          },
        ],
      }),
      expect.any(Object),
    );
  });
});
