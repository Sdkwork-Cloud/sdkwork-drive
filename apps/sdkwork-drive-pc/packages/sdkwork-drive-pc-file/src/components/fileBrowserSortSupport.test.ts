import { describe, expect, it } from 'vitest';
import { supportsServerSideFileBrowserSort } from './fileBrowserSortSupport';

describe('supportsServerSideFileBrowserSort', () => {
  it('uses server sort for primary folder browsing and recent/trash views', () => {
    expect(supportsServerSideFileBrowserSort('my-storage', '', 'folder-1')).toBe(true);
    expect(supportsServerSideFileBrowserSort('recent', '', null)).toBe(true);
    expect(supportsServerSideFileBrowserSort('trash', '', null)).toBe(true);
  });

  it('falls back to client sort for search, computers, and starred/shared roots', () => {
    expect(supportsServerSideFileBrowserSort('my-storage', 'report', null)).toBe(false);
    expect(supportsServerSideFileBrowserSort('computers', '', null)).toBe(false);
    expect(supportsServerSideFileBrowserSort('starred', '', null)).toBe(false);
    expect(supportsServerSideFileBrowserSort('shared', '', null)).toBe(false);
  });
});
