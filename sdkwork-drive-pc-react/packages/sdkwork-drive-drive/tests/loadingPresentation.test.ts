import { describe, expect, it } from 'vitest';
import { buildDriveLoadingLayout } from '../src/utils/loadingPresentation.ts';

describe('loading presentation helpers', () => {
  it('returns denser card placeholders for grid mode', () => {
    expect(buildDriveLoadingLayout('grid')).toEqual({
      statCards: 3,
      rows: 6,
      variant: 'grid',
    });
  });

  it('returns table-like placeholders for list mode', () => {
    expect(buildDriveLoadingLayout('list')).toEqual({
      statCards: 3,
      rows: 7,
      variant: 'list',
    });
  });
});
