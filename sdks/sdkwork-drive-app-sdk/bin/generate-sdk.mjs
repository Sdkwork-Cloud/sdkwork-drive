#!/usr/bin/env node
import {
  resolveFamilySdkRoot,
  runDriveSdkGenerator,
} from "../../../tools/drive_sdk_generator_runner.mjs";

runDriveSdkGenerator(
  {
    sdkName: "sdkwork-drive-app-sdk",
    sdkOwner: "sdkwork-drive",
    apiAuthority: "sdkwork-drive.app",
    sdkDependencies: [
      {
        workspace: "sdkwork-appbase-app-sdk",
        role: "appbase-app-capability",
        required: true,
        dependencyMode: "consumer-sdk",
        apiPrefix: "/app/v3/api",
        apiAuthority: "sdkwork-appbase.app",
        generatedTransportImportPolicy: "forbidden",
        packageByLanguage: {
          typescript: "@sdkwork/appbase-app-sdk",
          rust: "sdkwork-appbase-app-sdk",
          java: "com.sdkwork:sdkwork-appbase-app-sdk",
          python: "sdkwork-appbase-app-sdk",
          go: "github.com/sdkwork/sdkwork-appbase-app-sdk",
        },
      },
    ],
    sdkRoot: resolveFamilySdkRoot(import.meta.url),
    sdkType: "app",
    apiPrefix: "/app/v3/api",
    defaultBaseUrl: "http://127.0.0.1:18080",
    defaultOpenapiFile: "drive-app-api.openapi.json",
    standardProfileArgs: ["--standard-profile", "sdkwork-v3"],
    manifestStandardProfile: "sdkwork-v3",
  },
  process.argv.slice(2),
);
