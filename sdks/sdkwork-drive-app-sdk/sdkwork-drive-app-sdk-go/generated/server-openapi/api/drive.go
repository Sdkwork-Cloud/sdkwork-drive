package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "sdkwork-drive-app-sdk-generated-go/types"
    sdkhttp "sdkwork-drive-app-sdk-generated-go/http"
)

type DriveApi struct {
    client *sdkhttp.Client
}

func NewDriveApi(client *sdkhttp.Client) *DriveApi {
    return &DriveApi{client: client}
}

func (a *DriveApi) ChangesList(spaceId string, cursor *int, pageSize *int, pageToken *string) (sdktypes.ChangeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: spaceId, Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/changes"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ChangeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ChangeListResponse](raw)
}

func (a *DriveApi) ChangesStartPageTokenGet(spaceId string) (sdktypes.StartPageTokenResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: spaceId, Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/changes/start_page_token"), query), nil, nil)
    if err != nil {
        var zero sdktypes.StartPageTokenResponse
        return zero, err
    }
    return decodeResult[sdktypes.StartPageTokenResponse](raw)
}

func (a *DriveApi) DownloadTokensResolve(token string) (sdktypes.ProblemDetail, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/download_tokens/%s", SerializePathParameter(token, PathParameterSpec{Name: "token", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProblemDetail
        return zero, err
    }
    return decodeResult[sdktypes.ProblemDetail](raw)
}

func (a *DriveApi) DownloadUrlsCreate(body sdktypes.CreateDownloadUrlRequest) (sdktypes.CreateDownloadUrlResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/download_urls"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CreateDownloadUrlResponse
        return zero, err
    }
    return decodeResult[sdktypes.CreateDownloadUrlResponse](raw)
}

func (a *DriveApi) FavoritesList(spaceId *string, pageSize *int, pageToken *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/favorites"), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) QuotasSummary() (sdktypes.QuotaSummary, error) {
    raw, err := a.client.Get(AppApiPath("/drive/quotas/summary"), nil, nil)
    if err != nil {
        var zero sdktypes.QuotaSummary
        return zero, err
    }
    return decodeResult[sdktypes.QuotaSummary](raw)
}

func (a *DriveApi) NodesUpdate(nodeId string, body sdktypes.UpdateNodeRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) NodesGet(nodeId string) (sdktypes.DriveNode, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) NodesDelete(nodeId string) (sdktypes.DeleteNodeResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteNodeResponse
        return zero, err
    }
    return decodeResult[sdktypes.DeleteNodeResponse](raw)
}

func (a *DriveApi) NodesCapabilitiesGet(nodeId string) (sdktypes.NodeCapabilitiesResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/capabilities", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.NodeCapabilitiesResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeCapabilitiesResponse](raw)
}

func (a *DriveApi) CommentsList(nodeId string, pageSize *int, pageToken *string) (sdktypes.CommentListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CommentListResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentListResponse](raw)
}

func (a *DriveApi) CommentsCreate(nodeId string, body sdktypes.CreateCommentRequest) (sdktypes.DriveComment, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveComment
        return zero, err
    }
    return decodeResult[sdktypes.DriveComment](raw)
}

func (a *DriveApi) CommentsGet(nodeId string, commentId string) (sdktypes.DriveComment, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DriveComment
        return zero, err
    }
    return decodeResult[sdktypes.DriveComment](raw)
}

func (a *DriveApi) CommentsUpdate(nodeId string, commentId string, body sdktypes.UpdateCommentRequest) (sdktypes.DriveComment, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveComment
        return zero, err
    }
    return decodeResult[sdktypes.DriveComment](raw)
}

func (a *DriveApi) CommentsDelete(nodeId string, commentId string) (sdktypes.CommentsDeleteResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CommentsDeleteResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentsDeleteResponse](raw)
}

func (a *DriveApi) CommentRepliesList(nodeId string, commentId string, pageSize *int, pageToken *string) (sdktypes.CommentReplyListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CommentReplyListResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentReplyListResponse](raw)
}

func (a *DriveApi) CommentRepliesCreate(nodeId string, commentId string, body sdktypes.CreateCommentReplyRequest) (sdktypes.DriveCommentReply, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveCommentReply
        return zero, err
    }
    return decodeResult[sdktypes.DriveCommentReply](raw)
}

func (a *DriveApi) CommentRepliesGet(nodeId string, commentId string, replyId string) (sdktypes.DriveCommentReply, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DriveCommentReply
        return zero, err
    }
    return decodeResult[sdktypes.DriveCommentReply](raw)
}

func (a *DriveApi) CommentRepliesUpdate(nodeId string, commentId string, replyId string, body sdktypes.UpdateCommentReplyRequest) (sdktypes.DriveCommentReply, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveCommentReply
        return zero, err
    }
    return decodeResult[sdktypes.DriveCommentReply](raw)
}

func (a *DriveApi) CommentRepliesDelete(nodeId string, commentId string, replyId string) (sdktypes.CommentRepliesDeleteResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CommentRepliesDeleteResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentRepliesDeleteResponse](raw)
}

func (a *DriveApi) NodesCopy(nodeId string, body sdktypes.CopyNodeRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/copy", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) NodesDownloadUrlsCreate(nodeId string, requestedTtlSeconds *int) (sdktypes.CreateDownloadUrlResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "requestedTtlSeconds", Value: func() interface{} { if requestedTtlSeconds == nil { return nil }; return *requestedTtlSeconds }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/download_url", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CreateDownloadUrlResponse
        return zero, err
    }
    return decodeResult[sdktypes.CreateDownloadUrlResponse](raw)
}

func (a *DriveApi) DownloadGrantsCreate(nodeId string, body *sdktypes.CreateDownloadGrantRequest) (sdktypes.CreateDownloadUrlResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/download_grants", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CreateDownloadUrlResponse
        return zero, err
    }
    return decodeResult[sdktypes.CreateDownloadUrlResponse](raw)
}

func (a *DriveApi) FavoritesSet(nodeId string, body sdktypes.FavoriteNodeRequest) (sdktypes.FavoriteNodeResponse, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/nodes/%s/favorite", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.FavoriteNodeResponse
        return zero, err
    }
    return decodeResult[sdktypes.FavoriteNodeResponse](raw)
}

func (a *DriveApi) FavoritesDelete(nodeId string) (sdktypes.FavoriteNodeResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/favorite", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.FavoriteNodeResponse
        return zero, err
    }
    return decodeResult[sdktypes.FavoriteNodeResponse](raw)
}

func (a *DriveApi) NodesMove(nodeId string, body sdktypes.MoveNodeRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/move", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) NodesPathGet(nodeId string) (sdktypes.NodePathResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/path", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.NodePathResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodePathResponse](raw)
}

func (a *DriveApi) PermissionsList(nodeId string, pageSize *int, pageToken *string) (sdktypes.PermissionListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.PermissionListResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionListResponse](raw)
}

func (a *DriveApi) PermissionsCreate(nodeId string, body sdktypes.CreatePermissionRequest) (sdktypes.DrivePermission, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DrivePermission
        return zero, err
    }
    return decodeResult[sdktypes.DrivePermission](raw)
}

func (a *DriveApi) PermissionsDelete(nodeId string, permissionId string) (sdktypes.PermissionsDeleteResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.PermissionsDeleteResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsDeleteResponse](raw)
}

func (a *DriveApi) PermissionsUpdate(nodeId string, permissionId string, body sdktypes.UpdatePermissionRequest) (sdktypes.DrivePermission, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DrivePermission
        return zero, err
    }
    return decodeResult[sdktypes.DrivePermission](raw)
}

func (a *DriveApi) PermissionsGet(nodeId string, permissionId string) (sdktypes.DrivePermission, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DrivePermission
        return zero, err
    }
    return decodeResult[sdktypes.DrivePermission](raw)
}

func (a *DriveApi) PermissionsEffectiveList(nodeId string, pageSize *int, pageToken *string) (sdktypes.EffectivePermissionListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/effective", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.EffectivePermissionListResponse
        return zero, err
    }
    return decodeResult[sdktypes.EffectivePermissionListResponse](raw)
}

func (a *DriveApi) ShareLinksCreate(nodeId string, body sdktypes.CreateShareLinkRequest) (sdktypes.CreateShareLinkResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/share_links", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CreateShareLinkResponse
        return zero, err
    }
    return decodeResult[sdktypes.CreateShareLinkResponse](raw)
}

func (a *DriveApi) ShareLinksList(nodeId string, pageSize *int, pageToken *string) (sdktypes.ShareLinkListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/share_links", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.ShareLinkListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinkListResponse](raw)
}

func (a *DriveApi) TrashMove(nodeId string, body sdktypes.NodeCommandRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/trash", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) VersionsList(nodeId string, pageSize *int, pageToken *string) (sdktypes.VersionListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.VersionListResponse
        return zero, err
    }
    return decodeResult[sdktypes.VersionListResponse](raw)
}

func (a *DriveApi) VersionsDelete(nodeId string, versionId string) (sdktypes.DeleteVersionResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteVersionResponse
        return zero, err
    }
    return decodeResult[sdktypes.DeleteVersionResponse](raw)
}

func (a *DriveApi) VersionsGet(nodeId string, versionId string) (sdktypes.FileVersion, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.FileVersion
        return zero, err
    }
    return decodeResult[sdktypes.FileVersion](raw)
}

func (a *DriveApi) VersionsRestore(nodeId string, versionId string, body sdktypes.NodeCommandRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s/restore", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) NodesFilesCreate(body sdktypes.CreateFileRequest) (sdktypes.CreateFileResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/files"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CreateFileResponse
        return zero, err
    }
    return decodeResult[sdktypes.CreateFileResponse](raw)
}

func (a *DriveApi) NodesFoldersCreate(body sdktypes.CreateFolderRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/folders"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) RecentList(spaceId *string, pageSize *int, pageToken *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/recent"), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) SearchQuery(q *string, spaceId *string, pageSize *int, pageToken *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/search"), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) ShareLinksClaim(token string) (sdktypes.ClaimShareLinkResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/share_links/%s/claim", SerializePathParameter(token, PathParameterSpec{Name: "token", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ClaimShareLinkResponse
        return zero, err
    }
    return decodeResult[sdktypes.ClaimShareLinkResponse](raw)
}

func (a *DriveApi) ShareLinksRevoke(shareLinkId string) (sdktypes.ShareLinksRevokeResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ShareLinksRevokeResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksRevokeResponse](raw)
}

func (a *DriveApi) ShareLinksUpdate(shareLinkId string, body sdktypes.UpdateShareLinkRequest) (sdktypes.DriveShareLink, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveShareLink
        return zero, err
    }
    return decodeResult[sdktypes.DriveShareLink](raw)
}

func (a *DriveApi) ShareLinksGet(shareLinkId string) (sdktypes.DriveShareLink, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DriveShareLink
        return zero, err
    }
    return decodeResult[sdktypes.DriveShareLink](raw)
}

func (a *DriveApi) SharedWithMeList(spaceId *string, pageSize *int, pageToken *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/shared_with_me"), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) SpacesList(ownerSubjectType *string, ownerSubjectId *string) (sdktypes.ListSpacesResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "ownerSubjectType", Value: func() interface{} { if ownerSubjectType == nil { return nil }; return *ownerSubjectType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ownerSubjectId", Value: func() interface{} { if ownerSubjectId == nil { return nil }; return *ownerSubjectId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/spaces"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ListSpacesResponse
        return zero, err
    }
    return decodeResult[sdktypes.ListSpacesResponse](raw)
}

func (a *DriveApi) SpacesCreate(body sdktypes.CreateSpaceRequest) (sdktypes.DriveSpace, error) {
    raw, err := a.client.Post(AppApiPath("/drive/spaces"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveSpace
        return zero, err
    }
    return decodeResult[sdktypes.DriveSpace](raw)
}

func (a *DriveApi) SpacesGet(spaceId string) (sdktypes.DriveSpace, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DriveSpace
        return zero, err
    }
    return decodeResult[sdktypes.DriveSpace](raw)
}

func (a *DriveApi) SpacesUpdate(spaceId string, body sdktypes.UpdateSpaceRequest) (sdktypes.DriveSpace, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveSpace
        return zero, err
    }
    return decodeResult[sdktypes.DriveSpace](raw)
}

func (a *DriveApi) SpacesDelete(spaceId string) (sdktypes.DeleteSpaceResponse, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteSpaceResponse
        return zero, err
    }
    return decodeResult[sdktypes.DeleteSpaceResponse](raw)
}

func (a *DriveApi) NodesList(spaceId string, parentNodeId *string, pageSize *int, pageToken *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "parentNodeId", Value: func() interface{} { if parentNodeId == nil { return nil }; return *parentNodeId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/spaces/%s/nodes", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) TrashList(spaceId *string, pageSize *int, pageToken *string, parentNodeId *string) (sdktypes.NodeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "parentNodeId", Value: func() interface{} { if parentNodeId == nil { return nil }; return *parentNodeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/trash"), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodeListResponse](raw)
}

func (a *DriveApi) TrashRestore(nodeId string, body sdktypes.NodeCommandRequest) (sdktypes.DriveNode, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/trash/%s/restore", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNode
        return zero, err
    }
    return decodeResult[sdktypes.DriveNode](raw)
}

func (a *DriveApi) TrashEmpty(body sdktypes.EmptyTrashRequest) (sdktypes.EmptyTrashResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/trash/empty"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.EmptyTrashResponse
        return zero, err
    }
    return decodeResult[sdktypes.EmptyTrashResponse](raw)
}

func (a *DriveApi) UploadSessionsCreate(body sdktypes.CreateUploadSessionRequest) (sdktypes.DriveUploadSession, error) {
    raw, err := a.client.Post(AppApiPath("/drive/upload_sessions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveUploadSession
        return zero, err
    }
    return decodeResult[sdktypes.DriveUploadSession](raw)
}

func (a *DriveApi) UploadSessionsGet(uploadSessionId string) (sdktypes.UploadSessionMutationResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.UploadSessionMutationResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionMutationResponse](raw)
}

func (a *DriveApi) UploadSessionsAbort(uploadSessionId string, body sdktypes.NodeCommandRequest) (sdktypes.UploadSessionMutationResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/abort", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionMutationResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionMutationResponse](raw)
}

func (a *DriveApi) UploadSessionsComplete(uploadSessionId string, body sdktypes.CompleteUploadSessionRequest) (sdktypes.UploadSessionMutationResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/complete", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionMutationResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionMutationResponse](raw)
}

func (a *DriveApi) UploadSessionsPartsPresign(uploadSessionId string, partNo int, body sdktypes.PresignUploadPartRequest) (sdktypes.PresignedUploadPart, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/parts/%s", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}), SerializePathParameter(partNo, PathParameterSpec{Name: "partNo", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.PresignedUploadPart
        return zero, err
    }
    return decodeResult[sdktypes.PresignedUploadPart](raw)
}

func (a *DriveApi) DownloadPackagesCreate(body sdktypes.CreateDownloadPackageRequest) (sdktypes.DownloadPackageResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/download_packages"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DownloadPackageResponse
        return zero, err
    }
    return decodeResult[sdktypes.DownloadPackageResponse](raw)
}

func (a *DriveApi) DownloadPackagesUrlsGet(packageId string) (sdktypes.DownloadPackageResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/download_packages/%s/download_url", SerializePathParameter(packageId, PathParameterSpec{Name: "packageId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DownloadPackageResponse
        return zero, err
    }
    return decodeResult[sdktypes.DownloadPackageResponse](raw)
}

func (a *DriveApi) ArchiveEntriesList(nodeId string) (sdktypes.ArchiveEntryListResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/archive_entries", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ArchiveEntryListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ArchiveEntryListResponse](raw)
}

func (a *DriveApi) ArchiveEntriesExtract(nodeId string, body sdktypes.ExtractArchiveEntriesRequest) (sdktypes.ExtractArchiveEntriesResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/archive_entries/extract", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ExtractArchiveEntriesResponse
        return zero, err
    }
    return decodeResult[sdktypes.ExtractArchiveEntriesResponse](raw)
}

func (a *DriveApi) UploaderUploadsPrepare(body sdktypes.PrepareUploaderUploadRequest) (sdktypes.PrepareUploaderUploadResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/uploader/uploads"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.PrepareUploaderUploadResponse
        return zero, err
    }
    return decodeResult[sdktypes.PrepareUploaderUploadResponse](raw)
}

func (a *DriveApi) UploaderUploadsPartsMarkUploaded(uploadItemId string, partNo int, body sdktypes.MarkUploaderPartUploadedRequest) (sdktypes.UploaderUploadPart, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/uploader/uploads/%s/parts/%s", SerializePathParameter(uploadItemId, PathParameterSpec{Name: "uploadItemId", Style: "simple", Explode: false}), SerializePathParameter(partNo, PathParameterSpec{Name: "partNo", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploaderUploadPart
        return zero, err
    }
    return decodeResult[sdktypes.UploaderUploadPart](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}



func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
