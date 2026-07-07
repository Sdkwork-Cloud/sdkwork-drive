from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AuditEventsListResponse, DownloadPackagesListResponse, MaintenanceAbandonedUploadTaskSweepResponse, MaintenanceExpiredUploadContentSweepResponse, MaintenanceJobsListResponse, MaintenanceObjectSweepResponse, MaintenanceUploadSessionSweepResponse, QuotasRetrieveResponse, QuotasUpdateResponse, SpacesAdminListResponse, SweepObjectStoreRequest, SweepUploadSessionsRequest, UpdateQuotaPolicyRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"


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
        self.audit_events = DriveAuditEventsApi(client)
        self.maintenance = DriveMaintenanceApi(client)
        self.quotas = DriveQuotasApi(client)
        self.spaces = DriveSpacesApi(client)
        self.download_packages = DriveDownloadPackagesApi(client)


class DriveAuditEventsApi:
    """drive drive.audit_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, action: Optional[str] = None, resource_type: Optional[str] = None, resource_id: Optional[str] = None, correlation_id: Optional[str] = None, trace_id: Optional[str] = None, page: Optional[int] = None, page_size: Optional[int] = None) -> AuditEventsListResponse:
        query = build_query_string([
            {'name': 'action', 'value': action, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'resourceType', 'value': resource_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'resourceId', 'value': resource_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'correlationId', 'value': correlation_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'traceId', 'value': trace_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/audit_events", query))

class DriveMaintenanceApi:
    """drive drive.maintenance API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.jobs = DriveMaintenanceJobsApi(client)


    def object_sweep(self, body: SweepObjectStoreRequest) -> MaintenanceObjectSweepResponse:
        return self._client.post(f"/backend/v3/api/drive/maintenance/object_sweep", json=body)

    def upload_session_sweep(self, body: SweepUploadSessionsRequest) -> MaintenanceUploadSessionSweepResponse:
        return self._client.post(f"/backend/v3/api/drive/maintenance/upload_session_sweep", json=body)

    def expired_upload_content_sweep(self, body: SweepUploadSessionsRequest) -> MaintenanceExpiredUploadContentSweepResponse:
        return self._client.post(f"/backend/v3/api/drive/maintenance/expired_upload_content_sweep", json=body)

    def abandoned_upload_task_sweep(self, body: SweepUploadSessionsRequest) -> MaintenanceAbandonedUploadTaskSweepResponse:
        return self._client.post(f"/backend/v3/api/drive/maintenance/abandoned_upload_task_sweep", json=body)

class DriveMaintenanceJobsApi:
    """drive drive.maintenance.jobs API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, job_type: Optional[str] = None, status: Optional[str] = None, operator_id: Optional[str] = None, page: Optional[int] = None, page_size: Optional[int] = None) -> MaintenanceJobsListResponse:
        query = build_query_string([
            {'name': 'jobType', 'value': job_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/maintenance/jobs", query))

class DriveQuotasApi:
    """drive drive.quotas API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> QuotasRetrieveResponse:
        return self._client.get(f"/backend/v3/api/drive/quotas")

    def update(self, body: UpdateQuotaPolicyRequest) -> QuotasUpdateResponse:
        """Update tenant quota policy"""
        return self._client.put(f"/backend/v3/api/drive/quotas", json=body)

class DriveSpacesApi:
    """drive drive.spaces API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.admin = DriveSpacesAdminApi(client)


class DriveSpacesAdminApi:
    """drive drive.spaces.admin API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, owner_subject_type: Optional[str] = None, owner_subject_id: Optional[str] = None, page_size: Optional[int] = None, cursor: Optional[str] = None) -> SpacesAdminListResponse:
        query = build_query_string([
            {'name': 'ownerSubjectType', 'value': owner_subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ownerSubjectId', 'value': owner_subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/spaces", query))

class DriveDownloadPackagesApi:
    """drive drive.download_packages API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, state: Optional[str] = None, page: Optional[int] = None, page_size: Optional[int] = None) -> DownloadPackagesListResponse:
        query = build_query_string([
            {'name': 'state', 'value': state, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/drive/download_packages", query))
