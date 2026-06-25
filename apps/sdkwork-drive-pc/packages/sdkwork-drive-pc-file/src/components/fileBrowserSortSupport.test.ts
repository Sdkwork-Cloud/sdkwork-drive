import { describe, expect, it } from 'vitest';
import { supportsServerSideFileBrowserSort } from './fileBrowserSortSupport';

describe('supportsServerSideFileBrowserSort', () => {
  it('uses server sort for primary folder browsing', () => {
    expect(supportsServerSideFileBrowserSort('my-storage', '', 'folder-1')).toBe(true);
  });

  it('falls back to client sort for search and virtual sections', () => {
    expect(supportsServerSideFileBrowserSort('my-storage', 'report', null)).toBe(false);
    expect(supportsServerSideFileBrowserSort('recent', '', null)).toBe(false);
    expect(supportsServerSideFileBrowserSort('computers', '', null)).toBe(false);
  });
});
