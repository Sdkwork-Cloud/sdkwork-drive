export interface DriveNode {
  id: string;
  tenantId: string;
  spaceId: string;
  parentNodeId?: string;
  nodeType: 'file' | 'folder' | 'shortcut' | 'virtual_reference';
  nodeName: string;
  lifecycleStatus: 'active' | 'trashed' | 'deleted';
  version: string;
  /** Target node id when nodeType is shortcut. */
  shortcutTargetNodeId?: string | null;
  /** Drive uploader usage context identifier. Optional semantic context for idempotency, ownership, and cleanup scoping. */
  scene?: string;
  /** Drive uploader usage context identifier. Optional semantic context for idempotency, ownership, and cleanup scoping. */
  source?: string;
}


