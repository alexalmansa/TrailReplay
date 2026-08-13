import { describe, expect, it } from 'vitest';
import { TilePreloadDiagnostics, getMapLibreTileKey } from './tilePreloadDiagnostics';

describe('tile preload diagnostics', () => {
  it('separates ready, late, and unplanned visible tiles', () => {
    const diagnostics = new TilePreloadDiagnostics();
    diagnostics.predictTile('imagery', '16/1/1', 10);
    diagnostics.markTileReady('imagery', '16/1/1', 20);
    diagnostics.requestVisibleTile('imagery', '16/1/1', 30);

    diagnostics.predictTile('imagery', '16/1/2', 10);
    diagnostics.requestVisibleTile('imagery', '16/1/2', 30);
    diagnostics.markTileReady('imagery', '16/1/2', 40);

    diagnostics.requestVisibleTile('terrain-dem', '16/1/3', 30);

    expect(diagnostics.snapshot().summary).toEqual({
      late: 1, onTime: 1, pending: 0, totalVisibleRequests: 3, unplanned: 1,
    });
  });

  it('extracts canonical tile coordinates from source events', () => {
    expect(getMapLibreTileKey({ coord: { canonical: { z: 16, x: 123, y: 456 } } })).toBe('16/123/456');
    expect(getMapLibreTileKey({})).toBeNull();
  });
});
