/**
 * Minimal contract shared by production tile warm-up code and the optional
 * development diagnostics. Keeping this file allocation-free allows the full
 * diagnostic ledger to live behind a development-only dynamic import.
 */
export interface TilePreloadObserver {
  markTileAborted(sourceId: string, key: string): void;
  markTileFailed(sourceId: string, key: string): void;
  markTileReady(sourceId: string, key: string, loadedAt?: number): void;
  predictTile(sourceId: string, key: string, predictedAt?: number): void;
  requestVisibleTile(sourceId: string, key: string, neededAt?: number): void;
  reset(): void;
}

/** Production observer: intentionally performs no allocation or bookkeeping. */
export const NOOP_TILE_PRELOAD_OBSERVER: TilePreloadObserver = {
  markTileAborted: () => undefined,
  markTileFailed: () => undefined,
  markTileReady: () => undefined,
  predictTile: () => undefined,
  requestVisibleTile: () => undefined,
  reset: () => undefined,
};

/** Extracts a stable canonical z/x/y key from MapLibre source-data events. */
export function getMapLibreTileKey(event: unknown): string | null {
  const tileEvent = event as {
    coord?: { canonical?: { x?: number; y?: number; z?: number } };
    tile?: { tileID?: { canonical?: { x?: number; y?: number; z?: number } } };
  };
  const coord = tileEvent.coord?.canonical ?? tileEvent.tile?.tileID?.canonical;
  if (!coord || !Number.isInteger(coord.z) || !Number.isInteger(coord.x) || !Number.isInteger(coord.y)) {
    return null;
  }
  return `${coord.z}/${coord.x}/${coord.y}`;
}
