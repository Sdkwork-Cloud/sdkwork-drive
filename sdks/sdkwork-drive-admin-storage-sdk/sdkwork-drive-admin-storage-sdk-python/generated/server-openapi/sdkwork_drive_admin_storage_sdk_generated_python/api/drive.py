from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import CopyProviderObjectRequest, CreateStorageProviderRequest, DeleteStorageProviderBindingResponse, DeleteStorageProviderResponse, ListStorageProvidersResponse, OperatorRequest, ProviderBucket, ProviderBucketList, ProviderBucketMutation, ProviderObject, ProviderObjectList, ProviderObjectMutation, RotateStorageProviderCredentialRequest, SetDefaultStorageProviderBindingRequest, StorageProvider, StorageProviderBinding, StorageProviderBindingListResponse, StorageProviderCapabilities, TestStorageProviderRequest, TestStorageProviderResponse, UpdateStorageProviderRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"

def serialize_path_parameter(value: Any, spec: Dict[str, Any]) -> str:
    if value is None:
        return ''

    style = str(spec.get('style') or 'simple')
    name = str(spec.get('name') or '')
    explode = bool(spec.get('explode'))
    if isinstance(value, (list, tuple)):
        return serialize_path_array(name, value, style, explode)
    if isinstance(value, dict):
        return serialize_path_object(name, value, style, explode)
    return path_prefix(name, style) + encode_path_value(serialize_path_primitive(value))


def serialize_path_array(name: str, values: Any, style: str, explode: bool) -> str:
    serialized = [encode_path_value(serialize_path_primitive(item)) for item in values if item is not None]
    if not serialized:
        return path_prefix(name, style)
    if style == 'matrix':
        return ''.join(f";{name}={item}" for item in serialized) if explode else f";{name}={','.join(serialized)}"
    return path_prefix(name, style) + ('.' if explode else ',').join(serialized)


def serialize_path_object(name: str, value: Dict[str, Any], style: str, explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return path_prefix(name, style)
    if style == 'matrix':
        if explode:
            return ''.join(f";{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
        return f";{name}={serialized}"
    if explode:
        separator = '.' if style == 'label' else ','
        serialized = separator.join(f"{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
    else:
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
    return path_prefix(name, style) + serialized


def path_prefix(name: str, style: str) -> str:
    if style == 'label':
        return '.'
    if style == 'matrix':
        return f";{name}"
    return ''


def encode_path_value(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def serialize_path_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def build_query_string(parameters: List[Dict[str, Any]]) -> str:
    pairs: List[str] = []
    for parameter in parameters:
        append_serialized_parameter(pairs, parameter)
    return '&'.join(pairs)


def append_serialized_parameter(pairs: List[str], parameter: Dict[str, Any]) -> None:
    value = parameter.get('value')
    if value is None:
        return

    name = str(parameter.get('name') or '')
    allow_reserved = bool(parameter.get('allow_reserved'))
    content_type = parameter.get('content_type')
    if content_type:
        import json

        pairs.append(f"{encode_query_component(name)}={encode_query_value(json.dumps(value, separators=(',', ':')), allow_reserved)}")
        return

    style = str(parameter.get('style') or 'form')
    explode = bool(parameter.get('explode'))
    if style == 'deepObject':
        append_deep_object_parameter(pairs, name, value, allow_reserved)
        return
    if isinstance(value, (list, tuple)):
        append_array_parameter(pairs, name, value, style, explode, allow_reserved)
        return
    if isinstance(value, dict):
        append_object_parameter(pairs, name, value, style, explode, allow_reserved)
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")


def append_array_parameter(
    pairs: List[str],
    name: str,
    value: Any,
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    values = [serialize_primitive(item) for item in value if item is not None]
    if not values:
        return

    if style == 'form' and explode:
        for item in values:
            pairs.append(f"{encode_query_component(name)}={encode_query_value(item, allow_reserved)}")
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(','.join(values), allow_reserved)}")


def append_object_parameter(
    pairs: List[str],
    name: str,
    value: Dict[str, Any],
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return

    if style == 'form' and explode:
        for key, entry_value in entries:
            pairs.append(f"{encode_query_component(str(key))}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")
        return

    serialized = ','.join(
        item
        for key, entry_value in entries
        for item in (str(key), serialize_primitive(entry_value))
    )
    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialized, allow_reserved)}")


def append_deep_object_parameter(pairs: List[str], name: str, value: Any, allow_reserved: bool) -> None:
    if not isinstance(value, dict):
        pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")
        return

    for key, entry_value in value.items():
        if entry_value is None:
            continue
        pairs.append(f"{encode_query_component(f'{name}[{key}]')}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")


def serialize_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def encode_query_component(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def encode_query_value(value: str, allow_reserved: bool) -> str:
    from urllib.parse import quote

    return quote(value, safe=':/?#[]@!$&\'()*+,;=' if allow_reserved else '')



class DriveApi:
    """drive drive API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.storage_provider_bindings = DriveStorageProviderBindingsApi(client)
        self.storage_providers = DriveStorageProvidersApi(client)


class DriveStorageProviderBindingsApi:
    """drive drive.storage_provider_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.default = DriveStorageProviderBindingsDefaultApi(client)


    def list(self, space_id: Optional[str] = None, provider_id: Optional[str] = None, lifecycle_status: Optional[str] = None) -> StorageProviderBindingListResponse:
        """List Drive storage provider bindings"""
        query = build_query_string([
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'providerId', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'lifecycleStatus', 'value': lifecycle_status, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/storage/bindings", query))

class DriveStorageProviderBindingsDefaultApi:
    """drive drive.storage_provider_bindings.default API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, space_id: Optional[str] = None, space_type: Optional[str] = None) -> StorageProviderBinding:
        query = build_query_string([
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceType', 'value': space_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/storage/bindings/default", query))

    def set(self, body: SetDefaultStorageProviderBindingRequest) -> StorageProviderBinding:
        return self._client.put(f"/backend/v3/api/drive/storage/bindings/default", json=body)

    def delete(self, operator_id: str, space_id: Optional[str] = None) -> DeleteStorageProviderBindingResponse:
        """Delete a Drive default storage provider binding"""
        query = build_query_string([
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/backend/v3/api/drive/storage/bindings/default", query))

class DriveStorageProvidersApi:
    """drive drive.storage_providers API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.capabilities = DriveStorageProvidersCapabilitiesApi(client)
        self.credentials = DriveStorageProvidersCredentialsApi(client)
        self.bucket = DriveStorageProvidersBucketApi(client)
        self.objects = DriveStorageProvidersObjectsApi(client)


    def list(self, status: Optional[str] = None) -> ListStorageProvidersResponse:
        query = build_query_string([
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/storage/providers", query))

    def create(self, body: CreateStorageProviderRequest) -> StorageProvider:
        return self._client.post(f"/backend/v3/api/drive/storage/providers", json=body)

    def update(self, provider_id: str, body: UpdateStorageProviderRequest) -> StorageProvider:
        return self._client.patch(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}", json=body)

    def delete(self, provider_id: str) -> DeleteStorageProviderResponse:
        return self._client.delete(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}")

    def get(self, provider_id: str) -> StorageProvider:
        return self._client.get(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}")

    def activate(self, provider_id: str, body: OperatorRequest) -> StorageProvider:
        return self._client.post(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/activate", json=body)

    def deactivate(self, provider_id: str, body: OperatorRequest) -> StorageProvider:
        return self._client.post(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/deactivate", json=body)

    def test(self, provider_id: str, body: TestStorageProviderRequest) -> TestStorageProviderResponse:
        return self._client.post(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/test", json=body)

class DriveStorageProvidersCapabilitiesApi:
    """drive drive.storage_providers.capabilities API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, provider_id: str) -> StorageProviderCapabilities:
        return self._client.get(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/capabilities")

class DriveStorageProvidersCredentialsApi:
    """drive drive.storage_providers.credentials API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def rotate(self, provider_id: str, body: RotateStorageProviderCredentialRequest) -> StorageProvider:
        return self._client.post(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/credentials/rotate", json=body)

class DriveStorageProvidersBucketApi:
    """drive drive.storage_providers.bucket API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def head(self, provider_id: str) -> ProviderBucket:
        return self._client.get(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/bucket")

    def create(self, provider_id: str, operator_id: str) -> ProviderBucketMutation:
        query = build_query_string([
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.put(_append_query_string(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/bucket", query))

    def delete(self, provider_id: str, operator_id: str) -> ProviderBucketMutation:
        query = build_query_string([
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/bucket", query))

    def list(self, provider_id: str) -> ProviderBucketList:
        """List buckets visible to a Drive storage provider account"""
        return self._client.get(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/buckets")

class DriveStorageProvidersObjectsApi:
    """drive drive.storage_providers.objects API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, provider_id: str, prefix: Optional[str] = None, delimiter: Optional[str] = None, page_token: Optional[str] = None, page_size: Optional[int] = None) -> ProviderObjectList:
        query = build_query_string([
            {'name': 'prefix', 'value': prefix, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'delimiter', 'value': delimiter, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/objects", query))

    def head(self, provider_id: str, object_key: str) -> ProviderObject:
        return self._client.get(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/objects/{serialize_path_parameter(object_key, {'name': 'objectKey', 'style': 'simple', 'explode': False})}")

    def delete(self, provider_id: str, object_key: str, operator_id: str) -> ProviderObjectMutation:
        query = build_query_string([
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/objects/{serialize_path_parameter(object_key, {'name': 'objectKey', 'style': 'simple', 'explode': False})}", query))

    def copy(self, provider_id: str, body: CopyProviderObjectRequest) -> ProviderObjectMutation:
        return self._client.post(f"/backend/v3/api/drive/storage/providers/{serialize_path_parameter(provider_id, {'name': 'providerId', 'style': 'simple', 'explode': False})}/objects/copy", json=body)
