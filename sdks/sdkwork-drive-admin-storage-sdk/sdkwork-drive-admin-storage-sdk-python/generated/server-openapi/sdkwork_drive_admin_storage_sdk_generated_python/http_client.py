import json as json_module

from sdkwork.common.core.types import SdkConfig as CommonSdkConfig
from sdkwork.common.http import BaseHttpClient

SdkConfig = CommonSdkConfig
API_KEY_HEADER = 'Access-Token'
API_KEY_USE_BEARER = False


class HttpClient(BaseHttpClient):
    """
    SDK HTTP client wrapper based on sdkwork-common.

    Auth headers:
    - api_key -> Authorization: Bearer {api_key}
    - auth_token -> Authorization: Bearer {auth_token}
    - access_token -> Access-Token: {access_token}
    """

    def _update_auth_headers(self) -> None:
        if self._session is None:
            return

        self._session.headers.pop('Authorization', None)
        self._session.headers.pop('Access-Token', None)
        self._session.headers.pop('X-API-Key', None)

        if self._api_key:
            self._session.headers[API_KEY_HEADER] = f'Bearer {self._api_key}' if API_KEY_USE_BEARER else self._api_key
        if self._auth_token:
            self._session.headers['Authorization'] = f'Bearer {self._auth_token}'
        if self._access_token:
            self._session.headers['Access-Token'] = self._access_token

    def set_api_key(self, api_key: str) -> 'HttpClient':
        self._api_key = api_key
        self._auth_token = None
        self._access_token = None
        self._update_auth_headers()
        return self

    def set_auth_token(self, token: str) -> 'HttpClient':
        self._auth_token = token
        if API_KEY_HEADER.lower() != 'authorization':
            self._api_key = None
        self._update_auth_headers()
        return self

    def set_access_token(self, token: str) -> 'HttpClient':
        self._access_token = token
        if API_KEY_HEADER.lower() != 'access-token':
            self._api_key = None
        self._update_auth_headers()
        return self

    def set_header(self, key: str, value: str) -> 'HttpClient':
        self.headers[key] = value
        if self._session is not None:
            self._session.headers[key] = value
        return self

    def stream_json(self, path: str, method: str = 'POST', params=None, data=None, json=None, headers=None):
        response = self._get_session().request(
            method=method,
            url=f"{self.base_url}{path}",
            params=params,
            data=data,
            json=json,
            headers={'Accept': 'text/event-stream', **(headers or {})},
            timeout=self.timeout / 1000,
            stream=True,
        )
        response.raise_for_status()
        for line in response.iter_lines(decode_unicode=True):
            if not line or line.startswith(':'):
                continue
            if not line.startswith('data:'):
                continue
            data = line[5:].strip()
            if data == '[DONE]':
                break
            yield json_module.loads(data)
