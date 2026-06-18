import { describe, expect, it } from 'vitest';
import {
  drivePathToSection,
  driveSectionToPath,
  resolveDriveSectionPath,
} from '../src/routing/driveSectionRoutes';

describe('drive section routes', () => {
  it('maps built-in sections to stable paths', () => {
    expect(driveSectionToPath('my-storage')).toBe('/my-storage');
    expect(driveSectionToPath('recent')).toBe('/recent');
    expect(driveSectionToPath('admin-storage-providers')).toBe('/admin/storage-providers');
  });

  it('maps dynamic space sections to /spaces/:id paths', () => {
    expect(driveSectionToPath('space-kb-engineering')).toBe('/spaces/space-kb-engineering');
    expect(driveSectionToPath('space with spaces')).toBe('/spaces/space%20with%20spaces');
  });

  it('resolves paths back to section ids', () => {
    expect(drivePathToSection('/recent')).toBe('recent');
    expect(drivePathToSection('/admin/storage-bindings')).toBe('admin-storage-bindings');
    expect(drivePathToSection('/spaces/space-kb-engineering')).toBe('space-kb-engineering');
    expect(drivePathToSection('/')).toBe('my-storage');
  });

  it('normalizes unknown paths to the default section path', () => {
    expect(resolveDriveSectionPath('/unknown')).toBe('/my-storage');
  });
});
