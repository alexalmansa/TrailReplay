export type TileOutcome = 'on-time' | 'late' | 'unplanned' | 'pending';

export interface TileDiagnosticRecord {
  firstPredictedAt: number | null;
  firstRequestedAt: number | null;
  key: string;
  loadedAt: number | null;
  neededAt: number | null;
  outcome: TileOutcome;
  sourceId: string;
}

export interface TilePreloadSummary {
  late: number;
  onTime: number;
  pending: number;
  totalVisibleRequests: number;
  unplanned: number;
}

const MAX_RECORDS = 4_000;

/**
 * Correlates the tile work planned by the warm-up map with the tiles actually
 * demanded by the visible map. A tile is only marked late when it was needed
 * by the visible camera before it became ready; this avoids conflating cache
 * churn, prediction misses, and provider failures.
 */
export class TilePreloadDiagnostics {
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

  snapshot(): { records: TileDiagnosticRecord[]; summary: TilePreloadSummary } {
    const records = [...this.records.values()];
    const summary = records.reduce<TilePreloadSummary>((result, record) => {
      if (record.neededAt === null) return result;
      result.totalVisibleRequests += 1;
      if (record.outcome === 'on-time') result.onTime += 1;
      else if (record.outcome === 'late') result.late += 1;
      else if (record.outcome === 'unplanned') result.unplanned += 1;
      else result.pending += 1;
      return result;
    }, { late: 0, onTime: 0, pending: 0, totalVisibleRequests: 0, unplanned: 0 });

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

/** Extracts a stable z/x/y key from MapLibre source-data events. */
export function getMapLibreTileKey(event: unknown): string | null {
  const coord = (event as { coord?: { canonical?: { x?: number; y?: number; z?: number } } })?.coord?.canonical;
  if (!coord || !Number.isInteger(coord.z) || !Number.isInteger(coord.x) || !Number.isInteger(coord.y)) {
    return null;
  }
  return `${coord.z}/${coord.x}/${coord.y}`;
}
