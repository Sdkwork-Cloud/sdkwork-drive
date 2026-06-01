export const sdkMetadata = {
  name: "drive-app-sdk",
  packageName: "sdkwork-drive-app-api-generated-typescript",
  language: "typescript",
  standardProfile: "sdkwork-v3",
  baseUrl: "http://127.0.0.1:18080",
  apiPrefix: "/app/v3/api",
};

export const operations = {
  "downloadTokens.resolve": { method: "GET", path: "/app/v3/api/drive/download_tokens/{token}" },
  "downloadUrls.create": { method: "POST", path: "/app/v3/api/drive/download_urls" },
  "spaces.create": { method: "POST", path: "/app/v3/api/drive/spaces" },
  "spaces.list": { method: "GET", path: "/app/v3/api/drive/spaces" },
  "uploadSessions.create": { method: "POST", path: "/app/v3/api/drive/upload_sessions" },
};
