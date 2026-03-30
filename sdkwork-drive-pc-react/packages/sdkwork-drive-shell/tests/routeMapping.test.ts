import { describe, expect, it } from 'vitest';
import {
  buildDriveUrl,
  resolveDrivePathFromLocation,
} from '../src/application/router/routeMapping.ts';

describe('routeMapping', () => {
  it('maps browser routes to drive paths', () => {
    expect(resolveDrivePathFromLocation('/drive', '')).toBe('/');
    expect(resolveDrivePathFromLocation('/drive', '?path=%2FDesign%2FBrand')).toBe('/Design/Brand');
    expect(resolveDrivePathFromLocation('/drive/starred', '')).toBe('virtual://starred');
    expect(resolveDrivePathFromLocation('/drive/recent', '')).toBe('virtual://recent');
    expect(resolveDrivePathFromLocation('/drive/trash', '')).toBe('virtual://trash');
  });

  it('builds browser urls from drive paths', () => {
    expect(buildDriveUrl('/')).toBe('/drive');
    expect(buildDriveUrl('/Design/Brand')).toBe('/drive?path=%2FDesign%2FBrand');
    expect(buildDriveUrl('virtual://starred')).toBe('/drive/starred');
  });
});
