export interface TileRequest {
  key: string;
  priority: number;
  sourceId: string;
  url: string;
}

interface QueuedTileRequest extends TileRequest {
  sequence: number;
}

export interface TileRequestSchedulerOptions {
  concurrency: number;
  load: (url: string) => Promise<void>;
  onComplete?: (request: TileRequest) => void;
  onError?: (request: TileRequest) => void;
}

/**
 * A small, bounded priority queue for predicted tiles. Unlike MapLibre's
 * viewport-driven request lifecycle, a queued request remains active when the
 * prediction camera advances to its next pose.
 */
export class TileRequestScheduler {
  private active = 0;
  private readonly completed = new Set<string>();
  private readonly queued = new Map<string, QueuedTileRequest>();
  private sequence = 0;
  private readonly options: TileRequestSchedulerOptions;

  constructor(options: TileRequestSchedulerOptions) {
    this.options = options;
  }

  enqueue(request: TileRequest): void {
    const id = `${request.sourceId}:${request.key}`;
    if (this.completed.has(id)) return;

    const existing = this.queued.get(id);
    if (!existing || request.priority < existing.priority) {
      this.queued.set(id, { ...request, sequence: this.sequence++ });
    }
    this.drain();
  }

  clear(): void {
    this.queued.clear();
  }

  private drain(): void {
    while (this.active < this.options.concurrency && this.queued.size > 0) {
      const next = [...this.queued.values()].sort((left, right) => (
        left.priority - right.priority || left.sequence - right.sequence
      ))[0];
      if (!next) return;

      const id = `${next.sourceId}:${next.key}`;
      this.queued.delete(id);
      this.active += 1;
      void this.options.load(next.url)
        .then(() => {
          this.completed.add(id);
          this.options.onComplete?.(next);
        })
        .catch(() => this.options.onError?.(next))
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }
}

const TILE_TEMPLATES: Record<string, string> = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  opentopomap: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'carto-labels': 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png',
  'enhanced-hillshade': 'https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/ASTER_GDEM/{z}/{x}/{y}.png',
  opensnowmap: 'https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png',
  'esri-clarity': 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'terrain-dem': 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
};

export function getTileRequestUrl(sourceId: string, key: string): string | null {
  const canonicalSourceId = sourceId.startsWith('fallback-')
    ? sourceId.slice('fallback-'.length)
    : sourceId;
  const template = TILE_TEMPLATES[canonicalSourceId];
  const [z, x, y] = key.split('/');
  if (!template || !z || !x || !y) return null;
  return template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
}

export function getTilePriority(sourceId: string): number {
  if (sourceId.startsWith('fallback-')) return -1;
  if (sourceId === 'terrain-dem') return 1;
  if (sourceId === 'carto-labels') return 2;
  if (sourceId === 'opensnowmap' || sourceId === 'slope' || sourceId === 'aspect') return 3;
  return 0;
}

export function preloadTileImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Tile request failed: ${url}`));
    image.src = url;
  });
}
