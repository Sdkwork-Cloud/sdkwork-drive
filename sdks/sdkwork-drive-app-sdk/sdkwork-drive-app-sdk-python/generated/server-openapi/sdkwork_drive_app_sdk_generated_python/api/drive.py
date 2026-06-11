from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ArchiveEntryListResponse, ChangeListResponse, CommentListResponse, CommentRepliesDeleteResponse, CommentReplyListResponse, CommentsDeleteResponse, CompleteUploadSessionRequest, CopyNodeRequest, CreateCommentReplyRequest, CreateCommentRequest, CreateDownloadPackageRequest, CreateDownloadUrlRequest, CreateDownloadUrlResponse, CreateFileRequest, CreateFileResponse, CreateFolderRequest, CreatePermissionRequest, CreateShareLinkRequest, CreateSpaceRequest, CreateUploadSessionRequest, DeleteNodeResponse, DeleteSpaceResponse, DeleteVersionResponse, DownloadPackageResponse, DriveComment, DriveCommentReply, DriveNode, DrivePermission, DriveShareLink, DriveSpace, DriveUploadSession, EffectivePermissionListResponse, EmptyTrashRequest, EmptyTrashResponse, ExtractArchiveEntriesRequest, ExtractArchiveEntriesResponse, FavoriteNodeRequest, FavoriteNodeResponse, FileVersion, ListSpacesResponse, MarkUploaderPartUploadedRequest, MoveNodeRequest, NodeCapabilitiesResponse, NodeCommandRequest, NodeListResponse, NodePathResponse, PermissionListResponse, PermissionsDeleteResponse, PrepareUploaderUploadRequest, PrepareUploaderUploadResponse, PresignedUploadPart, PresignUploadPartRequest, ProblemDetail, QuotaSummary, ShareLinkListResponse, ShareLinksRevokeResponse, StartPageTokenResponse, UpdateCommentReplyRequest, UpdateCommentRequest, UpdateNodeRequest, UpdatePermissionRequest, UpdateShareLinkRequest, UpdateSpaceRequest, UploaderUploadPart, UploadSessionMutationResponse, VersionListResponse

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
        self.changes = DriveChangesApi(client)
        self.download_tokens = DriveDownloadTokensApi(client)
        self.download_urls = DriveDownloadUrlsApi(client)
        self.favorites = DriveFavoritesApi(client)
        self.quotas = DriveQuotasApi(client)
        self.nodes = DriveNodesApi(client)
        self.comments = DriveCommentsApi(client)
        self.comment_replies = DriveCommentRepliesApi(client)
        self.permissions = DrivePermissionsApi(client)
        self.share_links = DriveShareLinksApi(client)
        self.trash = DriveTrashApi(client)
        self.versions = DriveVersionsApi(client)
        self.recent = DriveRecentApi(client)
        self.search = DriveSearchApi(client)
        self.shared_with_me = DriveSharedWithMeApi(client)
        self.spaces = DriveSpacesApi(client)
        self.upload_sessions = DriveUploadSessionsApi(client)
        self.download_packages = DriveDownloadPackagesApi(client)
        self.archive_entries = DriveArchiveEntriesApi(client)
        self.uploader = DriveUploaderApi(client)


class DriveChangesApi:
    """drive drive.changes API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.start_page_token = DriveChangesStartPageTokenApi(client)


    def list(self, tenant_id: str, space_id: Optional[str] = None, cursor: Optional[int] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> ChangeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/changes", query))

class DriveChangesStartPageTokenApi:
    """drive drive.changes.start_page_token API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, tenant_id: str, space_id: Optional[str] = None) -> StartPageTokenResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/changes/start_page_token", query))

class DriveDownloadTokensApi:
    """drive drive.download_tokens API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def resolve(self, token: str, tenant_id: str) -> ProblemDetail:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/download_tokens/{serialize_path_parameter(token, {'name': 'token', 'style': 'simple', 'explode': False})}", query))

class DriveDownloadUrlsApi:
    """drive drive.download_urls API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: CreateDownloadUrlRequest) -> CreateDownloadUrlResponse:
        return self._client.post(f"/app/v3/api/drive/download_urls", json=body)

class DriveFavoritesApi:
    """drive drive.favorites API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, tenant_id: str, subject_type: str, subject_id: str, space_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectType', 'value': subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectId', 'value': subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/favorites", query))

    def set(self, node_id: str, body: FavoriteNodeRequest) -> FavoriteNodeResponse:
        return self._client.put(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/favorite", json=body)

    def delete(self, node_id: str, tenant_id: str, subject_type: str, subject_id: str, operator_id: Optional[str] = None) -> FavoriteNodeResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectType', 'value': subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectId', 'value': subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/favorite", query))

class DriveQuotasApi:
    """drive drive.quotas API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def summary(self, tenant_id: str) -> QuotaSummary:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/quotas/summary", query))

class DriveNodesApi:
    """drive drive.nodes API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.capabilities = DriveNodesCapabilitiesApi(client)
        self.download_urls = DriveNodesDownloadUrlsApi(client)
        self.path = DriveNodesPathApi(client)
        self.files = DriveNodesFilesApi(client)
        self.folders = DriveNodesFoldersApi(client)


    def update(self, node_id: str, body: UpdateNodeRequest) -> DriveNode:
        return self._client.patch(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}", json=body)

    def get(self, node_id: str, tenant_id: str) -> DriveNode:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}", query))

    def delete(self, node_id: str, tenant_id: str, operator_id: Optional[str] = None) -> DeleteNodeResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}", query))

    def copy(self, node_id: str, body: CopyNodeRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/copy", json=body)

    def move(self, node_id: str, body: MoveNodeRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/move", json=body)

    def list(self, space_id: str, tenant_id: str, parent_node_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'parentNodeId', 'value': parent_node_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/spaces/{serialize_path_parameter(space_id, {'name': 'spaceId', 'style': 'simple', 'explode': False})}/nodes", query))

class DriveNodesCapabilitiesApi:
    """drive drive.nodes.capabilities API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, node_id: str, tenant_id: str, subject_type: str, subject_id: str) -> NodeCapabilitiesResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectType', 'value': subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectId', 'value': subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/capabilities", query))

class DriveNodesDownloadUrlsApi:
    """drive drive.nodes.download_urls API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, node_id: str, tenant_id: str, requested_ttl_seconds: Optional[int] = None) -> CreateDownloadUrlResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'requestedTtlSeconds', 'value': requested_ttl_seconds, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/download_url", query))

class DriveNodesPathApi:
    """drive drive.nodes.path API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, node_id: str, tenant_id: str) -> NodePathResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/path", query))

class DriveNodesFilesApi:
    """drive drive.nodes.files API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: CreateFileRequest) -> CreateFileResponse:
        return self._client.post(f"/app/v3/api/drive/nodes/files", json=body)

class DriveNodesFoldersApi:
    """drive drive.nodes.folders API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: CreateFolderRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/nodes/folders", json=body)

class DriveCommentsApi:
    """drive drive.comments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, node_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> CommentListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments", query))

    def create(self, node_id: str, body: CreateCommentRequest) -> DriveComment:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments", json=body)

    def get(self, node_id: str, comment_id: str, tenant_id: str) -> DriveComment:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}", query))

    def update(self, node_id: str, comment_id: str, body: UpdateCommentRequest) -> DriveComment:
        return self._client.patch(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}", json=body)

    def delete(self, node_id: str, comment_id: str, tenant_id: str, operator_id: Optional[str] = None) -> CommentsDeleteResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}", query))

class DriveCommentRepliesApi:
    """drive drive.comment_replies API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, node_id: str, comment_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> CommentReplyListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}/replies", query))

    def create(self, node_id: str, comment_id: str, body: CreateCommentReplyRequest) -> DriveCommentReply:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}/replies", json=body)

    def get(self, node_id: str, comment_id: str, reply_id: str, tenant_id: str) -> DriveCommentReply:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}/replies/{serialize_path_parameter(reply_id, {'name': 'replyId', 'style': 'simple', 'explode': False})}", query))

    def update(self, node_id: str, comment_id: str, reply_id: str, body: UpdateCommentReplyRequest) -> DriveCommentReply:
        return self._client.patch(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}/replies/{serialize_path_parameter(reply_id, {'name': 'replyId', 'style': 'simple', 'explode': False})}", json=body)

    def delete(self, node_id: str, comment_id: str, reply_id: str, tenant_id: str, operator_id: Optional[str] = None) -> CommentRepliesDeleteResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/comments/{serialize_path_parameter(comment_id, {'name': 'commentId', 'style': 'simple', 'explode': False})}/replies/{serialize_path_parameter(reply_id, {'name': 'replyId', 'style': 'simple', 'explode': False})}", query))

class DrivePermissionsApi:
    """drive drive.permissions API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.effective = DrivePermissionsEffectiveApi(client)


    def list(self, node_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> PermissionListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions", query))

    def create(self, node_id: str, body: CreatePermissionRequest) -> DrivePermission:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions", json=body)

    def delete(self, node_id: str, permission_id: str, tenant_id: str) -> PermissionsDeleteResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}", query))

    def update(self, node_id: str, permission_id: str, body: UpdatePermissionRequest) -> DrivePermission:
        return self._client.patch(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}", json=body)

    def get(self, node_id: str, permission_id: str, tenant_id: str) -> DrivePermission:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions/{serialize_path_parameter(permission_id, {'name': 'permissionId', 'style': 'simple', 'explode': False})}", query))

class DrivePermissionsEffectiveApi:
    """drive drive.permissions.effective API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, node_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> EffectivePermissionListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/permissions/effective", query))

class DriveShareLinksApi:
    """drive drive.share_links API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, node_id: str, body: CreateShareLinkRequest) -> DriveShareLink:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/share_links", json=body)

    def list(self, node_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> ShareLinkListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/share_links", query))

    def revoke(self, share_link_id: str, tenant_id: str) -> ShareLinksRevokeResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/share_links/{serialize_path_parameter(share_link_id, {'name': 'shareLinkId', 'style': 'simple', 'explode': False})}", query))

    def update(self, share_link_id: str, body: UpdateShareLinkRequest) -> DriveShareLink:
        return self._client.patch(f"/app/v3/api/drive/share_links/{serialize_path_parameter(share_link_id, {'name': 'shareLinkId', 'style': 'simple', 'explode': False})}", json=body)

    def get(self, share_link_id: str, tenant_id: str) -> DriveShareLink:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/share_links/{serialize_path_parameter(share_link_id, {'name': 'shareLinkId', 'style': 'simple', 'explode': False})}", query))

class DriveTrashApi:
    """drive drive.trash API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def move(self, node_id: str, body: NodeCommandRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/trash", json=body)

    def list(self, tenant_id: str, space_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/trash", query))

    def restore(self, node_id: str, body: NodeCommandRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/trash/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/restore", json=body)

    def empty(self, body: EmptyTrashRequest) -> EmptyTrashResponse:
        return self._client.post(f"/app/v3/api/drive/trash/empty", json=body)

class DriveVersionsApi:
    """drive drive.versions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, node_id: str, tenant_id: str, page_size: Optional[int] = None, page_token: Optional[str] = None) -> VersionListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/versions", query))

    def delete(self, node_id: str, version_id: str, tenant_id: str, operator_id: Optional[str] = None) -> DeleteVersionResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/versions/{serialize_path_parameter(version_id, {'name': 'versionId', 'style': 'simple', 'explode': False})}", query))

    def get(self, node_id: str, version_id: str, tenant_id: str) -> FileVersion:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/versions/{serialize_path_parameter(version_id, {'name': 'versionId', 'style': 'simple', 'explode': False})}", query))

    def restore(self, node_id: str, version_id: str, body: NodeCommandRequest) -> DriveNode:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/versions/{serialize_path_parameter(version_id, {'name': 'versionId', 'style': 'simple', 'explode': False})}/restore", json=body)

class DriveRecentApi:
    """drive drive.recent API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, tenant_id: str, space_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/recent", query))

class DriveSearchApi:
    """drive drive.search API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def query(self, tenant_id: str, q: Optional[str] = None, space_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/search", query))

class DriveSharedWithMeApi:
    """drive drive.shared_with_me API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, tenant_id: str, subject_type: str, subject_id: str, space_id: Optional[str] = None, page_size: Optional[int] = None, page_token: Optional[str] = None) -> NodeListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectType', 'value': subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'subjectId', 'value': subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'spaceId', 'value': space_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageSize', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'pageToken', 'value': page_token, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/shared_with_me", query))

class DriveSpacesApi:
    """drive drive.spaces API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, tenant_id: str, owner_subject_type: Optional[str] = None, owner_subject_id: Optional[str] = None) -> ListSpacesResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ownerSubjectType', 'value': owner_subject_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ownerSubjectId', 'value': owner_subject_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/spaces", query))

    def create(self, body: CreateSpaceRequest) -> DriveSpace:
        return self._client.post(f"/app/v3/api/drive/spaces", json=body)

    def get(self, space_id: str, tenant_id: str) -> DriveSpace:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/spaces/{serialize_path_parameter(space_id, {'name': 'spaceId', 'style': 'simple', 'explode': False})}", query))

    def update(self, space_id: str, body: UpdateSpaceRequest) -> DriveSpace:
        return self._client.patch(f"/app/v3/api/drive/spaces/{serialize_path_parameter(space_id, {'name': 'spaceId', 'style': 'simple', 'explode': False})}", json=body)

    def delete(self, space_id: str, tenant_id: str, operator_id: Optional[str] = None) -> DeleteSpaceResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'operatorId', 'value': operator_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.delete(_append_query_string(f"/app/v3/api/drive/spaces/{serialize_path_parameter(space_id, {'name': 'spaceId', 'style': 'simple', 'explode': False})}", query))

class DriveUploadSessionsApi:
    """drive drive.upload_sessions API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.parts = DriveUploadSessionsPartsApi(client)


    def create(self, body: CreateUploadSessionRequest) -> DriveUploadSession:
        return self._client.post(f"/app/v3/api/drive/upload_sessions", json=body)

    def get(self, upload_session_id: str, tenant_id: str) -> UploadSessionMutationResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/upload_sessions/{serialize_path_parameter(upload_session_id, {'name': 'uploadSessionId', 'style': 'simple', 'explode': False})}", query))

    def abort(self, upload_session_id: str, body: NodeCommandRequest) -> UploadSessionMutationResponse:
        return self._client.post(f"/app/v3/api/drive/upload_sessions/{serialize_path_parameter(upload_session_id, {'name': 'uploadSessionId', 'style': 'simple', 'explode': False})}/abort", json=body)

    def complete(self, upload_session_id: str, body: CompleteUploadSessionRequest) -> UploadSessionMutationResponse:
        return self._client.post(f"/app/v3/api/drive/upload_sessions/{serialize_path_parameter(upload_session_id, {'name': 'uploadSessionId', 'style': 'simple', 'explode': False})}/complete", json=body)

class DriveUploadSessionsPartsApi:
    """drive drive.upload_sessions.parts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def presign(self, upload_session_id: str, part_no: int, body: PresignUploadPartRequest) -> PresignedUploadPart:
        return self._client.put(f"/app/v3/api/drive/upload_sessions/{serialize_path_parameter(upload_session_id, {'name': 'uploadSessionId', 'style': 'simple', 'explode': False})}/parts/{serialize_path_parameter(part_no, {'name': 'partNo', 'style': 'simple', 'explode': False})}", json=body)

class DriveDownloadPackagesApi:
    """drive drive.download_packages API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.download_urls = DriveDownloadPackagesDownloadUrlsApi(client)


    def create(self, body: CreateDownloadPackageRequest) -> DownloadPackageResponse:
        return self._client.post(f"/app/v3/api/drive/download_packages", json=body)

class DriveDownloadPackagesDownloadUrlsApi:
    """drive drive.download_packages.download_urls API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def get(self, package_id: str, tenant_id: str) -> DownloadPackageResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/download_packages/{serialize_path_parameter(package_id, {'name': 'packageId', 'style': 'simple', 'explode': False})}/download_url", query))

class DriveArchiveEntriesApi:
    """drive drive.archive_entries API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, node_id: str, tenant_id: str) -> ArchiveEntryListResponse:
        query = build_query_string([
            {'name': 'tenantId', 'value': tenant_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/archive_entries", query))

    def extract(self, node_id: str, body: ExtractArchiveEntriesRequest) -> ExtractArchiveEntriesResponse:
        return self._client.post(f"/app/v3/api/drive/nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/archive_entries/extract", json=body)

class DriveUploaderApi:
    """drive drive.uploader API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.uploads = DriveUploaderUploadsApi(client)


class DriveUploaderUploadsApi:
    """drive drive.uploader.uploads API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.parts = DriveUploaderUploadsPartsApi(client)


    def prepare(self, body: PrepareUploaderUploadRequest) -> PrepareUploaderUploadResponse:
        return self._client.post(f"/app/v3/api/drive/uploader/uploads", json=body)

class DriveUploaderUploadsPartsApi:
    """drive drive.uploader.uploads.parts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def mark_uploaded(self, upload_item_id: str, part_no: int, body: MarkUploaderPartUploadedRequest) -> UploaderUploadPart:
        return self._client.put(f"/app/v3/api/drive/uploader/uploads/{serialize_path_parameter(upload_item_id, {'name': 'uploadItemId', 'style': 'simple', 'explode': False})}/parts/{serialize_path_parameter(part_no, {'name': 'partNo', 'style': 'simple', 'explode': False})}", json=body)
