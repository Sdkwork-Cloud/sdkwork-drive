use std::sync::Arc;

use crate::api::paths::app_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{ArchiveEntryListResponse, ChangeListResponse, ClaimShareLinkResponse, CommentListResponse, CommentRepliesDeleteResponse, CommentReplyListResponse, CommentsDeleteResponse, CompleteUploadSessionRequest, CopyNodeRequest, CreateCommentReplyRequest, CreateCommentRequest, CreateDownloadGrantRequest, CreateDownloadPackageRequest, CreateDownloadUrlRequest, CreateDownloadUrlResponse, CreateFileRequest, CreateFileResponse, CreateFolderRequest, CreatePermissionRequest, CreateShareLinkRequest, CreateShareLinkResponse, CreateSpaceRequest, CreateUploadSessionRequest, DeleteNodeResponse, DeleteSpaceResponse, DeleteVersionResponse, DownloadPackageResponse, DriveComment, DriveCommentReply, DriveNode, DrivePermission, DriveShareLink, DriveSpace, DriveUploadSession, EffectivePermissionListResponse, EmptyTrashRequest, EmptyTrashResponse, ExtractArchiveEntriesRequest, ExtractArchiveEntriesResponse, FavoriteNodeRequest, FavoriteNodeResponse, FileVersion, ListSpacesResponse, MarkUploaderPartUploadedRequest, MoveNodeRequest, NodeCapabilitiesResponse, NodeCommandRequest, NodeListResponse, NodePathResponse, PermissionListResponse, PermissionsDeleteResponse, PrepareUploaderUploadRequest, PrepareUploaderUploadResponse, PresignUploadPartRequest, PresignedUploadPart, ProblemDetail, QuotaSummary, ShareLinkListResponse, ShareLinksRevokeResponse, StartPageTokenResponse, UpdateCommentReplyRequest, UpdateCommentRequest, UpdateNodeRequest, UpdatePermissionRequest, UpdateShareLinkRequest, UpdateSpaceRequest, UploadSessionMutationResponse, UploaderUploadPart, VersionListResponse};

#[derive(Clone)]
pub struct DriveApi {
    client: Arc<SdkworkHttpClient>,
}

impl DriveApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    pub async fn changes_list(&self, space_id: &str, cursor: Option<i64>, page_size: Option<i64>, page_token: Option<&str>) -> Result<ChangeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/changes".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn changes_start_page_token_get(&self, space_id: &str) -> Result<StartPageTokenResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/changes/start_page_token".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn download_tokens_resolve(&self, token: &str) -> Result<ProblemDetail, SdkworkError> {
        let path = app_path(&format!("/drive/download_tokens/{}", serialize_path_parameter(token, PathParameterSpec::new("token", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn download_urls_create(&self, body: &CreateDownloadUrlRequest) -> Result<CreateDownloadUrlResponse, SdkworkError> {
        let path = app_path(&"/drive/download_urls".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn favorites_list(&self, space_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/favorites".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn quotas_summary(&self) -> Result<QuotaSummary, SdkworkError> {
        let path = app_path(&"/drive/quotas/summary".to_string());
        self.client.get(&path, None, None).await
    }

    pub async fn nodes_update(&self, node_id: &str, body: &UpdateNodeRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn nodes_get(&self, node_id: &str) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn nodes_delete(&self, node_id: &str) -> Result<DeleteNodeResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn nodes_capabilities_get(&self, node_id: &str) -> Result<NodeCapabilitiesResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/capabilities", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn comments_list(&self, node_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<CommentListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/comments", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn comments_create(&self, node_id: &str, body: &CreateCommentRequest) -> Result<DriveComment, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn comments_get(&self, node_id: &str, comment_id: &str) -> Result<DriveComment, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn comments_update(&self, node_id: &str, comment_id: &str, body: &UpdateCommentRequest) -> Result<DriveComment, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn comments_delete(&self, node_id: &str, comment_id: &str) -> Result<CommentsDeleteResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn comment_replies_list(&self, node_id: &str, comment_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<CommentReplyListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/comments/{}/replies", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn comment_replies_create(&self, node_id: &str, comment_id: &str, body: &CreateCommentReplyRequest) -> Result<DriveCommentReply, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}/replies", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn comment_replies_get(&self, node_id: &str, comment_id: &str, reply_id: &str) -> Result<DriveCommentReply, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}/replies/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false)), serialize_path_parameter(reply_id, PathParameterSpec::new("replyId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn comment_replies_update(&self, node_id: &str, comment_id: &str, reply_id: &str, body: &UpdateCommentReplyRequest) -> Result<DriveCommentReply, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}/replies/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false)), serialize_path_parameter(reply_id, PathParameterSpec::new("replyId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn comment_replies_delete(&self, node_id: &str, comment_id: &str, reply_id: &str) -> Result<CommentRepliesDeleteResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/comments/{}/replies/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(comment_id, PathParameterSpec::new("commentId", "simple", false)), serialize_path_parameter(reply_id, PathParameterSpec::new("replyId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn nodes_copy(&self, node_id: &str, body: &CopyNodeRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/copy", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn nodes_download_urls_create(&self, node_id: &str, requested_ttl_seconds: Option<i64>) -> Result<CreateDownloadUrlResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("requestedTtlSeconds", requested_ttl_seconds, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/download_url", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn download_grants_create(&self, node_id: &str, body: &CreateDownloadGrantRequest) -> Result<CreateDownloadUrlResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/download_grants", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn favorites_set(&self, node_id: &str, body: &FavoriteNodeRequest) -> Result<FavoriteNodeResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/favorite", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn favorites_delete(&self, node_id: &str) -> Result<FavoriteNodeResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/favorite", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn nodes_move(&self, node_id: &str, body: &MoveNodeRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/move", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn nodes_path_get(&self, node_id: &str) -> Result<NodePathResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/path", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn permissions_list(&self, node_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<PermissionListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/permissions", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn permissions_create(&self, node_id: &str, body: &CreatePermissionRequest) -> Result<DrivePermission, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/permissions", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn permissions_delete(&self, node_id: &str, permission_id: &str) -> Result<PermissionsDeleteResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/permissions/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(permission_id, PathParameterSpec::new("permissionId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn permissions_update(&self, node_id: &str, permission_id: &str, body: &UpdatePermissionRequest) -> Result<DrivePermission, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/permissions/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(permission_id, PathParameterSpec::new("permissionId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn permissions_get(&self, node_id: &str, permission_id: &str) -> Result<DrivePermission, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/permissions/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(permission_id, PathParameterSpec::new("permissionId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn permissions_effective_list(&self, node_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<EffectivePermissionListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/permissions/effective", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn share_links_create(&self, node_id: &str, body: &CreateShareLinkRequest) -> Result<CreateShareLinkResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/share_links", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn share_links_list(&self, node_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<ShareLinkListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/share_links", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn trash_move(&self, node_id: &str, body: &NodeCommandRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/trash", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn versions_list(&self, node_id: &str, page_size: Option<i64>, page_token: Option<&str>) -> Result<VersionListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/nodes/{}/versions", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn versions_delete(&self, node_id: &str, version_id: &str) -> Result<DeleteVersionResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/versions/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(version_id, PathParameterSpec::new("versionId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn versions_get(&self, node_id: &str, version_id: &str) -> Result<FileVersion, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/versions/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(version_id, PathParameterSpec::new("versionId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn versions_restore(&self, node_id: &str, version_id: &str, body: &NodeCommandRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/versions/{}/restore", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false)), serialize_path_parameter(version_id, PathParameterSpec::new("versionId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn nodes_files_create(&self, body: &CreateFileRequest) -> Result<CreateFileResponse, SdkworkError> {
        let path = app_path(&"/drive/nodes/files".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn nodes_folders_create(&self, body: &CreateFolderRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&"/drive/nodes/folders".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn recent_list(&self, space_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/recent".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn search_query(&self, q: Option<&str>, space_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/search".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn share_links_claim(&self, token: &str) -> Result<ClaimShareLinkResponse, SdkworkError> {
        let path = app_path(&format!("/drive/share_links/{}/claim", serialize_path_parameter(token, PathParameterSpec::new("token", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    pub async fn share_links_revoke(&self, share_link_id: &str) -> Result<ShareLinksRevokeResponse, SdkworkError> {
        let path = app_path(&format!("/drive/share_links/{}", serialize_path_parameter(share_link_id, PathParameterSpec::new("shareLinkId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn share_links_update(&self, share_link_id: &str, body: &UpdateShareLinkRequest) -> Result<DriveShareLink, SdkworkError> {
        let path = app_path(&format!("/drive/share_links/{}", serialize_path_parameter(share_link_id, PathParameterSpec::new("shareLinkId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn share_links_get(&self, share_link_id: &str) -> Result<DriveShareLink, SdkworkError> {
        let path = app_path(&format!("/drive/share_links/{}", serialize_path_parameter(share_link_id, PathParameterSpec::new("shareLinkId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn shared_with_me_list(&self, space_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/shared_with_me".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn spaces_list(&self, owner_subject_type: Option<&str>, owner_subject_id: Option<&str>) -> Result<ListSpacesResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("ownerSubjectType", owner_subject_type, "form", true, false, None),
            QueryParameterSpec::new("ownerSubjectId", owner_subject_id, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/spaces".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn spaces_create(&self, body: &CreateSpaceRequest) -> Result<DriveSpace, SdkworkError> {
        let path = app_path(&"/drive/spaces".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn spaces_get(&self, space_id: &str) -> Result<DriveSpace, SdkworkError> {
        let path = app_path(&format!("/drive/spaces/{}", serialize_path_parameter(space_id, PathParameterSpec::new("spaceId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn spaces_update(&self, space_id: &str, body: &UpdateSpaceRequest) -> Result<DriveSpace, SdkworkError> {
        let path = app_path(&format!("/drive/spaces/{}", serialize_path_parameter(space_id, PathParameterSpec::new("spaceId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn spaces_delete(&self, space_id: &str) -> Result<DeleteSpaceResponse, SdkworkError> {
        let path = app_path(&format!("/drive/spaces/{}", serialize_path_parameter(space_id, PathParameterSpec::new("spaceId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    pub async fn nodes_list(&self, space_id: &str, parent_node_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("parentNodeId", parent_node_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&format!("/drive/spaces/{}/nodes", serialize_path_parameter(space_id, PathParameterSpec::new("spaceId", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn trash_list(&self, space_id: Option<&str>, page_size: Option<i64>, page_token: Option<&str>, parent_node_id: Option<&str>) -> Result<NodeListResponse, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("spaceId", space_id, "form", true, false, None),
            QueryParameterSpec::new("pageSize", page_size, "form", true, false, None),
            QueryParameterSpec::new("pageToken", page_token, "form", true, false, None),
            QueryParameterSpec::new("parentNodeId", parent_node_id, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/drive/trash".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    pub async fn trash_restore(&self, node_id: &str, body: &NodeCommandRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&format!("/drive/trash/{}/restore", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn trash_empty(&self, body: &EmptyTrashRequest) -> Result<EmptyTrashResponse, SdkworkError> {
        let path = app_path(&"/drive/trash/empty".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn upload_sessions_create(&self, body: &CreateUploadSessionRequest) -> Result<DriveUploadSession, SdkworkError> {
        let path = app_path(&"/drive/upload_sessions".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn upload_sessions_get(&self, upload_session_id: &str) -> Result<UploadSessionMutationResponse, SdkworkError> {
        let path = app_path(&format!("/drive/upload_sessions/{}", serialize_path_parameter(upload_session_id, PathParameterSpec::new("uploadSessionId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn upload_sessions_abort(&self, upload_session_id: &str, body: &NodeCommandRequest) -> Result<UploadSessionMutationResponse, SdkworkError> {
        let path = app_path(&format!("/drive/upload_sessions/{}/abort", serialize_path_parameter(upload_session_id, PathParameterSpec::new("uploadSessionId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn upload_sessions_complete(&self, upload_session_id: &str, body: &CompleteUploadSessionRequest) -> Result<UploadSessionMutationResponse, SdkworkError> {
        let path = app_path(&format!("/drive/upload_sessions/{}/complete", serialize_path_parameter(upload_session_id, PathParameterSpec::new("uploadSessionId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn upload_sessions_parts_presign(&self, upload_session_id: &str, part_no: i64, body: &PresignUploadPartRequest) -> Result<PresignedUploadPart, SdkworkError> {
        let path = app_path(&format!("/drive/upload_sessions/{}/parts/{}", serialize_path_parameter(upload_session_id, PathParameterSpec::new("uploadSessionId", "simple", false)), serialize_path_parameter(part_no, PathParameterSpec::new("partNo", "simple", false))));
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn download_packages_create(&self, body: &CreateDownloadPackageRequest) -> Result<DownloadPackageResponse, SdkworkError> {
        let path = app_path(&"/drive/download_packages".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn download_packages_urls_get(&self, package_id: &str) -> Result<DownloadPackageResponse, SdkworkError> {
        let path = app_path(&format!("/drive/download_packages/{}/download_url", serialize_path_parameter(package_id, PathParameterSpec::new("packageId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn archive_entries_list(&self, node_id: &str) -> Result<ArchiveEntryListResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/archive_entries", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    pub async fn archive_entries_extract(&self, node_id: &str, body: &ExtractArchiveEntriesRequest) -> Result<ExtractArchiveEntriesResponse, SdkworkError> {
        let path = app_path(&format!("/drive/nodes/{}/archive_entries/extract", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn uploader_uploads_prepare(&self, body: &PrepareUploaderUploadRequest) -> Result<PrepareUploaderUploadResponse, SdkworkError> {
        let path = app_path(&"/drive/uploader/uploads".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    pub async fn uploader_uploads_parts_mark_uploaded(&self, upload_item_id: &str, part_no: i64, body: &MarkUploaderPartUploadedRequest) -> Result<UploaderUploadPart, SdkworkError> {
        let path = app_path(&format!("/drive/uploader/uploads/{}/parts/{}", serialize_path_parameter(upload_item_id, PathParameterSpec::new("uploadItemId", "simple", false)), serialize_path_parameter(part_no, PathParameterSpec::new("partNo", "simple", false))));
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}


struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() { "form" } else { parameter.style };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        serde_json::Value::Object(values) if style == "deepObject" => append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved),
        serde_json::Value::Object(values) => append_object_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        value => pairs.push(format!("{}={}", percent_encode(parameter.name), encode_query_value(&primitive_to_string(value), parameter.allow_reserved))),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values.iter().filter(|value| !value.is_null()).map(primitive_to_string).collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&item, allow_reserved)));
        }
        return;
    }
    pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!("{}={}", percent_encode(key), encode_query_value(&primitive_to_string(value), allow_reserved)));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!("{}={}", percent_encode(&format!("{}[{}]", name, key)), encode_query_value(&primitive_to_string(value), allow_reserved)));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"), ("%2F", "/"), ("%3F", "?"), ("%23", "#"),
        ("%5B", "["), ("%5D", "]"), ("%40", "@"), ("%21", "!"),
        ("%24", "$"), ("%26", "&"), ("%27", "'"), ("%28", "("),
        ("%29", ")"), ("%2A", "*"), ("%2B", "+"), ("%2C", ","),
        ("%3B", ";"), ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
