#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DriveSpaceType {
    Personal,
    Team,
    KnowledgeBase,
    AiGenerated,
    AppUpload,
}

impl DriveSpaceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Personal => "personal",
            Self::Team => "team",
            Self::KnowledgeBase => "knowledge_base",
            Self::AiGenerated => "ai_generated",
            Self::AppUpload => "app_upload",
        }
    }

    pub fn try_from_str(raw: &str) -> Option<Self> {
        match raw {
            "personal" => Some(Self::Personal),
            "team" => Some(Self::Team),
            "knowledge_base" => Some(Self::KnowledgeBase),
            "ai_generated" => Some(Self::AiGenerated),
            "app_upload" => Some(Self::AppUpload),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveSpace {
    pub id: String,
    pub tenant_id: String,
    pub owner_subject_type: String,
    pub owner_subject_id: String,
    pub display_name: String,
    pub space_type: DriveSpaceType,
    pub lifecycle_status: String,
    pub version: i64,
}
