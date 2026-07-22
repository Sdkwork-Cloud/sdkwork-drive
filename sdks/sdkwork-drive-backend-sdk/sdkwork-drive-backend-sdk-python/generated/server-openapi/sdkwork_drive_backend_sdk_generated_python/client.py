from .http_client import HttpClient, SdkConfig
from .api.drive import DriveApi
from .api.labels import LabelsApi
from .api.sandbox_volumes import SandboxVolumesApi
from .api.sandbox_grants import SandboxGrantsApi


class SdkworkBackendClient:
    """sdkwork-drive-backend-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.drive: DriveApi
        self.labels: LabelsApi
        self.sandbox_volumes: SandboxVolumesApi
        self.sandbox_grants: SandboxGrantsApi

        # Initialize API modules
        self.drive = DriveApi(self._client)
        self.labels = LabelsApi(self._client)
        self.sandbox_volumes = SandboxVolumesApi(self._client)
        self.sandbox_grants = SandboxGrantsApi(self._client)
    def set_auth_token(self, token: str) -> 'SdkworkBackendClient':
        """Set auth token for authentication."""
        self._client.set_auth_token(token)
        return self

    def set_access_token(self, token: str) -> 'SdkworkBackendClient':
        """Set access token for authentication."""
        self._client.set_access_token(token)
        return self

    def set_header(self, key: str, value: str) -> 'SdkworkBackendClient':
        """Set custom header."""
        self._client.set_header(key, value)
        return self

    @property
    def http(self) -> HttpClient:
        """Get the underlying HTTP client."""
        return self._client


def create_client(config: SdkConfig) -> SdkworkBackendClient:
    """Create a new SDK client instance."""
    return SdkworkBackendClient(config)
