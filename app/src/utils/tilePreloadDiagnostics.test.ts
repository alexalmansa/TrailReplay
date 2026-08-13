import { describe, expect, it } from 'vitest';
import {
  TilePreloadDiagnostics,
  getTileSourceCategory,
} from './tilePreloadDiagnostics';
import { getMapLibreTileKey } from './tilePreloadObserver';

describe('tile preload diagnostics', () => {
  it('separates ready, late, and unplanned visible tiles', () => {
    const diagnostics = new TilePreloadDiagnostics();
    diagnostics.predictTile('satellite', '16/1/1', 10);
    diagnostics.markTileReady('satellite', '16/1/1', 20);
    diagnostics.requestVisibleTile('satellite', '16/1/1', 30);

    diagnostics.predictTile('satellite', '16/1/2', 10);
    diagnostics.requestVisibleTile('satellite', '16/1/2', 30);
    diagnostics.markTileReady('satellite', '16/1/2', 40);

    diagnostics.requestVisibleTile('terrain-dem', '16/1/3', 30);

    expect(diagnostics.snapshot().summary).toEqual({
      aborted: 0,
      byCategory: {
        'basemap-detail': { aborted: 0, failed: 0, late: 1, onTime: 1, pending: 0, totalVisibleRequests: 2, unplanned: 0 },
        terrain: { aborted: 0, failed: 0, late: 0, onTime: 0, pending: 0, totalVisibleRequests: 1, unplanned: 1 },
      },
      bySource: {
        satellite: { aborted: 0, failed: 0, late: 1, onTime: 1, pending: 0, totalVisibleRequests: 2, unplanned: 0 },
        'terrain-dem': { aborted: 0, failed: 0, late: 0, onTime: 0, pending: 0, totalVisibleRequests: 1, unplanned: 1 },
      },
      failed: 0,
      late: 1,
      onTime: 1,
      pending: 0,
      totalVisibleRequests: 3,
      unplanned: 1,
    });
  });

  it('reports source-specific aborts and failures and resets between runs', () => {
    const diagnostics = new TilePreloadDiagnostics();
    diagnostics.predictTile('fallback-esri-clarity', '12/1/1', 10);
    diagnostics.requestVisibleTile('fallback-esri-clarity', '12/1/1', 20);
    diagnostics.markTileAborted('fallback-esri-clarity', '12/1/1');
    diagnostics.requestVisibleTile('terrain-dem', '15/2/2', 20);
    diagnostics.markTileFailed('terrain-dem', '15/2/2');

    const summary = diagnostics.snapshot().summary;
    expect(summary.byCategory['basemap-fallback']?.aborted).toBe(1);
    expect(summary.byCategory.terrain?.failed).toBe(1);
    expect(summary.aborted).toBe(1);
    expect(summary.failed).toBe(1);

    diagnostics.reset();
    expect(diagnostics.snapshot().summary.totalVisibleRequests).toBe(0);
  });

  it('categorizes production tile sources', () => {
    expect(getTileSourceCategory('esri-clarity')).toBe('basemap-detail');
    expect(getTileSourceCategory('fallback-esri-clarity')).toBe('basemap-fallback');
    expect(getTileSourceCategory('terrain-dem')).toBe('terrain');
    expect(getTileSourceCategory('carto-labels')).toBe('overlay');
  });

  it('extracts canonical tile coordinates from source events', () => {
    expect(getMapLibreTileKey({ coord: { canonical: { z: 16, x: 123, y: 456 } } })).toBe('16/123/456');
    expect(getMapLibreTileKey({ tile: { tileID: { canonical: { z: 12, x: 7, y: 8 } } } })).toBe('12/7/8');
    expect(getMapLibreTileKey({})).toBeNull();
  });
});
