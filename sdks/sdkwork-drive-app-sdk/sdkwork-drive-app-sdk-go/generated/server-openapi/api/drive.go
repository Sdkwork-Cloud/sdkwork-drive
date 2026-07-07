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

func (a *DriveApi) ChangesList(spaceId string, cursor *int, pageSize *int) (sdktypes.ChangesListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: spaceId, Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/changes"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ChangesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ChangesListResponse](raw)
}

func (a *DriveApi) ChangesStartPageTokenRetrieve(spaceId string) (sdktypes.ChangesStartPageTokenRetrieveResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: spaceId, Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/changes/start_page_token"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ChangesStartPageTokenRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.ChangesStartPageTokenRetrieveResponse](raw)
}

func (a *DriveApi) DownloadTokensRetrieve(token string) (sdktypes.DownloadTokensRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/download_tokens/%s", SerializePathParameter(token, PathParameterSpec{Name: "token", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DownloadTokensRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.DownloadTokensRetrieveResponse](raw)
}

func (a *DriveApi) DownloadUrlsCreate(body sdktypes.CreateDownloadUrlRequest) (sdktypes.DownloadUrlsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/download_urls"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DownloadUrlsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.DownloadUrlsCreateResponse201](raw)
}

func (a *DriveApi) FavoritesList(spaceId *string, pageSize *int, cursor *string, sortBy *string, sortOrder *string) (sdktypes.FavoritesListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortBy", Value: func() interface{} { if sortBy == nil { return nil }; return *sortBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortOrder", Value: func() interface{} { if sortOrder == nil { return nil }; return *sortOrder }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/favorites"), query), nil, nil)
    if err != nil {
        var zero sdktypes.FavoritesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.FavoritesListResponse](raw)
}

func (a *DriveApi) FavoritesCheck(body sdktypes.CheckFavoriteNodesRequest) (sdktypes.SdkWorkApiResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/favorites/check"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdkWorkApiResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdkWorkApiResponse](raw)
}

func (a *DriveApi) QuotasRetrieve() (sdktypes.QuotasRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath("/drive/quotas/summary"), nil, nil)
    if err != nil {
        var zero sdktypes.QuotasRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.QuotasRetrieveResponse](raw)
}

func (a *DriveApi) NodesUpdate(nodeId string, body sdktypes.UpdateNodeRequest) (sdktypes.NodesUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesUpdateResponse](raw)
}

func (a *DriveApi) NodesRetrieve(nodeId string) (sdktypes.NodesRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.NodesRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesRetrieveResponse](raw)
}

func (a *DriveApi) NodesDelete(nodeId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) NodesCapabilitiesList(nodeId string) (sdktypes.NodesCapabilitiesListResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/capabilities", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.NodesCapabilitiesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesCapabilitiesListResponse](raw)
}

func (a *DriveApi) CommentsList(nodeId string, pageSize *int, cursor *string) (sdktypes.CommentsListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CommentsListResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentsListResponse](raw)
}

func (a *DriveApi) CommentsCreate(nodeId string, body sdktypes.CreateCommentRequest) (sdktypes.CommentsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CommentsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.CommentsCreateResponse201](raw)
}

func (a *DriveApi) CommentsRetrieve(nodeId string, commentId string) (sdktypes.CommentsRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CommentsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentsRetrieveResponse](raw)
}

func (a *DriveApi) CommentsUpdate(nodeId string, commentId string, body sdktypes.UpdateCommentRequest) (sdktypes.CommentsUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CommentsUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentsUpdateResponse](raw)
}

func (a *DriveApi) CommentsDelete(nodeId string, commentId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) CommentRepliesList(nodeId string, commentId string, pageSize *int, cursor *string) (sdktypes.CommentRepliesListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CommentRepliesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentRepliesListResponse](raw)
}

func (a *DriveApi) CommentRepliesCreate(nodeId string, commentId string, body sdktypes.CreateCommentReplyRequest) (sdktypes.CommentRepliesCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CommentRepliesCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.CommentRepliesCreateResponse201](raw)
}

func (a *DriveApi) CommentRepliesRetrieve(nodeId string, commentId string, replyId string) (sdktypes.CommentRepliesRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CommentRepliesRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentRepliesRetrieveResponse](raw)
}

func (a *DriveApi) CommentRepliesUpdate(nodeId string, commentId string, replyId string, body sdktypes.UpdateCommentReplyRequest) (sdktypes.CommentRepliesUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.CommentRepliesUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.CommentRepliesUpdateResponse](raw)
}

func (a *DriveApi) CommentRepliesDelete(nodeId string, commentId string, replyId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/comments/%s/replies/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(commentId, PathParameterSpec{Name: "commentId", Style: "simple", Explode: false}), SerializePathParameter(replyId, PathParameterSpec{Name: "replyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) NodesCopy(nodeId string, body sdktypes.CopyNodeRequest) (sdktypes.NodesCopyResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/copy", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesCopyResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesCopyResponse](raw)
}

func (a *DriveApi) NodesDownloadUrlsRetrieve(nodeId string, requestedTtlSeconds *int) (sdktypes.NodesDownloadUrlsRetrieveResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "requestedTtlSeconds", Value: func() interface{} { if requestedTtlSeconds == nil { return nil }; return *requestedTtlSeconds }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/download_url", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodesDownloadUrlsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesDownloadUrlsRetrieveResponse](raw)
}

func (a *DriveApi) DownloadGrantsCreate(nodeId string, body *sdktypes.CreateDownloadGrantRequest) (sdktypes.DownloadGrantsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/download_grants", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DownloadGrantsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.DownloadGrantsCreateResponse201](raw)
}

func (a *DriveApi) FavoritesUpdate(nodeId string, body sdktypes.FavoriteNodeRequest) (sdktypes.FavoritesUpdateResponse, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/nodes/%s/favorite", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.FavoritesUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.FavoritesUpdateResponse](raw)
}

func (a *DriveApi) FavoritesDelete(nodeId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/favorite", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) NodesMove(nodeId string, body sdktypes.MoveNodeRequest) (sdktypes.NodesMoveResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/move", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesMoveResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesMoveResponse](raw)
}

func (a *DriveApi) NodesPathRetrieve(nodeId string) (sdktypes.NodesPathRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/path", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.NodesPathRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesPathRetrieveResponse](raw)
}

func (a *DriveApi) PermissionsList(nodeId string, pageSize *int, cursor *string) (sdktypes.PermissionsListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.PermissionsListResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsListResponse](raw)
}

func (a *DriveApi) PermissionsCreate(nodeId string, body sdktypes.CreatePermissionRequest) (sdktypes.PermissionsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.PermissionsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsCreateResponse201](raw)
}

func (a *DriveApi) PermissionsDelete(nodeId string, permissionId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) PermissionsUpdate(nodeId string, permissionId string, body sdktypes.UpdatePermissionRequest) (sdktypes.PermissionsUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.PermissionsUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsUpdateResponse](raw)
}

func (a *DriveApi) PermissionsRetrieve(nodeId string, permissionId string) (sdktypes.PermissionsRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(permissionId, PathParameterSpec{Name: "permissionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.PermissionsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsRetrieveResponse](raw)
}

func (a *DriveApi) PermissionsEffectiveList(nodeId string, pageSize *int, cursor *string) (sdktypes.PermissionsEffectiveListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/permissions/effective", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.PermissionsEffectiveListResponse
        return zero, err
    }
    return decodeResult[sdktypes.PermissionsEffectiveListResponse](raw)
}

func (a *DriveApi) ShareLinksCreate(nodeId string, body sdktypes.CreateShareLinkRequest) (sdktypes.ShareLinksCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/share_links", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ShareLinksCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksCreateResponse201](raw)
}

func (a *DriveApi) ShareLinksList(nodeId string, pageSize *int, cursor *string) (sdktypes.ShareLinksListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/share_links", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.ShareLinksListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksListResponse](raw)
}

func (a *DriveApi) TrashCreate(nodeId string, body sdktypes.NodeCommandRequest) (sdktypes.TrashCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/trash", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.TrashCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.TrashCreateResponse201](raw)
}

func (a *DriveApi) VersionsList(nodeId string, pageSize *int, cursor *string) (sdktypes.VersionsListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.VersionsListResponse
        return zero, err
    }
    return decodeResult[sdktypes.VersionsListResponse](raw)
}

func (a *DriveApi) VersionsDelete(nodeId string, versionId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) VersionsRetrieve(nodeId string, versionId string) (sdktypes.VersionsRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.VersionsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.VersionsRetrieveResponse](raw)
}

func (a *DriveApi) VersionsRestore(nodeId string, versionId string, body sdktypes.NodeCommandRequest) (sdktypes.VersionsRestoreResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/versions/%s/restore", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.VersionsRestoreResponse
        return zero, err
    }
    return decodeResult[sdktypes.VersionsRestoreResponse](raw)
}

func (a *DriveApi) NodesFilesCreate(body sdktypes.CreateFileRequest) (sdktypes.NodesFilesCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/files"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesFilesCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.NodesFilesCreateResponse201](raw)
}

func (a *DriveApi) NodesFoldersCreate(body sdktypes.CreateFolderRequest) (sdktypes.NodesFoldersCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/folders"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesFoldersCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.NodesFoldersCreateResponse201](raw)
}

func (a *DriveApi) RecentList(spaceId *string, pageSize *int, cursor *string, sortBy *string, sortOrder *string) (sdktypes.RecentListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortBy", Value: func() interface{} { if sortBy == nil { return nil }; return *sortBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortOrder", Value: func() interface{} { if sortOrder == nil { return nil }; return *sortOrder }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/recent"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RecentListResponse
        return zero, err
    }
    return decodeResult[sdktypes.RecentListResponse](raw)
}

func (a *DriveApi) SearchList(q *string, spaceId *string, pageSize *int, cursor *string) (sdktypes.SearchListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/search"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SearchListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SearchListResponse](raw)
}

func (a *DriveApi) ShareLinksClaim(token string) (sdktypes.ShareLinksClaimResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/share_links/%s/claim", SerializePathParameter(token, PathParameterSpec{Name: "token", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShareLinksClaimResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksClaimResponse](raw)
}

func (a *DriveApi) ShareLinksDelete(shareLinkId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) ShareLinksUpdate(shareLinkId string, body sdktypes.UpdateShareLinkRequest) (sdktypes.ShareLinksUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ShareLinksUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksUpdateResponse](raw)
}

func (a *DriveApi) ShareLinksRetrieve(shareLinkId string) (sdktypes.ShareLinksRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/share_links/%s", SerializePathParameter(shareLinkId, PathParameterSpec{Name: "shareLinkId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ShareLinksRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.ShareLinksRetrieveResponse](raw)
}

func (a *DriveApi) SharedWithMeList(spaceId *string, pageSize *int, cursor *string, sortBy *string, sortOrder *string) (sdktypes.SharedWithMeListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortBy", Value: func() interface{} { if sortBy == nil { return nil }; return *sortBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortOrder", Value: func() interface{} { if sortOrder == nil { return nil }; return *sortOrder }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/shared_with_me"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SharedWithMeListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SharedWithMeListResponse](raw)
}

func (a *DriveApi) SpacesList(ownerSubjectType *string, ownerSubjectId *string, spaceType *string, pageSize *int, cursor *string) (sdktypes.SpacesListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "ownerSubjectType", Value: func() interface{} { if ownerSubjectType == nil { return nil }; return *ownerSubjectType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ownerSubjectId", Value: func() interface{} { if ownerSubjectId == nil { return nil }; return *ownerSubjectId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "spaceType", Value: func() interface{} { if spaceType == nil { return nil }; return *spaceType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/spaces"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SpacesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.SpacesListResponse](raw)
}

func (a *DriveApi) SpacesCreate(body sdktypes.CreateSpaceRequest) (sdktypes.SpacesCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/spaces"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SpacesCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.SpacesCreateResponse201](raw)
}

func (a *DriveApi) MoveDestinationsList(spaceId string, excludeNodeIds *string, pageSize *int, cursor *string) (sdktypes.MoveDestinationsListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "excludeNodeIds", Value: func() interface{} { if excludeNodeIds == nil { return nil }; return *excludeNodeIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/spaces/%s/move_destinations", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.MoveDestinationsListResponse
        return zero, err
    }
    return decodeResult[sdktypes.MoveDestinationsListResponse](raw)
}

func (a *DriveApi) SpacesRetrieve(spaceId string) (sdktypes.SpacesRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SpacesRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.SpacesRetrieveResponse](raw)
}

func (a *DriveApi) SpacesUpdate(spaceId string, body sdktypes.UpdateSpaceRequest) (sdktypes.SpacesUpdateResponse, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SpacesUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.SpacesUpdateResponse](raw)
}

func (a *DriveApi) SpacesDelete(spaceId string) (struct{}, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/drive/spaces/%s", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero struct{}
        return zero, err
    }
    return decodeResult[struct{}](raw)
}

func (a *DriveApi) NodesList(spaceId string, parentNodeId *string, pageSize *int, cursor *string, sortBy *string, sortOrder *string) (sdktypes.NodesListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "parentNodeId", Value: func() interface{} { if parentNodeId == nil { return nil }; return *parentNodeId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortBy", Value: func() interface{} { if sortBy == nil { return nil }; return *sortBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortOrder", Value: func() interface{} { if sortOrder == nil { return nil }; return *sortOrder }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath(fmt.Sprintf("/drive/spaces/%s/nodes", SerializePathParameter(spaceId, PathParameterSpec{Name: "spaceId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.NodesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.NodesListResponse](raw)
}

func (a *DriveApi) TrashList(spaceId *string, pageSize *int, cursor *string, parentNodeId *string, sortBy *string, sortOrder *string) (sdktypes.TrashListResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "parentNodeId", Value: func() interface{} { if parentNodeId == nil { return nil }; return *parentNodeId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortBy", Value: func() interface{} { if sortBy == nil { return nil }; return *sortBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "sortOrder", Value: func() interface{} { if sortOrder == nil { return nil }; return *sortOrder }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AppApiPath("/drive/trash"), query), nil, nil)
    if err != nil {
        var zero sdktypes.TrashListResponse
        return zero, err
    }
    return decodeResult[sdktypes.TrashListResponse](raw)
}

func (a *DriveApi) TrashRestore(nodeId string, body sdktypes.NodeCommandRequest) (sdktypes.TrashRestoreResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/trash/%s/restore", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.TrashRestoreResponse
        return zero, err
    }
    return decodeResult[sdktypes.TrashRestoreResponse](raw)
}

func (a *DriveApi) TrashEmpty(body sdktypes.EmptyTrashRequest) (sdktypes.TrashEmptyResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/trash/empty"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.TrashEmptyResponse
        return zero, err
    }
    return decodeResult[sdktypes.TrashEmptyResponse](raw)
}

func (a *DriveApi) UploadSessionsCreate(body sdktypes.CreateUploadSessionRequest) (sdktypes.UploadSessionsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/upload_sessions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionsCreateResponse201](raw)
}

func (a *DriveApi) UploadSessionsRetrieve(uploadSessionId string) (sdktypes.UploadSessionsRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.UploadSessionsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionsRetrieveResponse](raw)
}

func (a *DriveApi) UploadSessionsAbort(uploadSessionId string, body sdktypes.NodeCommandRequest) (sdktypes.UploadSessionsAbortResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/abort", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionsAbortResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionsAbortResponse](raw)
}

func (a *DriveApi) UploadSessionsComplete(uploadSessionId string, body sdktypes.CompleteUploadSessionRequest) (sdktypes.UploadSessionsCompleteResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/complete", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionsCompleteResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionsCompleteResponse](raw)
}

func (a *DriveApi) UploadSessionsPartsUpdate(uploadSessionId string, partNo int, body sdktypes.PresignUploadPartRequest) (sdktypes.UploadSessionsPartsUpdateResponse, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/upload_sessions/%s/parts/%s", SerializePathParameter(uploadSessionId, PathParameterSpec{Name: "uploadSessionId", Style: "simple", Explode: false}), SerializePathParameter(partNo, PathParameterSpec{Name: "partNo", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploadSessionsPartsUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploadSessionsPartsUpdateResponse](raw)
}

func (a *DriveApi) DownloadPackagesCreate(body sdktypes.CreateDownloadPackageRequest) (sdktypes.DownloadPackagesCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/download_packages"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DownloadPackagesCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.DownloadPackagesCreateResponse201](raw)
}

func (a *DriveApi) DownloadPackagesUrlsRetrieve(packageId string) (sdktypes.DownloadPackagesUrlsRetrieveResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/download_packages/%s/download_url", SerializePathParameter(packageId, PathParameterSpec{Name: "packageId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DownloadPackagesUrlsRetrieveResponse
        return zero, err
    }
    return decodeResult[sdktypes.DownloadPackagesUrlsRetrieveResponse](raw)
}

func (a *DriveApi) ArchiveEntriesList(nodeId string) (sdktypes.ArchiveEntriesListResponse, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/drive/nodes/%s/archive_entries", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ArchiveEntriesListResponse
        return zero, err
    }
    return decodeResult[sdktypes.ArchiveEntriesListResponse](raw)
}

func (a *DriveApi) ArchiveEntriesExtract(nodeId string, body sdktypes.ExtractArchiveEntriesRequest) (sdktypes.ArchiveEntriesExtractResponse, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/drive/nodes/%s/archive_entries/extract", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ArchiveEntriesExtractResponse
        return zero, err
    }
    return decodeResult[sdktypes.ArchiveEntriesExtractResponse](raw)
}

func (a *DriveApi) UploaderUploadsCreate(body sdktypes.PrepareUploaderUploadRequest) (sdktypes.UploaderUploadsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/uploader/uploads"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploaderUploadsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.UploaderUploadsCreateResponse201](raw)
}

func (a *DriveApi) UploaderUploadsPartsUpdate(uploadItemId string, partNo int, body sdktypes.MarkUploaderPartUploadedRequest) (sdktypes.UploaderUploadsPartsUpdateResponse, error) {
    raw, err := a.client.Put(AppApiPath(fmt.Sprintf("/drive/uploader/uploads/%s/parts/%s", SerializePathParameter(uploadItemId, PathParameterSpec{Name: "uploadItemId", Style: "simple", Explode: false}), SerializePathParameter(partNo, PathParameterSpec{Name: "partNo", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.UploaderUploadsPartsUpdateResponse
        return zero, err
    }
    return decodeResult[sdktypes.UploaderUploadsPartsUpdateResponse](raw)
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
