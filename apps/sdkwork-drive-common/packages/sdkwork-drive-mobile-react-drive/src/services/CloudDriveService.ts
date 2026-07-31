export interface CloudFile {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  owner: string;
}

export class CloudDriveCapabilityUnavailableError extends Error {
  constructor() {
    super("Cloud Drive is unavailable because the Drive owner SDK is not composed.");
    this.name = "CloudDriveCapabilityUnavailableError";
  }
}

export class CloudDriveService {
  static async getFiles(): Promise<CloudFile[]> {
    throw new CloudDriveCapabilityUnavailableError();
  }

  static async uploadFile(_file: File): Promise<CloudFile> {
    throw new CloudDriveCapabilityUnavailableError();
  }

  static async createFolder(_name: string): Promise<CloudFile> {
    throw new CloudDriveCapabilityUnavailableError();
  }

  static async deleteFile(_id: string): Promise<void> {
    throw new CloudDriveCapabilityUnavailableError();
  }

  static async renameFile(_id: string, _newName: string): Promise<void> {
    throw new CloudDriveCapabilityUnavailableError();
  }
}
