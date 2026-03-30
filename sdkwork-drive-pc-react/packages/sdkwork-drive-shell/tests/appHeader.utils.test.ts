import { describe, expect, it } from 'vitest';
import * as appHeaderUtils from '../src/components/appHeader.utils.ts';

const { buildNextSearch, getSearchValue, shouldFocusDriveSearch } = appHeaderUtils;

describe('appHeader search utilities', () => {
  it('extracts and updates the drive query string safely', () => {
    expect(getSearchValue('?q=roadmap&path=%2FDesign')).toBe('roadmap');
    expect(getSearchValue('?path=%2FDesign')).toBe('');

    expect(buildNextSearch('?path=%2FDesign', 'roadmap')).toBe('?path=%2FDesign&q=roadmap');
    expect(buildNextSearch('?path=%2FDesign&q=roadmap', '   ')).toBe('?path=%2FDesign');
  });

  it('recognizes the global focus-search shortcut', () => {
    expect(
      shouldFocusDriveSearch({
        key: 'k',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
      }),
    ).toBe(true);

    expect(
      shouldFocusDriveSearch({
        key: 'K',
        ctrlKey: false,
        metaKey: true,
        altKey: false,
      }),
    ).toBe(true);

    expect(
      shouldFocusDriveSearch({
        key: 'k',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });

  it('maps workspace routes to the header section label', () => {
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/drive')).toBe(
      'drive.sidebar.myDrive',
    );
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/drive/starred')).toBe(
      'drive.sidebar.starred',
    );
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/drive/recent')).toBe(
      'drive.sidebar.recent',
    );
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/drive/trash')).toBe(
      'drive.sidebar.trash',
    );
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/settings')).toBe(
      'sidebar.settings',
    );
    expect((appHeaderUtils as any).resolveAppHeaderSectionLabelKey('/login')).toBeNull();
  });
});
