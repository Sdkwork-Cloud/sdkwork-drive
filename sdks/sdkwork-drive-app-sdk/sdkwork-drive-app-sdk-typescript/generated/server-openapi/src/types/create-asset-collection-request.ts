export interface CreateAssetCollectionRequest {
  organizationId?: string;
  title: string;
  description?: string;
  collectionType?: 'manual' | 'smart' | 'system';
  visibility?: 'private' | 'organization' | 'public';
}
