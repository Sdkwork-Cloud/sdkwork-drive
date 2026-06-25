import type { PrepareUploaderUploadRequest } from "../generated/server-openapi/src/types";
import {
  createClient as createGeneratedDriveAppClient,
  SdkworkAppClient,
} from "../generated/server-openapi/src/index";
import type { SdkworkAppConfig } from "../generated/server-openapi/src/types/common";
import {
  operations,
  sdkMetadata,
} from "../composed/operations";
import {
  createDriveUploaderClient,
  type DriveUploaderClient,
  type DriveUploaderClientOptions,
  type DriveUploaderTransport,
} from "../composed/uploader/index";

export { SdkworkAppClient, createGeneratedDriveAppClient, operations, sdkMetadata };
export * from "../generated/server-openapi/src/types";
export * from "../generated/server-openapi/src/api";
export * from "../generated/server-openapi/src/http";
export * from "../generated/server-openapi/src/auth";
export {
  DriveUploaderClient,
  createDriveUploaderClient,
  createInMemoryUploaderStateStore,
  DEFAULT_UPLOADER_CHUNK_SIZE_BYTES,
  inferUploaderContentType,
  inferUploaderFileName,
  planUploaderParts,
} from "../composed/uploader/index";
export type {
  DriveUploaderBlobLike,
  DriveUploaderClientOptions,
  DriveUploaderCompletedPart,
  DriveUploaderPartPlan,
  DriveUploaderProfile,
  DriveUploaderProgress,
  DriveUploaderReplaceNodeContentRequest,
  DriveUploaderReplaceNodeContentResult,
  DriveUploaderRequest,
  DriveUploaderStateSnapshot,
  DriveUploaderStateStore,
  DriveUploaderTransport,
  DriveUploaderTransportOptions,
  DriveUploaderUploadResult,
} from "../composed/uploader/index";

export interface SdkworkDriveAppClient extends SdkworkAppClient {
  uploader: DriveUploaderClient;
}

export interface DriveAppClientOptions {
  uploader?: Omit<DriveUploaderClientOptions, "transport">;
}

export function createDriveUploaderTransport(
  client: Pick<SdkworkAppClient, "drive">,
): DriveUploaderTransport {
  return {
    drive: {
      uploader: {
        uploads: {
          prepare: (body) =>
            client.drive.uploader.uploads.prepare(body as PrepareUploaderUploadRequest),
          parts: {
            markUploaded: (uploadItemId, partNo, body) =>
              client.drive.uploader.uploads.parts.markUploaded(uploadItemId, partNo, body),
          },
        },
      },
      uploadSessions: {
        create: (body) =>
          client.drive.uploadSessions.create(body),
        parts: {
          presign: (uploadSessionId, partNo, body) =>
            client.drive.uploadSessions.parts.presign(uploadSessionId, partNo, body),
        },
        complete: (uploadSessionId, body) =>
          client.drive.uploadSessions.complete(uploadSessionId, body),
        abort: (uploadSessionId, body) =>
          client.drive.uploadSessions.abort(uploadSessionId, body),
      },
    },
  };
}

export function attachDriveUploader(
  client: SdkworkAppClient,
  options: DriveAppClientOptions = {},
): SdkworkDriveAppClient {
  const driveClient = client as SdkworkDriveAppClient;
  driveClient.uploader = createDriveUploaderClient({
    ...(options.uploader ?? {}),
    transport: createDriveUploaderTransport(client),
  });
  return driveClient;
}

export function createDriveAppClient(
  config: SdkworkAppConfig,
  options: DriveAppClientOptions = {},
): SdkworkDriveAppClient {
  return attachDriveUploader(createGeneratedDriveAppClient(config), options);
}

export function createClient(
  config: SdkworkAppConfig,
  options: DriveAppClientOptions = {},
): SdkworkDriveAppClient {
  return createDriveAppClient(config, options);
}


