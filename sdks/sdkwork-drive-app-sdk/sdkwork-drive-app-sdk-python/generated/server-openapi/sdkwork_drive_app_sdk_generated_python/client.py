from .http_client import HttpClient, SdkConfig
from .api.drive import DriveApi
from .api.node_labels import NodeLabelsApi
from .api.node_properties import NodePropertiesApi
from .api.nodes import NodesApi
from .api.watch_channels import WatchChannelsApi


class SdkworkAppClient:
    """sdkwork-drive-app-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.drive: DriveApi
        self.node_labels: NodeLabelsApi
        self.node_properties: NodePropertiesApi
        self.nodes: NodesApi
        self.watch_channels: WatchChannelsApi

        # Initialize API modules
        self.drive = DriveApi(self._client)
        self.node_labels = NodeLabelsApi(self._client)
        self.node_properties = NodePropertiesApi(self._client)
        self.nodes = NodesApi(self._client)
        self.watch_channels = WatchChannelsApi(self._client)

    def set_api_key(self, api_key: str) -> 'SdkworkAppClient':
        """Set API key for authentication."""
        self._client.set_api_key(api_key)
        return self

    def set_auth_token(self, token: str) -> 'SdkworkAppClient':
        """Set auth token for authentication."""
        self._client.set_auth_token(token)
        return self

    def set_access_token(self, token: str) -> 'SdkworkAppClient':
        """Set access token for authentication."""
        self._client.set_access_token(token)
        return self

    def set_header(self, key: str, value: str) -> 'SdkworkAppClient':
        """Set custom header."""
        self._client.set_header(key, value)
        return self

    @property
    def http(self) -> HttpClient:
        """Get the underlying HTTP client."""
        return self._client


def create_client(config: SdkConfig) -> SdkworkAppClient:
    """Create a new SDK client instance."""
    return SdkworkAppClient(config)
