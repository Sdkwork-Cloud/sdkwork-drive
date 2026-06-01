use sdkwork_drive_product::domain::space::DriveSpaceType;

#[test]
fn space_type_supports_special_spaces() {
    assert_eq!(DriveSpaceType::KnowledgeBase.as_str(), "knowledge_base");
    assert_eq!(DriveSpaceType::AiGenerated.as_str(), "ai_generated");
    assert_eq!(DriveSpaceType::AppUpload.as_str(), "app_upload");
}
