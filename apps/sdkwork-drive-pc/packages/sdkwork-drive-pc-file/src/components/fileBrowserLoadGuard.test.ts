import { describe, expect, it } from 'vitest';
import { createLatestRequestGuard } from './fileBrowserLoadGuard';

describe('FileBrowser latest request guard', () => {
  it('allows only the most recent Drive backend request to commit UI state', () => {
    const guard = createLatestRequestGuard();

    const firstRequest = guard.begin();
    const secondRequest = guard.begin();

    expect(guard.isCurrent(firstRequest)).toBe(false);
    expect(guard.isCurrent(secondRequest)).toBe(true);
  });

  it('rejects stale Drive view refreshes after the user navigates elsewhere', () => {
    const guard = createLatestRequestGuard();

    guard.setCurrentScope('my-storage/root');
    const rootRequest = guard.begin('my-storage/root');
    guard.setCurrentScope('my-storage/folder-a');

    expect(guard.isCurrentScope('my-storage/root')).toBe(false);
    expect(guard.isCurrent(rootRequest, 'my-storage/root')).toBe(false);
  });
});
