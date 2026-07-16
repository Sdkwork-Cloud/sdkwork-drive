from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import CreateShortcutRequest, DriveNodeHttpResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"





class NodesApi:
    """nodes nodes API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.shortcuts = NodesShortcutsApi(client)


class NodesShortcutsApi:
    """nodes nodes.shortcuts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: CreateShortcutRequest) -> DriveNodeHttpResponse:
        """Create a shortcut node"""
        return self._client.post(f"/app/v3/api/drive/nodes/shortcuts", json=body)
