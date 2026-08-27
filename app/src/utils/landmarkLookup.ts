const MAX_BATCH_POINTS = 160;
const MAX_BATCH_SPAN_DEGREES = 1.1;

export interface LandmarkLookupPoint {
  lat: number;
  lon: number;
}

function sampleBatch(points: LandmarkLookupPoint[]): Array<[number, number]> {
  if (points.length <= MAX_BATCH_POINTS) {
    return points.map((point) => [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))]);
  }
  const step = (points.length - 1) / (MAX_BATCH_POINTS - 1);
  return Array.from({ length: MAX_BATCH_POINTS }, (_, index) => {
    const point = points[Math.round(index * step)];
    return [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))];
  });
}

export function buildLandmarkLookupBatches(
  routePoints: LandmarkLookupPoint[],
): Array<Array<[number, number]>> {
  if (routePoints.length < 2) return [];
  const batches: LandmarkLookupPoint[][] = [];
  let current: LandmarkLookupPoint[] = [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const point of routePoints) {
    const nextMinLat = Math.min(minLat, point.lat);
    const nextMaxLat = Math.max(maxLat, point.lat);
    const nextMinLon = Math.min(minLon, point.lon);
    const nextMaxLon = Math.max(maxLon, point.lon);
    const exceedsSpan = current.length >= 2 && (
      nextMaxLat - nextMinLat > MAX_BATCH_SPAN_DEGREES
      || nextMaxLon - nextMinLon > MAX_BATCH_SPAN_DEGREES
    );

    if (exceedsSpan) {
      batches.push(current);
      current = [current[current.length - 1], point];
      minLat = Math.min(current[0].lat, point.lat);
      maxLat = Math.max(current[0].lat, point.lat);
      minLon = Math.min(current[0].lon, point.lon);
      maxLon = Math.max(current[0].lon, point.lon);
      continue;
    }

    current.push(point);
    minLat = nextMinLat;
    maxLat = nextMaxLat;
    minLon = nextMinLon;
    maxLon = nextMaxLon;
  }

  if (current.length >= 2) batches.push(current);
  return batches.map(sampleBatch);
}

export function landmarkTrackSignature(
  track: { id: string; points: LandmarkLookupPoint[] },
): string {
  const first = track.points[0];
  const last = track.points[track.points.length - 1];
  return [
    track.id,
    track.points.length,
    first ? `${first.lat.toFixed(5)},${first.lon.toFixed(5)}` : '',
    last ? `${last.lat.toFixed(5)},${last.lon.toFixed(5)}` : '',
  ].join(':');
}

export function tracksNeedingLandmarkLookup<T extends {
  id: string;
  points: LandmarkLookupPoint[];
}>(
  tracks: T[],
  cachedSignatures: ReadonlyMap<string, string>,
): T[] {
  return tracks.filter((track) => (
    track.points.length >= 2
    && cachedSignatures.get(track.id) !== landmarkTrackSignature(track)
  ));
}
