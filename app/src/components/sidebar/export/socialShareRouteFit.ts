export interface CanvasPoint { x: number; y: number; }

export interface FitBox { x: number; y: number; w: number; h: number; }

export interface RouteTransformOpts { offsetX: number; offsetY: number; scale: number; }

// Fit lat/lon points into a canvas box, north-up.
// ponytail: cos(lat) mercator correction; ±0.5% accurate for routes <500 km
export function fitRouteToBox(
  latLons: ReadonlyArray<{ lat: number; lon: number }>,
  box: FitBox,
  transform: RouteTransformOpts,
): CanvasPoint[] {
  if (latLons.length < 2) return [];

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const { lat, lon } of latLons) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  const meanLat = (minLat + maxLat) / 2;
  const meanLon = (minLon + maxLon) / 2;
  const lonScale = Math.cos(meanLat * Math.PI / 180);
  const routeW = (maxLon - minLon) * lonScale || 1e-9;
  const routeH = maxLat - minLat || 1e-9;

  const baseScale = routeW / routeH > box.w / box.h
    ? box.w / routeW
    : box.h / routeH;
  const scale = baseScale * transform.scale;

  const cx = box.x + box.w / 2 + transform.offsetX;
  const cy = box.y + box.h / 2 + transform.offsetY;

  return latLons.map(({ lat, lon }) => ({
    x: cx + (lon - meanLon) * lonScale * scale,
    y: cy - (lat - meanLat) * scale,
  }));
}

export function downsampleRoute<T>(points: T[], maxN: number): T[] {
  if (points.length <= maxN) return points;
  const step = points.length / maxN;
  return Array.from({ length: maxN }, (_, i) => points[Math.floor(i * step)]);
}
