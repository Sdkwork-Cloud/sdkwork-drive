package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "sdkwork-drive-backend-sdk-generated-go/types"
    sdkhttp "sdkwork-drive-backend-sdk-generated-go/http"
)

type DriveApi struct {
    client *sdkhttp.Client
}

func NewDriveApi(client *sdkhttp.Client) *DriveApi {
    return &DriveApi{client: client}
}

func (a *DriveApi) AuditEventsList(tenantId *string, action *string, resourceType *string, resourceId *string, requestId *string, traceId *string, page *int, pageSize *int) (sdktypes.AuditEventPage, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "tenantId", Value: func() interface{} { if tenantId == nil { return nil }; return *tenantId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "action", Value: func() interface{} { if action == nil { return nil }; return *action }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "resourceType", Value: func() interface{} { if resourceType == nil { return nil }; return *resourceType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "resourceId", Value: func() interface{} { if resourceId == nil { return nil }; return *resourceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "requestId", Value: func() interface{} { if requestId == nil { return nil }; return *requestId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "traceId", Value: func() interface{} { if traceId == nil { return nil }; return *traceId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/audit_events"), query), nil, nil)
    if err != nil {
        var zero sdktypes.AuditEventPage
        return zero, err
    }
    return decodeResult[sdktypes.AuditEventPage](raw)
}

func (a *DriveApi) MaintenanceJobsList(jobType *string, status *string, operatorId *string, page *int, pageSize *int) (sdktypes.MaintenanceJobPage, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "jobType", Value: func() interface{} { if jobType == nil { return nil }; return *jobType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "operatorId", Value: func() interface{} { if operatorId == nil { return nil }; return *operatorId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/maintenance/jobs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.MaintenanceJobPage
        return zero, err
    }
    return decodeResult[sdktypes.MaintenanceJobPage](raw)
}

func (a *DriveApi) MaintenanceObjectSweepStart(body sdktypes.SweepObjectStoreRequest) (sdktypes.SweepResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/drive/maintenance/object_sweep"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SweepResponse
        return zero, err
    }
    return decodeResult[sdktypes.SweepResponse](raw)
}

func (a *DriveApi) MaintenanceUploadSessionSweepStart(body sdktypes.SweepUploadSessionsRequest) (sdktypes.SweepResponse, error) {
    raw, err := a.client.Post(BackendApiPath("/drive/maintenance/upload_session_sweep"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SweepResponse
        return zero, err
    }
    return decodeResult[sdktypes.SweepResponse](raw)
}

func (a *DriveApi) QuotasSummary(tenantId string) (sdktypes.QuotaSummary, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "tenantId", Value: tenantId, Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/quotas"), query), nil, nil)
    if err != nil {
        var zero sdktypes.QuotaSummary
        return zero, err
    }
    return decodeResult[sdktypes.QuotaSummary](raw)
}

func (a *DriveApi) SpacesAdminList(tenantId string, ownerSubjectType *string, ownerSubjectId *string) (sdktypes.ListSpacesResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "tenantId", Value: tenantId, Style: "form", Explode: true, AllowReserved: false},
        {Name: "ownerSubjectType", Value: func() interface{} { if ownerSubjectType == nil { return nil }; return *ownerSubjectType }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ownerSubjectId", Value: func() interface{} { if ownerSubjectId == nil { return nil }; return *ownerSubjectId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/spaces"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ListSpacesResponse
        return zero, err
    }
    return decodeResult[sdktypes.ListSpacesResponse](raw)
}

func (a *DriveApi) StorageProviderBindingsDefaultGet(tenantId string, spaceId *string) (sdktypes.StorageProviderBinding, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "tenantId", Value: tenantId, Style: "form", Explode: true, AllowReserved: false},
        {Name: "spaceId", Value: func() interface{} { if spaceId == nil { return nil }; return *spaceId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/storage_provider_bindings/default"), query), nil, nil)
    if err != nil {
        var zero sdktypes.StorageProviderBinding
        return zero, err
    }
    return decodeResult[sdktypes.StorageProviderBinding](raw)
}

func (a *DriveApi) StorageProviderBindingsDefaultSet(body sdktypes.SetDefaultStorageProviderBindingRequest) (sdktypes.StorageProviderBinding, error) {
    raw, err := a.client.Put(BackendApiPath("/drive/storage_provider_bindings/default"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProviderBinding
        return zero, err
    }
    return decodeResult[sdktypes.StorageProviderBinding](raw)
}

func (a *DriveApi) StorageProvidersList(status *string) (sdktypes.ListStorageProvidersResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/storage_providers"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ListStorageProvidersResponse
        return zero, err
    }
    return decodeResult[sdktypes.ListStorageProvidersResponse](raw)
}

func (a *DriveApi) StorageProvidersCreate(body sdktypes.CreateStorageProviderRequest) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Post(BackendApiPath("/drive/storage_providers"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersUpdate(providerId string, body sdktypes.UpdateStorageProviderRequest) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersDelete(providerId string, operatorId string) (sdktypes.DeleteStorageProviderResponse, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "operatorId", Value: operatorId, Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Delete(AppendQueryString(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteStorageProviderResponse
        return zero, err
    }
    return decodeResult[sdktypes.DeleteStorageProviderResponse](raw)
}

func (a *DriveApi) StorageProvidersGet(providerId string) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersActivate(providerId string, body sdktypes.OperatorRequest) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/activate", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersCapabilitiesGet(providerId string) (sdktypes.StorageProviderCapabilities, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/capabilities", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.StorageProviderCapabilities
        return zero, err
    }
    return decodeResult[sdktypes.StorageProviderCapabilities](raw)
}

func (a *DriveApi) StorageProvidersCredentialsRotate(providerId string, body sdktypes.RotateStorageProviderCredentialRequest) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/credentials/rotate", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersDeactivate(providerId string, body sdktypes.OperatorRequest) (sdktypes.StorageProvider, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/deactivate", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.StorageProvider
        return zero, err
    }
    return decodeResult[sdktypes.StorageProvider](raw)
}

func (a *DriveApi) StorageProvidersTest(providerId string, body sdktypes.TestStorageProviderRequest) (sdktypes.TestStorageProviderResponse, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/test", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.TestStorageProviderResponse
        return zero, err
    }
    return decodeResult[sdktypes.TestStorageProviderResponse](raw)
}

func (a *DriveApi) StorageProvidersBucketHead(providerId string) (sdktypes.ProviderBucket, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/bucket", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderBucket
        return zero, err
    }
    return decodeResult[sdktypes.ProviderBucket](raw)
}

func (a *DriveApi) StorageProvidersBucketCreate(providerId string) (sdktypes.ProviderBucketMutation, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/bucket", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ProviderBucketMutation
        return zero, err
    }
    return decodeResult[sdktypes.ProviderBucketMutation](raw)
}

func (a *DriveApi) StorageProvidersBucketDelete(providerId string) (sdktypes.ProviderBucketMutation, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/bucket", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderBucketMutation
        return zero, err
    }
    return decodeResult[sdktypes.ProviderBucketMutation](raw)
}

func (a *DriveApi) StorageProvidersObjectsList(providerId string, prefix *string, delimiter *string, pageToken *string, pageSize *int) (sdktypes.ProviderObjectList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "prefix", Value: func() interface{} { if prefix == nil { return nil }; return *prefix }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "delimiter", Value: func() interface{} { if delimiter == nil { return nil }; return *delimiter }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageToken", Value: func() interface{} { if pageToken == nil { return nil }; return *pageToken }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/objects", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderObjectList
        return zero, err
    }
    return decodeResult[sdktypes.ProviderObjectList](raw)
}

func (a *DriveApi) StorageProvidersObjectsHead(providerId string, objectKey string) (sdktypes.ProviderObject, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/objects/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}), SerializePathParameter(objectKey, PathParameterSpec{Name: "objectKey", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderObject
        return zero, err
    }
    return decodeResult[sdktypes.ProviderObject](raw)
}

func (a *DriveApi) StorageProvidersObjectsDelete(providerId string, objectKey string) (sdktypes.ProviderObjectMutation, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/objects/%s", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}), SerializePathParameter(objectKey, PathParameterSpec{Name: "objectKey", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderObjectMutation
        return zero, err
    }
    return decodeResult[sdktypes.ProviderObjectMutation](raw)
}

func (a *DriveApi) StorageProvidersObjectsCopy(providerId string, body sdktypes.CopyProviderObjectRequest) (sdktypes.ProviderObjectMutation, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/drive/storage_providers/%s/objects/copy", SerializePathParameter(providerId, PathParameterSpec{Name: "providerId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ProviderObjectMutation
        return zero, err
    }
    return decodeResult[sdktypes.ProviderObjectMutation](raw)
}

func (a *DriveApi) DownloadPackagesList(tenantId *string, state *string, page *int, pageSize *int) (sdktypes.DownloadPackagePage, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "tenantId", Value: func() interface{} { if tenantId == nil { return nil }; return *tenantId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "state", Value: func() interface{} { if state == nil { return nil }; return *state }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "pageSize", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/drive/download_packages"), query), nil, nil)
    if err != nil {
        var zero sdktypes.DownloadPackagePage
        return zero, err
    }
    return decodeResult[sdktypes.DownloadPackagePage](raw)
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
