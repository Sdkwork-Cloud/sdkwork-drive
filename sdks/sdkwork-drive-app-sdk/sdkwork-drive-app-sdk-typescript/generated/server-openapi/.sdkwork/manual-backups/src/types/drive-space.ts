export interface DriveSpace {
  id: string;
  tenantId: string;
  ownerSubjectType: string;
  ownerSubjectId: string;
  displayName: string;
  spaceType: 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'app' | 'app_upload';
  lifecycleStatus: string;
  version: string;
}


