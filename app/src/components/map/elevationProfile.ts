export interface ElevationProfileSample {
  elevation: number;
  progress: number;
}

/** Interpolates a sorted profile without scanning every GPX sample per frame. */
export function getElevationAtProgress(
  points: ElevationProfileSample[],
  progress: number,
): number {
  if (points.length === 0) return 0;

  const first = points[0];
  const last = points[points.length - 1];
  if (progress <= first.progress) return first.elevation;
  if (progress >= last.progress) return last.elevation;

  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].progress < progress) low = middle + 1;
    else high = middle;
  }

  const next = points[low];
  const previous = points[low - 1];
  const span = next.progress - previous.progress;
  if (span <= 0) return next.elevation;

  const ratio = (progress - previous.progress) / span;
  return previous.elevation + (next.elevation - previous.elevation) * ratio;
}
