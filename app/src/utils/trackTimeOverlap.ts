import type { GPXTrack } from '@/types';
import { clusterByPairwiseMatch } from '@/utils/clusterByPairwiseMatch';

export interface TrackTimeRange {
  start: Date;
  end: Date;
}

export function getTrackTimeRange(track: GPXTrack): TrackTimeRange | null {
  let start: Date | null = null;
  let end: Date | null = null;

  for (const point of track.points) {
    if (!point.time) continue;
    if (!start || point.time < start) start = point.time;
    if (!end || point.time > end) end = point.time;
  }

  if (!start || !end) return null;
  return { start, end };
}

function rangesOverlap(a: TrackTimeRange, b: TrackTimeRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * Groups tracks recorded during overlapping time windows (e.g. several
 * people running the same event together), so they can default to
 * comparison-mode playback instead of the sequential journey order.
 * Overlap is transitive: if A overlaps B and B overlaps C, all three end up
 * in one cluster even if A and C don't directly overlap.
 */
export function groupTracksByTimeOverlap(tracks: GPXTrack[]): GPXTrack[][] {
  return clusterByPairwiseMatch(tracks, (a, b) => {
    const rangeA = getTrackTimeRange(a);
    const rangeB = getTrackTimeRange(b);
    return !!rangeA && !!rangeB && rangesOverlap(rangeA, rangeB);
  });
}
