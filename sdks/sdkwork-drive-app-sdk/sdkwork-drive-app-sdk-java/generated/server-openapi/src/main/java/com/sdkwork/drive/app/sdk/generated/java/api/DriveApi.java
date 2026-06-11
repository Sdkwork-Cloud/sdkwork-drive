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

    public ChangeListResponse changesList(String tenantId, String spaceId, Integer cursor, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/changes"), query));
        return client.convertValue(raw, new TypeReference<ChangeListResponse>() {});
    }

    public StartPageTokenResponse changesStartPageTokenGet(String tenantId, String spaceId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/changes/start_page_token"), query));
        return client.convertValue(raw, new TypeReference<StartPageTokenResponse>() {});
    }

    public ProblemDetail downloadTokensResolve(String token, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/download_tokens/" + serializePathParameter(token, new PathParameterSpec("token", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<ProblemDetail>() {});
    }

    public CreateDownloadUrlResponse downloadUrlsCreate(CreateDownloadUrlRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/download_urls"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CreateDownloadUrlResponse>() {});
    }

    public NodeListResponse favoritesList(String tenantId, String subjectType, String subjectId, String spaceId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("subjectType", subjectType, "form", true, false, null),
            new QueryParameterSpec("subjectId", subjectId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/favorites"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public QuotaSummary quotasSummary(String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/quotas/summary"), query));
        return client.convertValue(raw, new TypeReference<QuotaSummary>() {});
    }

    public DriveNode nodesUpdate(String nodeId, UpdateNodeRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public DriveNode nodesGet(String nodeId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public DeleteNodeResponse nodesDelete(String nodeId, String tenantId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DeleteNodeResponse>() {});
    }

    public NodeCapabilitiesResponse nodesCapabilitiesGet(String nodeId, String tenantId, String subjectType, String subjectId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("subjectType", subjectType, "form", true, false, null),
            new QueryParameterSpec("subjectId", subjectId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/capabilities"), query));
        return client.convertValue(raw, new TypeReference<NodeCapabilitiesResponse>() {});
    }

    public CommentListResponse commentsList(String nodeId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments"), query));
        return client.convertValue(raw, new TypeReference<CommentListResponse>() {});
    }

    public DriveComment commentsCreate(String nodeId, CreateCommentRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveComment>() {});
    }

    public DriveComment commentsGet(String nodeId, String commentId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DriveComment>() {});
    }

    public DriveComment commentsUpdate(String nodeId, String commentId, UpdateCommentRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveComment>() {});
    }

    public CommentsDeleteResponse commentsDelete(String nodeId, String commentId, String tenantId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<CommentsDeleteResponse>() {});
    }

    public CommentReplyListResponse commentRepliesList(String nodeId, String commentId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies"), query));
        return client.convertValue(raw, new TypeReference<CommentReplyListResponse>() {});
    }

    public DriveCommentReply commentRepliesCreate(String nodeId, String commentId, CreateCommentReplyRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveCommentReply>() {});
    }

    public DriveCommentReply commentRepliesGet(String nodeId, String commentId, String replyId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DriveCommentReply>() {});
    }

    public DriveCommentReply commentRepliesUpdate(String nodeId, String commentId, String replyId, UpdateCommentReplyRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveCommentReply>() {});
    }

    public CommentRepliesDeleteResponse commentRepliesDelete(String nodeId, String commentId, String replyId, String tenantId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/comments/" + serializePathParameter(commentId, new PathParameterSpec("commentId", "simple", false)) + "/replies/" + serializePathParameter(replyId, new PathParameterSpec("replyId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<CommentRepliesDeleteResponse>() {});
    }

    public DriveNode nodesCopy(String nodeId, CopyNodeRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/copy"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public CreateDownloadUrlResponse nodesDownloadUrlsCreate(String nodeId, String tenantId, Integer requestedTtlSeconds) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("requestedTtlSeconds", requestedTtlSeconds, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/download_url"), query));
        return client.convertValue(raw, new TypeReference<CreateDownloadUrlResponse>() {});
    }

    public FavoriteNodeResponse favoritesSet(String nodeId, FavoriteNodeRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/favorite"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<FavoriteNodeResponse>() {});
    }

    public FavoriteNodeResponse favoritesDelete(String nodeId, String tenantId, String subjectType, String subjectId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("subjectType", subjectType, "form", true, false, null),
            new QueryParameterSpec("subjectId", subjectId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/favorite"), query));
        return client.convertValue(raw, new TypeReference<FavoriteNodeResponse>() {});
    }

    public DriveNode nodesMove(String nodeId, MoveNodeRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/move"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public NodePathResponse nodesPathGet(String nodeId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/path"), query));
        return client.convertValue(raw, new TypeReference<NodePathResponse>() {});
    }

    public PermissionListResponse permissionsList(String nodeId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions"), query));
        return client.convertValue(raw, new TypeReference<PermissionListResponse>() {});
    }

    public DrivePermission permissionsCreate(String nodeId, CreatePermissionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DrivePermission>() {});
    }

    public PermissionsDeleteResponse permissionsDelete(String nodeId, String permissionId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<PermissionsDeleteResponse>() {});
    }

    public DrivePermission permissionsUpdate(String nodeId, String permissionId, UpdatePermissionRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DrivePermission>() {});
    }

    public DrivePermission permissionsGet(String nodeId, String permissionId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/" + serializePathParameter(permissionId, new PathParameterSpec("permissionId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DrivePermission>() {});
    }

    public EffectivePermissionListResponse permissionsEffectiveList(String nodeId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/permissions/effective"), query));
        return client.convertValue(raw, new TypeReference<EffectivePermissionListResponse>() {});
    }

    public DriveShareLink shareLinksCreate(String nodeId, CreateShareLinkRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/share_links"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveShareLink>() {});
    }

    public ShareLinkListResponse shareLinksList(String nodeId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/share_links"), query));
        return client.convertValue(raw, new TypeReference<ShareLinkListResponse>() {});
    }

    public DriveNode trashMove(String nodeId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/trash"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public VersionListResponse versionsList(String nodeId, String tenantId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions"), query));
        return client.convertValue(raw, new TypeReference<VersionListResponse>() {});
    }

    public DeleteVersionResponse versionsDelete(String nodeId, String versionId, String tenantId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DeleteVersionResponse>() {});
    }

    public FileVersion versionsGet(String nodeId, String versionId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<FileVersion>() {});
    }

    public DriveNode versionsRestore(String nodeId, String versionId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + "/restore"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public CreateFileResponse nodesFilesCreate(CreateFileRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/files"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<CreateFileResponse>() {});
    }

    public DriveNode nodesFoldersCreate(CreateFolderRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/folders"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public NodeListResponse recentList(String tenantId, String spaceId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/recent"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public NodeListResponse searchQuery(String tenantId, String q, String spaceId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/search"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public ShareLinksRevokeResponse shareLinksRevoke(String shareLinkId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<ShareLinksRevokeResponse>() {});
    }

    public DriveShareLink shareLinksUpdate(String shareLinkId, UpdateShareLinkRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveShareLink>() {});
    }

    public DriveShareLink shareLinksGet(String shareLinkId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/share_links/" + serializePathParameter(shareLinkId, new PathParameterSpec("shareLinkId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DriveShareLink>() {});
    }

    public NodeListResponse sharedWithMeList(String tenantId, String subjectType, String subjectId, String spaceId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("subjectType", subjectType, "form", true, false, null),
            new QueryParameterSpec("subjectId", subjectId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/shared_with_me"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public ListSpacesResponse spacesList(String tenantId, String ownerSubjectType, String ownerSubjectId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("ownerSubjectType", ownerSubjectType, "form", true, false, null),
            new QueryParameterSpec("ownerSubjectId", ownerSubjectId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces"), query));
        return client.convertValue(raw, new TypeReference<ListSpacesResponse>() {});
    }

    public DriveSpace spacesCreate(CreateSpaceRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/spaces"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveSpace>() {});
    }

    public DriveSpace spacesGet(String spaceId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DriveSpace>() {});
    }

    public DriveSpace spacesUpdate(String spaceId, UpdateSpaceRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveSpace>() {});
    }

    public DeleteSpaceResponse spacesDelete(String spaceId, String tenantId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<DeleteSpaceResponse>() {});
    }

    public NodeListResponse nodesList(String spaceId, String tenantId, String parentNodeId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("parentNodeId", parentNodeId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/spaces/" + serializePathParameter(spaceId, new PathParameterSpec("spaceId", "simple", false)) + "/nodes"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public NodeListResponse trashList(String tenantId, String spaceId, Integer pageSize, String pageToken) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null),
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/trash"), query));
        return client.convertValue(raw, new TypeReference<NodeListResponse>() {});
    }

    public DriveNode trashRestore(String nodeId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/trash/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/restore"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNode>() {});
    }

    public EmptyTrashResponse trashEmpty(EmptyTrashRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/trash/empty"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<EmptyTrashResponse>() {});
    }

    public DriveUploadSession uploadSessionsCreate(CreateUploadSessionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveUploadSession>() {});
    }

    public UploadSessionMutationResponse uploadSessionsGet(String uploadSessionId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<UploadSessionMutationResponse>() {});
    }

    public UploadSessionMutationResponse uploadSessionsAbort(String uploadSessionId, NodeCommandRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/abort"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionMutationResponse>() {});
    }

    public UploadSessionMutationResponse uploadSessionsComplete(String uploadSessionId, CompleteUploadSessionRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/complete"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploadSessionMutationResponse>() {});
    }

    public PresignedUploadPart uploadSessionsPartsPresign(String uploadSessionId, Integer partNo, PresignUploadPartRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/upload_sessions/" + serializePathParameter(uploadSessionId, new PathParameterSpec("uploadSessionId", "simple", false)) + "/parts/" + serializePathParameter(partNo, new PathParameterSpec("partNo", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<PresignedUploadPart>() {});
    }

    public DownloadPackageResponse downloadPackagesCreate(CreateDownloadPackageRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/download_packages"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DownloadPackageResponse>() {});
    }

    public DownloadPackageResponse downloadPackagesUrlsGet(String packageId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/download_packages/" + serializePathParameter(packageId, new PathParameterSpec("packageId", "simple", false)) + "/download_url"), query));
        return client.convertValue(raw, new TypeReference<DownloadPackageResponse>() {});
    }

    public ArchiveEntryListResponse archiveEntriesList(String nodeId, String tenantId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("tenantId", tenantId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/archive_entries"), query));
        return client.convertValue(raw, new TypeReference<ArchiveEntryListResponse>() {});
    }

    public ExtractArchiveEntriesResponse archiveEntriesExtract(String nodeId, ExtractArchiveEntriesRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/archive_entries/extract"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ExtractArchiveEntriesResponse>() {});
    }

    public PrepareUploaderUploadResponse uploaderUploadsPrepare(PrepareUploaderUploadRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/uploader/uploads"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<PrepareUploaderUploadResponse>() {});
    }

    public UploaderUploadPart uploaderUploadsPartsMarkUploaded(String uploadItemId, Integer partNo, MarkUploaderPartUploadedRequest body) throws Exception {
        Object raw = client.put(ApiPaths.appPath("/drive/uploader/uploads/" + serializePathParameter(uploadItemId, new PathParameterSpec("uploadItemId", "simple", false)) + "/parts/" + serializePathParameter(partNo, new PathParameterSpec("partNo", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<UploaderUploadPart>() {});
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
