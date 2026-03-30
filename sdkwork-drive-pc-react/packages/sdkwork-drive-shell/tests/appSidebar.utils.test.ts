import { describe, expect, it } from 'vitest';
import {
  APP_SIDEBAR_NAV_ITEMS,
  resolveSidebarToggleLabelKey,
} from '../src/components/appSidebar.utils.ts';

describe('app sidebar utilities', () => {
  it('keeps the expected shell navigation structure', () => {
    expect(APP_SIDEBAR_NAV_ITEMS.map((item) => item.to)).toEqual([
      '/drive',
      '/drive/starred',
      '/drive/recent',
      '/drive/trash',
      '/settings',
    ]);

    expect(APP_SIDEBAR_NAV_ITEMS.map((item) => item.labelKey)).toEqual([
      'sidebar.drive',
      'sidebar.starred',
      'sidebar.recent',
      'sidebar.trash',
      'sidebar.settings',
    ]);
  });

  it('resolves the correct sidebar toggle label key for collapsed state', () => {
    expect(resolveSidebarToggleLabelKey(true)).toBe('sidebar.expand');
    expect(resolveSidebarToggleLabelKey(false)).toBe('sidebar.collapse');
  });
});
