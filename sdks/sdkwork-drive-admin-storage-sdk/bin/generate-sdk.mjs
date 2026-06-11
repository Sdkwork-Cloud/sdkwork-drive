#!/usr/bin/env node
import {
  resolveFamilySdkRoot,
  runDriveSdkGenerator,
} from "../../../tools/drive_sdk_generator_runner.mjs";

runDriveSdkGenerator(
  {
    sdkName: "sdkwork-drive-admin-storage-sdk",
    sdkOwner: "sdkwork-drive",
    apiAuthority: "sdkwork-drive.admin.storage",
    sdkDependencies: [
      {
        workspace: "sdkwork-appbase-backend-sdk",
        role: "appbase-backend-management-capability",
        required: true,
        dependencyMode: "consumer-sdk",
        apiPrefix: "/backend/v3/api",
        apiAuthority: "sdkwork-appbase.backend",
        generatedTransportImportPolicy: "forbidden",
        packageByLanguage: {
          typescript: "@sdkwork/appbase-backend-sdk",
          rust: "sdkwork-appbase-backend-sdk",
          java: "com.sdkwork:sdkwork-appbase-backend-sdk",
          python: "sdkwork-appbase-backend-sdk",
          go: "github.com/sdkwork/sdkwork-appbase-backend-sdk",
        },
      },
    ],
    sdkRoot: resolveFamilySdkRoot(import.meta.url),
    sdkType: "custom",
    apiPrefix: "/admin/v3/api",
    defaultBaseUrl: "http://127.0.0.1:18080",
    defaultOpenapiFile: "drive-admin-storage-api.openapi.json",
    standardProfileArgs: [],
    manifestStandardProfile: "sdkwork-drive-admin-storage-v3",
  },
  process.argv.slice(2),
);
