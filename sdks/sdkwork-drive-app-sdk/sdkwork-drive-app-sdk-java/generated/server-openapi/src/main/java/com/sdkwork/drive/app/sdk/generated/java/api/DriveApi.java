package com.sdkwork.drive.app.sdk.generated.java.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.drive.app.sdk.generated.java.http.HttpClient;
import com.sdkwork.drive.app.sdk.generated.java.model.*;
import java.util.List;
import java.util.Map;

public class DriveApi {
    private final HttpClient client;

    public DriveApi(HttpClient client) {
        this.client = client;
    }

    public ChangesListResponse changesList(String spaceId, Integer cursor, Integer pageSize) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/changes"), query));
        return client.convertValue(raw, new TypeReference<ChangesListResponse>() {});
    }

    public ChangesStartPageTokenRetrieveResponse changesStartPageTokenRetrieve(String spaceId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/changes/start_page_token"), query));
        return client.convertValue(raw, new TypeReference<ChangesStartPageTokenRetrieveResponse>() {});
    }

    public DownloadTokensRetrieveResponse downloadTokensRetrieve(String token) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/download_tokens/" + serializePathParameter(token, new PathParameterSpec("token", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DownloadTokensRetrieveResponse>() {});
    }

    public DownloadUrlsCreateResponse201 downloadUrlsCreate(CreateDownloadUrlRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/download_urls"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DownloadUrlsCreateResponse201>() {});
    }

    public FavoritesListResponse favoritesList(String spaceId, Integer pageSize, String cursor, String sortBy, String sortOrder) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sortBy", sortBy, "form", true, false, null),
            new QueryParameterSpec("sortOrder", sortOrder, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/favorites"), query));
        return client.convertValue(raw, new TypeReference<FavoritesListResponse>() {});
    }

    public SdkWorkApiResponse favoritesCheck(CheckFavoriteNodesRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/favorites/check"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SdkWorkApiResponse>() {});
    }

    public QuotasRetrieveResponse quotasRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/quotas/summary"));
        return client.convertValue(raw, new TypeReference<QuotasRetrieveResponse>() {});
    }

    public NodesUpdateResponse nodesUpdate(String nodeId, UpdateNodeRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<NodesUpdateResponse>() {});
    }

    public NodesRetrieveResponse nodesRetrieve(String nodeId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<NodesRetrieveResponse>() {});
    }

    public Void nodesDelete(String nodeId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""));
        return null;
    }

    public NodesCapabilitiesListResponse nodesCapabilitiesList(String nodeId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/capabilities"));
        return client.convertValue(raw, new TypeReference<NodesCapabilitiesListResponse>() {});
    }

    public CommentsListResponse commentsList(String nodeId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments"), query));
        return client.convertValue(raw, new TypeReference<CommentsListResponse>() {});
    }

    public CommentsCreateResponse201 commentsCreate(String nodeId, CreateCommentRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CommentsCreateResponse201>() {});
    }

    public CommentsRetrieveResponse commentsRetrieve(String nodeId, String commentId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CommentsRetrieveResponse>() {});
    }

    public CommentsUpdateResponse commentsUpdate(String nodeId, String commentId, UpdateCommentRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CommentsUpdateResponse>() {});
    }

    public Void commentsDelete(String nodeId, String commentId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""));
        return null;
    }

    public CommentRepliesListResponse commentRepliesList(String nodeId, String commentId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies"), query));
        return client.convertValue(raw, new TypeReference<CommentRepliesListResponse>() {});
    }

    public CommentRepliesCreateResponse201 commentRepliesCreate(String nodeId, String commentId, CreateCommentReplyRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CommentRepliesCreateResponse201>() {});
    }

    public CommentRepliesRetrieveResponse commentRepliesRetrieve(String nodeId, String commentId, String replyId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CommentRepliesRetrieveResponse>() {});
    }

    public CommentRepliesUpdateResponse commentRepliesUpdate(String nodeId, String commentId, String replyId, UpdateCommentReplyRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CommentRepliesUpdateResponse>() {});
    }

    public Void commentRepliesDelete(String nodeId, String commentId, String replyId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""));
        return null;
    }

    public NodesCopyResponse nodesCopy(String nodeId, CopyNodeRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/copy"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<NodesCopyResponse>() {});
    }

    public NodesDownloadUrlsRetrieveResponse nodesDownloadUrlsRetrieve(String nodeId, Integer requestedTtlSeconds) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("requestedTtlSeconds", requestedTtlSeconds, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/download_url"), query));
        return client.convertValue(raw, new TypeReference<NodesDownloadUrlsRetrieveResponse>() {});
    }

    public DownloadGrantsCreateResponse201 downloadGrantsCreate(String nodeId, CreateDownloadGrantRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/download_grants"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DownloadGrantsCreateResponse201>() {});
    }

    public FavoritesUpdateResponse favoritesUpdate(String nodeId, FavoriteNodeRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/favorite"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<FavoritesUpdateResponse>() {});
    }

    public Void favoritesDelete(String nodeId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/favorite"));
        return null;
    }

    public NodesMoveResponse nodesMove(String nodeId, MoveNodeRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/move"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<NodesMoveResponse>() {});
    }

    public NodesPathRetrieveResponse nodesPathRetrieve(String nodeId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/path"));
        return client.convertValue(raw, new TypeReference<NodesPathRetrieveResponse>() {});
    }

    public PermissionsListResponse permissionsList(String nodeId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions"), query));
        return client.convertValue(raw, new TypeReference<PermissionsListResponse>() {});
    }

    public PermissionsCreateResponse201 permissionsCreate(String nodeId, CreatePermissionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<PermissionsCreateResponse201>() {});
    }

    public Void permissionsDelete(String nodeId, String permissionId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""));
        return null;
    }

    public PermissionsUpdateResponse permissionsUpdate(String nodeId, String permissionId, UpdatePermissionRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<PermissionsUpdateResponse>() {});
    }

    public PermissionsRetrieveResponse permissionsRetrieve(String nodeId, String permissionId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<PermissionsRetrieveResponse>() {});
    }

    public PermissionsEffectiveListResponse permissionsEffectiveList(String nodeId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/effective"), query));
        return client.convertValue(raw, new TypeReference<PermissionsEffectiveListResponse>() {});
    }

    public ShareLinksCreateResponse201 shareLinksCreate(String nodeId, CreateShareLinkRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/share_links"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ShareLinksCreateResponse201>() {});
    }

    public ShareLinksListResponse shareLinksList(String nodeId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/share_links"), query));
        return client.convertValue(raw, new TypeReference<ShareLinksListResponse>() {});
    }

    public TrashCreateResponse201 trashCreate(String nodeId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/trash"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<TrashCreateResponse201>() {});
    }

    public VersionsListResponse versionsList(String nodeId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions"), query));
        return client.convertValue(raw, new TypeReference<VersionsListResponse>() {});
    }

    public Void versionsDelete(String nodeId, String versionId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + ""));
        return null;
    }

    public VersionsRetrieveResponse versionsRetrieve(String nodeId, String versionId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<VersionsRetrieveResponse>() {});
    }

    public VersionsRestoreResponse versionsRestore(String nodeId, String versionId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + "/restore"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<VersionsRestoreResponse>() {});
    }

    public NodesFilesCreateResponse201 nodesFilesCreate(CreateFileRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/files"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<NodesFilesCreateResponse201>() {});
    }

    public NodesFoldersCreateResponse201 nodesFoldersCreate(CreateFolderRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/folders"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<NodesFoldersCreateResponse201>() {});
    }

    public RecentListResponse recentList(String spaceId, Integer pageSize, String cursor, String sortBy, String sortOrder) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sortBy", sortBy, "form", true, false, null),
            new QueryParameterSpec("sortOrder", sortOrder, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/recent"), query));
        return client.convertValue(raw, new TypeReference<RecentListResponse>() {});
    }

    public SearchListResponse searchList(String q, String spaceId, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/search"), query));
        return client.convertValue(raw, new TypeReference<SearchListResponse>() {});
    }

    public ShareLinksClaimResponse shareLinksClaim(String token) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(token, new PathParameterSpec("token", "simple", false)) + "/claim"), null);
        return client.convertValue(raw, new TypeReference<ShareLinksClaimResponse>() {});
    }

    public Void shareLinksDelete(String shareLinkId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""));
        return null;
    }

    public ShareLinksUpdateResponse shareLinksUpdate(String shareLinkId, UpdateShareLinkRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ShareLinksUpdateResponse>() {});
    }

    public ShareLinksRetrieveResponse shareLinksRetrieve(String shareLinkId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ShareLinksRetrieveResponse>() {});
    }

    public SharedWithMeListResponse sharedWithMeList(String spaceId, Integer pageSize, String cursor, String sortBy, String sortOrder) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sortBy", sortBy, "form", true, false, null),
            new QueryParameterSpec("sortOrder", sortOrder, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/shared_with_me"), query));
        return client.convertValue(raw, new TypeReference<SharedWithMeListResponse>() {});
    }

    public SpacesListResponse spacesList(String ownerSubjectType, String ownerSubjectId, String spaceType, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("ownerSubjectType", ownerSubjectType, "form", true, false, null),
            new QueryParameterSpec("ownerSubjectId", ownerSubjectId, "form", true, false, null),
            new QueryParameterSpec("spaceType", spaceType, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces"), query));
        return client.convertValue(raw, new TypeReference<SpacesListResponse>() {});
    }

    public SpacesCreateResponse201 spacesCreate(CreateSpaceRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/spaces"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SpacesCreateResponse201>() {});
    }

    public MoveDestinationsListResponse moveDestinationsList(String spaceId, String excludeNodeIds, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("excludeNodeIds", excludeNodeIds, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + "/move_destinations"), query));
        return client.convertValue(raw, new TypeReference<MoveDestinationsListResponse>() {});
    }

    public SpacesRetrieveResponse spacesRetrieve(String spaceId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<SpacesRetrieveResponse>() {});
    }

    public SpacesUpdateResponse spacesUpdate(String spaceId, UpdateSpaceRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<SpacesUpdateResponse>() {});
    }

    public Void spacesDelete(String spaceId) throws Exception {
        client.delete(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""));
        return null;
    }

    public NodesListResponse nodesList(String spaceId, String parentNodeId, Integer pageSize, String cursor, String sortBy, String sortOrder) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("parentNodeId", parentNodeId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("sortBy", sortBy, "form", true, false, null),
            new QueryParameterSpec("sortOrder", sortOrder, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + "/nodes"), query));
        return client.convertValue(raw, new TypeReference<NodesListResponse>() {});
    }

    public TrashListResponse trashList(String spaceId, Integer pageSize, String cursor, String parentNodeId, String sortBy, String sortOrder) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("parentNodeId", parentNodeId, "form", true, false, null),
            new QueryParameterSpec("sortBy", sortBy, "form", true, false, null),
            new QueryParameterSpec("sortOrder", sortOrder, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/trash"), query));
        return client.convertValue(raw, new TypeReference<TrashListResponse>() {});
    }

    public TrashRestoreResponse trashRestore(String nodeId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/trash/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/restore"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<TrashRestoreResponse>() {});
    }

    public TrashEmptyResponse trashEmpty(EmptyTrashRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/trash/empty"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<TrashEmptyResponse>() {});
    }

    public UploadSessionsCreateResponse201 uploadSessionsCreate(CreateUploadSessionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionsCreateResponse201>() {});
    }

    public UploadSessionsRetrieveResponse uploadSessionsRetrieve(String uploadSessionId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<UploadSessionsRetrieveResponse>() {});
    }

    public UploadSessionsAbortResponse uploadSessionsAbort(String uploadSessionId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/abort"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionsAbortResponse>() {});
    }

    public UploadSessionsCompleteResponse uploadSessionsComplete(String uploadSessionId, CompleteUploadSessionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/complete"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionsCompleteResponse>() {});
    }

    public UploadSessionsPartsUpdateResponse uploadSessionsPartsUpdate(String uploadSessionId, Integer partNo, PresignUploadPartRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/parts/" + serializePathParameter(partNo, new PathParameterSpec("partNo", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionsPartsUpdateResponse>() {});
    }

    public DownloadPackagesCreateResponse201 downloadPackagesCreate(CreateDownloadPackageRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/download_packages"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DownloadPackagesCreateResponse201>() {});
    }

    public DownloadPackagesUrlsRetrieveResponse downloadPackagesUrlsRetrieve(String packageId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/download_packages/" + serializePathParameter(packageId, new PathParameterSpec("packageId", "simple", false)) + "/download_url"));
        return client.convertValue(raw, new TypeReference<DownloadPackagesUrlsRetrieveResponse>() {});
    }

    public ArchiveEntriesListResponse archiveEntriesList(String nodeId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/archive_entries"));
        return client.convertValue(raw, new TypeReference<ArchiveEntriesListResponse>() {});
    }

    public ArchiveEntriesExtractResponse archiveEntriesExtract(String nodeId, ExtractArchiveEntriesRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/archive_entries/extract"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ArchiveEntriesExtractResponse>() {});
    }

    public UploaderUploadsCreateResponse201 uploaderUploadsCreate(PrepareUploaderUploadRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/uploader/uploads"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploaderUploadsCreateResponse201>() {});
    }

    public UploaderUploadsPartsUpdateResponse uploaderUploadsPartsUpdate(String uploadItemId, Integer partNo, MarkUploaderPartUploadedRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/uploader/uploads/" + serializePathParameter(uploadItemId, new PathParameterSpec("uploadItemId", "simple", false)) + "/parts/" + serializePathParameter(partNo, new PathParameterSpec("partNo", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploaderUploadsPartsUpdateResponse>() {});
    }

    private record PathParameterSpec(String name, String style, boolean explode) {}

    private static String serializePathParameter(Object value, PathParameterSpec spec) {
        if (value == null) {
            return "";
        }
        String style = spec.style() == null || spec.style().isBlank() ? "simple" : spec.style();
        if (value instanceof Iterable<?> iterable) {
            return serializePathArray(spec.name(), iterable, style, spec.explode());
        }
        if (value instanceof Map<?, ?> map) {
            return serializePathObject(spec.name(), map, style, spec.explode());
        }
        return pathPrimitivePrefix(spec.name(), style) + pathEncode(String.valueOf(value));
    }

    private static String serializePathArray(String name, Iterable<?> values, String style, boolean explode) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(pathEncode(String.valueOf(item)));
            }
        }
        if (serialized.isEmpty()) {
            return pathPrefix(name, style);
        }
        if ("matrix".equals(style)) {
            if (explode) {
                List<String> parts = new java.util.ArrayList<>();
                for (String item : serialized) {
                    parts.add(";" + name + "=" + item);
                }
                return String.join("", parts);
            }
            return ";" + name + "=" + String.join(",", serialized);
        }
        String separator = explode ? "." : ",";
        return pathPrefix(name, style) + String.join(separator, serialized);
    }

    private static String serializePathObject(String name, Map<?, ?> values, String style, boolean explode) {
        List<String> entries = new java.util.ArrayList<>();
        List<String> exploded = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            String escapedKey = pathEncode(String.valueOf(key));
            String escapedValue = pathEncode(String.valueOf(value));
            if (explode) {
                if ("matrix".equals(style)) {
                    exploded.add(";" + escapedKey + "=" + escapedValue);
                } else {
                    exploded.add(escapedKey + "=" + escapedValue);
                }
            } else {
                entries.add(escapedKey);
                entries.add(escapedValue);
            }
        });
        if ("matrix".equals(style)) {
            if (explode) {
                return String.join("", exploded);
            }
            return ";" + name + "=" + String.join(",", entries);
        }
        if (explode) {
            String separator = "label".equals(style) ? "." : ",";
            return pathPrefix(name, style) + String.join(separator, exploded);
        }
        return pathPrefix(name, style) + String.join(",", entries);
    }

    private static String pathPrefix(String name, String style) {
        if ("label".equals(style)) {
            return ".";
        }
        if ("matrix".equals(style)) {
            return ";" + name;
        }
        return "";
    }

    private static String pathPrimitivePrefix(String name, String style) {
        if ("matrix".equals(style)) {
            return ";" + name + "=";
        }
        return pathPrefix(name, style);
    }

    private static String pathEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }

    private record QueryParameterSpec(String name, Object value, String style, boolean explode, boolean allowReserved, String contentType) {}

    private static String buildQueryString(List<QueryParameterSpec> parameters) throws Exception {
        List<String> pairs = new java.util.ArrayList<>();
        for (QueryParameterSpec parameter : parameters) {
            appendSerializedParameter(pairs, parameter);
        }
        return String.join("&", pairs);
    }

    private static void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) throws Exception {
        if (parameter.value() == null) {
            return;
        }
        if (parameter.contentType() != null && !parameter.contentType().isBlank()) {
            String json = clientObjectMapper().writeValueAsString(parameter.value());
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(json, parameter.allowReserved()));
            return;
        }

        String style = parameter.style() == null || parameter.style().isBlank() ? "form" : parameter.style();
        Object value = parameter.value();
        if ("deepObject".equals(style) && value instanceof Map<?, ?> map) {
            appendDeepObjectParameter(pairs, parameter.name(), map, parameter.allowReserved());
        } else if (value instanceof Iterable<?> iterable) {
            appendArrayParameter(pairs, parameter.name(), iterable, style, parameter.explode(), parameter.allowReserved());
        } else if (value instanceof Map<?, ?> map) {
            appendObjectParameter(pairs, parameter.name(), map, style, parameter.explode(), parameter.allowReserved());
        } else {
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(String.valueOf(value), parameter.allowReserved()));
        }
    }

    private static void appendArrayParameter(List<String> pairs, String name, Iterable<?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(String.valueOf(item));
            }
        }
        if (serialized.isEmpty()) {
            return;
        }
        if ("form".equals(style) && explode) {
            for (String item : serialized) {
                pairs.add(urlEncode(name) + "=" + encodeQueryValue(item, allowReserved));
            }
            return;
        }
        pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
    }

    private static void appendObjectParameter(List<String> pairs, String name, Map<?, ?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            if ("form".equals(style) && explode) {
                pairs.add(urlEncode(String.valueOf(key)) + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            } else {
                serialized.add(String.valueOf(key));
                serialized.add(String.valueOf(value));
            }
        });
        if (!serialized.isEmpty()) {
            pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
        }
    }

    private static void appendDeepObjectParameter(List<String> pairs, String name, Map<?, ?> values, boolean allowReserved) {
        values.forEach((key, value) -> {
            if (value != null) {
                pairs.add(urlEncode(name + "[" + key + "]") + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            }
        });
    }

    private static String encodeQueryValue(String value, boolean allowReserved) {
        String encoded = urlEncode(value);
        if (!allowReserved) {
            return encoded;
        }
        return encoded
            .replace("%3A", ":").replace("%2F", "/").replace("%3F", "?").replace("%23", "#")
            .replace("%5B", "[").replace("%5D", "]").replace("%40", "@").replace("%21", "!")
            .replace("%24", "$").replace("%26", "&").replace("%27", "'").replace("%28", "(")
            .replace("%29", ")").replace("%2A", "*").replace("%2B", "+").replace("%2C", ",")
            .replace("%3B", ";").replace("%3D", "=");
    }

    private static com.fasterxml.jackson.databind.ObjectMapper clientObjectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }


    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
