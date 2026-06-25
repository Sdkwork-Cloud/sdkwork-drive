package com.sdkwork.drive.admin.storage.sdk.generated.java.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.drive.admin.storage.sdk.generated.java.http.HttpClient;
import com.sdkwork.drive.admin.storage.sdk.generated.java.model.*;
import java.util.List;
import java.util.Map;

public class DriveApi {
    private final HttpClient client;

    public DriveApi(HttpClient client) {
        this.client = client;
    }

    public StorageProviderBinding storageProviderBindingsDefaultGet(String spaceId, String spaceType) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("spaceType", spaceType, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/bindings/default"), query));
        return client.convertValue(raw, new TypeReference<StorageProviderBinding>() {});
    }

    public StorageProviderBinding storageProviderBindingsDefaultSet(SetDefaultStorageProviderBindingRequest body) throws Exception {
        Object raw = client.put(ApiPaths.customPath("/drive/storage/bindings/default"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProviderBinding>() {});
    }

    /** Delete a Drive default storage provider binding */
    public DeleteStorageProviderBindingResponse storageProviderBindingsDefaultDelete(String operatorId, String spaceId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/bindings/default"), query));
        return client.convertValue(raw, new TypeReference<DeleteStorageProviderBindingResponse>() {});
    }

    public ListStorageProvidersResponse storageProvidersList(String status) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("status", status, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/providers"), query));
        return client.convertValue(raw, new TypeReference<ListStorageProvidersResponse>() {});
    }

    public StorageProvider storageProvidersCreate(CreateStorageProviderRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public StorageProvider storageProvidersUpdate(String providerId, UpdateStorageProviderRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public DeleteStorageProviderResponse storageProvidersDelete(String providerId) throws Exception {
        Object raw = client.delete(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteStorageProviderResponse>() {});
    }

    public StorageProvider storageProvidersGet(String providerId) throws Exception {
        Object raw = client.get(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public StorageProvider storageProvidersActivate(String providerId, OperatorRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/activate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public StorageProviderCapabilities storageProvidersCapabilitiesGet(String providerId) throws Exception {
        Object raw = client.get(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/capabilities"));
        return client.convertValue(raw, new TypeReference<StorageProviderCapabilities>() {});
    }

    public StorageProvider storageProvidersCredentialsRotate(String providerId, RotateStorageProviderCredentialRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/credentials/rotate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public StorageProvider storageProvidersDeactivate(String providerId, OperatorRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/deactivate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<StorageProvider>() {});
    }

    public TestStorageProviderResponse storageProvidersTest(String providerId, TestStorageProviderRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/test"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<TestStorageProviderResponse>() {});
    }

    public ProviderBucket storageProvidersBucketHead(String providerId) throws Exception {
        Object raw = client.get(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/bucket"));
        return client.convertValue(raw, new TypeReference<ProviderBucket>() {});
    }

    public ProviderBucketMutation storageProvidersBucketCreate(String providerId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.put(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/bucket"), query), null);
        return client.convertValue(raw, new TypeReference<ProviderBucketMutation>() {});
    }

    public ProviderBucketMutation storageProvidersBucketDelete(String providerId, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/bucket"), query));
        return client.convertValue(raw, new TypeReference<ProviderBucketMutation>() {});
    }

    public ProviderObjectList storageProvidersObjectsList(String providerId, String prefix, String delimiter, String pageToken, Integer pageSize) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("prefix", prefix, "form", true, false, null),
            new QueryParameterSpec("delimiter", delimiter, "form", true, false, null),
            new QueryParameterSpec("pageToken", pageToken, "form", true, false, null),
            new QueryParameterSpec("pageSize", pageSize, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/objects"), query));
        return client.convertValue(raw, new TypeReference<ProviderObjectList>() {});
    }

    public ProviderObject storageProvidersObjectsHead(String providerId, String objectKey) throws Exception {
        Object raw = client.get(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/objects/" + serializePathParameter(objectKey, new PathParameterSpec("objectKey", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ProviderObject>() {});
    }

    public ProviderObjectMutation storageProvidersObjectsDelete(String providerId, String objectKey, String operatorId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("operatorId", operatorId, "form", true, false, null)
        ));
        Object raw = client.delete(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/objects/" + serializePathParameter(objectKey, new PathParameterSpec("objectKey", "simple", false)) + ""), query));
        return client.convertValue(raw, new TypeReference<ProviderObjectMutation>() {});
    }

    public ProviderObjectMutation storageProvidersObjectsCopy(String providerId, CopyProviderObjectRequest body) throws Exception {
        Object raw = client.post(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/objects/copy"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ProviderObjectMutation>() {});
    }

    /** List buckets visible to a Drive storage provider account */
    public ProviderBucketList storageProvidersBucketsList(String providerId) throws Exception {
        Object raw = client.get(ApiPaths.customPath("/drive/storage/providers/" + serializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false)) + "/buckets"));
        return client.convertValue(raw, new TypeReference<ProviderBucketList>() {});
    }

    /** List Drive storage provider bindings */
    public StorageProviderBindingListResponse storageProviderBindingsList(String spaceId, String providerId, String lifecycleStatus) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("spaceId", spaceId, "form", true, false, null),
            new QueryParameterSpec("providerId", providerId, "form", true, false, null),
            new QueryParameterSpec("lifecycleStatus", lifecycleStatus, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.customPath("/drive/storage/bindings"), query));
        return client.convertValue(raw, new TypeReference<StorageProviderBindingListResponse>() {});
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
