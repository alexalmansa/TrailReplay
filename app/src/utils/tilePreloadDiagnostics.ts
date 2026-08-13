import type { TilePreloadObserver } from './tilePreloadObserver';

export type TileOutcome = 'on-time' | 'late' | 'unplanned' | 'pending' | 'aborted' | 'failed';
export type TileSourceCategory = 'basemap-detail' | 'basemap-fallback' | 'terrain' | 'overlay' | 'other';

export interface TileDiagnosticRecord {
  firstPredictedAt: number | null;
  firstRequestedAt: number | null;
  key: string;
  loadedAt: number | null;
  neededAt: number | null;
  outcome: TileOutcome;
  sourceId: string;
}

export interface TilePreloadCounters {
  aborted: number;
  failed: number;
  late: number;
  onTime: number;
  pending: number;
  totalVisibleRequests: number;
  unplanned: number;
}

export interface TilePreloadSummary extends TilePreloadCounters {
  byCategory: Partial<Record<TileSourceCategory, TilePreloadCounters>>;
  bySource: Record<string, TilePreloadCounters>;
}

const MAX_RECORDS = 4_000;

/**
 * Correlates the tile work planned by the warm-up map with the tiles actually
 * demanded by the visible map. A tile is only marked late when it was needed
 * by the visible camera before it became ready; this avoids conflating cache
 * churn, prediction misses, and provider failures.
 */
export class TilePreloadDiagnostics implements TilePreloadObserver {
  private readonly records = new Map<string, TileDiagnosticRecord>();

  predictTile(sourceId: string, key: string, predictedAt = performance.now()): void {
    const record = this.ensureRecord(sourceId, key);
    record.firstPredictedAt ??= predictedAt;
  }

  requestVisibleTile(sourceId: string, key: string, neededAt = performance.now()): void {
    const record = this.ensureRecord(sourceId, key);
    record.firstRequestedAt ??= neededAt;
    record.neededAt ??= neededAt;

    if (record.loadedAt !== null && record.loadedAt <= neededAt) {
      record.outcome = 'on-time';
    } else if (record.firstPredictedAt === null) {
      record.outcome = 'unplanned';
    } else {
      // A source may retry a tile after MapLibre aborted an obsolete request.
      record.outcome = 'pending';
    }
  }

  markTileReady(sourceId: string, key: string, loadedAt = performance.now()): void {
    const record = this.ensureRecord(sourceId, key);
    record.loadedAt ??= loadedAt;

    if (record.neededAt === null) return;
    if (record.firstPredictedAt === null) {
      record.outcome = 'unplanned';
      return;
    }
    record.outcome = loadedAt <= record.neededAt ? 'on-time' : 'late';
  }

  markTileAborted(sourceId: string, key: string): void {
    const record = this.records.get(`${sourceId}:${key}`);
    if (record?.neededAt !== null && record?.loadedAt === null) record.outcome = 'aborted';
  }

  markTileFailed(sourceId: string, key: string): void {
    const record = this.records.get(`${sourceId}:${key}`);
    if (record?.neededAt !== null && record?.loadedAt === null) record.outcome = 'failed';
  }

  reset(): void {
    this.records.clear();
  }

  snapshot(): { records: TileDiagnosticRecord[]; summary: TilePreloadSummary } {
    const records = [...this.records.values()];
    const summary: TilePreloadSummary = {
      ...createCounters(),
      byCategory: {},
      bySource: {},
    };
    for (const record of records) {
      if (record.neededAt === null) continue;
      incrementCounters(summary, record.outcome);

      const sourceCounters = summary.bySource[record.sourceId] ??= createCounters();
      incrementCounters(sourceCounters, record.outcome);

      const category = getTileSourceCategory(record.sourceId);
      const categoryCounters = summary.byCategory[category] ??= createCounters();
      incrementCounters(categoryCounters, record.outcome);
    }

    return { records, summary };
  }

  private ensureRecord(sourceId: string, key: string): TileDiagnosticRecord {
    const id = `${sourceId}:${key}`;
    const existing = this.records.get(id);
    if (existing) return existing;

    if (this.records.size >= MAX_RECORDS) {
      const oldestId = this.records.keys().next().value;
      if (oldestId) this.records.delete(oldestId);
    }

    const record: TileDiagnosticRecord = {
      firstPredictedAt: null,
      firstRequestedAt: null,
      key,
      loadedAt: null,
      neededAt: null,
      outcome: 'pending',
      sourceId,
    };
    this.records.set(id, record);
    return record;
  }
}

const DETAIL_BASEMAP_SOURCES = new Set([
  'satellite',
  'esri-clarity',
  'osm',
  'opentopomap',
  'mapbox-streets',
  'wayback',
]);

const OVERLAY_SOURCES = new Set([
  'carto-labels',
  'enhanced-hillshade',
  'opensnowmap',
  'slope',
  'aspect',
]);

export function getTileSourceCategory(sourceId: string): TileSourceCategory {
  if (sourceId.startsWith('fallback-')) return 'basemap-fallback';
  if (DETAIL_BASEMAP_SOURCES.has(sourceId)) return 'basemap-detail';
  if (sourceId === 'terrain-dem') return 'terrain';
  if (OVERLAY_SOURCES.has(sourceId)) return 'overlay';
  return 'other';
}

function createCounters(): TilePreloadCounters {
  return {
    aborted: 0,
    failed: 0,
    late: 0,
    onTime: 0,
    pending: 0,
    totalVisibleRequests: 0,
    unplanned: 0,
  };
}

function incrementCounters(counters: TilePreloadCounters, outcome: TileOutcome): void {
  counters.totalVisibleRequests += 1;
  if (outcome === 'on-time') counters.onTime += 1;
  else if (outcome === 'late') counters.late += 1;
  else if (outcome === 'unplanned') counters.unplanned += 1;
  else if (outcome === 'aborted') counters.aborted += 1;
  else if (outcome === 'failed') counters.failed += 1;
  else counters.pending += 1;
}
