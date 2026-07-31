import assert from "node:assert/strict";
import test from "node:test";

import { CloudDriveCapabilityUnavailableError, CloudDriveService } from "./CloudDriveService";

test("cloud drive operations fail closed until the Drive owner SDK is composed", async () => {
  const file = new File(["content"], "file.txt", { type: "text/plain" });
  for (const operation of [
    CloudDriveService.getFiles(),
    CloudDriveService.uploadFile(file),
    CloudDriveService.createFolder("folder"),
    CloudDriveService.deleteFile("file-id"),
    CloudDriveService.renameFile("file-id", "new-name"),
  ]) {
    await assert.rejects(operation, CloudDriveCapabilityUnavailableError);
  }
});
