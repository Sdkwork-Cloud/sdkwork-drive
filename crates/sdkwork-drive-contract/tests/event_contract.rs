use serde_json::Value;

const ASYNC_API: &str = include_str!("../../../apis/events/drive/drive-events.asyncapi.json");

#[test]
fn drive_async_api_declares_version_committed_contract_without_provider_secrets() {
    let document: Value = serde_json::from_str(ASYNC_API).expect("AsyncAPI must be valid JSON");
    assert_eq!(document["asyncapi"], "3.0.0");
    assert_eq!(
        document["channels"]["nodeVersionCommitted"]["address"],
        "drive.node.version.committed.v1"
    );
    let data = &document["components"]["schemas"]["DriveNodeVersionCommittedV1Data"];
    let required = data["required"]
        .as_array()
        .expect("event data required fields")
        .iter()
        .filter_map(Value::as_str)
        .collect::<Vec<_>>();
    for field in [
        "driveVersionId",
        "versionNo",
        "spaceRelativePath",
        "rootScopes",
    ] {
        assert!(required.contains(&field), "missing required field {field}");
    }
    let source = ASYNC_API.to_ascii_lowercase();
    for forbidden in ["objectkey", "bucketname", "presignedurl", "credential"] {
        assert!(
            !source.contains(forbidden),
            "AsyncAPI must not expose provider field {forbidden}"
        );
    }
}
