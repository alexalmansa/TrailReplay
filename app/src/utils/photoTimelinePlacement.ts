import type { GPXPoint, GPXTrack, JourneySegment, RouteTimingMode, TrackSegment } from '@/types';
import type { ComputedJourney, SegmentTiming } from '@/utils/journeyUtils';
import { progressForRouteDistance } from '@/utils/journeyUtils';

export type TimestampPlacementFailureReason =
  | 'missing-timestamp'
  | 'no-timed-route'
  | 'timestamp-out-of-range';

export interface TimestampPlacementMatch {
  lat: number;
  lon: number;
  progress: number;
  /**
   * Where the match sits along the journey, in metres from its start. Absent
   * when the match was made against a single loose track rather than a
   * journey, where there is no journey-wide distance to refer to.
   */
  routeDistance?: number;
}

interface TimestampPlacementResult {
  match: TimestampPlacementMatch | null;
  reason: TimestampPlacementFailureReason | null;
}

function validTimedPoints(points: GPXPoint[]) {
  return points
    .map((point, index) => ({ index, point, timeMs: point.time?.getTime() ?? null }))
    .filter((entry): entry is { index: number; point: GPXPoint; timeMs: number } => (
      typeof entry.timeMs === 'number' && Number.isFinite(entry.timeMs)
    ));
}

function interpolateBetweenTimedPoints(
  timestampMs: number,
  lower: { index: number; point: GPXPoint; timeMs: number },
  upper: { index: number; point: GPXPoint; timeMs: number },
) {
  const span = upper.timeMs - lower.timeMs;
  const ratio = span > 0 ? (timestampMs - lower.timeMs) / span : 0;

  return {
    lat: lower.point.lat + (upper.point.lat - lower.point.lat) * ratio,
    lon: lower.point.lon + (upper.point.lon - lower.point.lon) * ratio,
    exactPointIndex: lower.index + (upper.index - lower.index) * ratio,
    // Distance from the start of this track, interpolated the same way. It is
    // what anchors the photo to one specific place on the route.
    trackDistance: lower.point.distance + (upper.point.distance - lower.point.distance) * ratio,
  };
}

function progressForTrackPointIndex(track: GPXTrack, exactPointIndex: number) {
  const pointSpan = Math.max(track.points.length - 1, 1);
  return Math.max(0, Math.min(1, exactPointIndex / pointSpan));
}

function progressForSegmentPointIndex(
  segmentTiming: SegmentTiming,
  exactPointIndex: number,
  pointCount: number,
) {
  const pointSpan = Math.max(pointCount - 1, 1);
  const localProgress = exactPointIndex / pointSpan;
  return segmentTiming.progressStartRatio +
    localProgress * (segmentTiming.progressEndRatio - segmentTiming.progressStartRatio);
}

function matchTimestampOnTrack(track: GPXTrack, timestampMs: number): TimestampPlacementResult {
  const timedPoints = validTimedPoints(track.points);
  if (timedPoints.length < 2) {
    return { match: null, reason: 'no-timed-route' };
  }

  const first = timedPoints[0];
  const last = timedPoints[timedPoints.length - 1];

  if (timestampMs < first.timeMs || timestampMs > last.timeMs) {
    return { match: null, reason: 'timestamp-out-of-range' };
  }

  for (let index = 1; index < timedPoints.length; index += 1) {
    const lower = timedPoints[index - 1];
    const upper = timedPoints[index];
    if (timestampMs < lower.timeMs || timestampMs > upper.timeMs) {
      continue;
    }

    const interpolated = interpolateBetweenTimedPoints(timestampMs, lower, upper);
    return {
      match: {
        lat: interpolated.lat,
        lon: interpolated.lon,
        progress: progressForTrackPointIndex(track, interpolated.exactPointIndex),
      },
      reason: null,
    };
  }

  return { match: null, reason: 'timestamp-out-of-range' };
}

function matchTimestampOnJourneyTrackSegment(
  track: GPXTrack,
  segmentTiming: SegmentTiming,
  timestampMs: number,
): TimestampPlacementResult {
  const timedPoints = validTimedPoints(track.points);
  if (timedPoints.length < 2) {
    return { match: null, reason: 'no-timed-route' };
  }

  const first = timedPoints[0];
  const last = timedPoints[timedPoints.length - 1];

  if (timestampMs < first.timeMs || timestampMs > last.timeMs) {
    return { match: null, reason: 'timestamp-out-of-range' };
  }

  for (let index = 1; index < timedPoints.length; index += 1) {
    const lower = timedPoints[index - 1];
    const upper = timedPoints[index];
    if (timestampMs < lower.timeMs || timestampMs > upper.timeMs) {
      continue;
    }

    const interpolated = interpolateBetweenTimedPoints(timestampMs, lower, upper);
    return {
      match: {
        lat: interpolated.lat,
        lon: interpolated.lon,
        progress: progressForSegmentPointIndex(segmentTiming, interpolated.exactPointIndex, track.points.length),
        routeDistance: segmentTiming.startDistance + interpolated.trackDistance,
      },
      reason: null,
    };
  }

  return { match: null, reason: 'timestamp-out-of-range' };
}

export function findTimestampPlacement(params: {
  timestamp?: Date;
  tracks: GPXTrack[];
  journeySegments: JourneySegment[];
  computedJourney: ComputedJourney | null;
  activeTrackId: string | null;
  /** Constant Pace ('uniform') times the replay by distance, not by point. */
  routeTimingMode?: RouteTimingMode;
}): TimestampPlacementResult {
  const { activeTrackId, computedJourney, journeySegments, routeTimingMode = 'recorded', timestamp, tracks } = params;

  if (!timestamp || Number.isNaN(timestamp.getTime())) {
    return { match: null, reason: 'missing-timestamp' };
  }

  const timestampMs = timestamp.getTime();

  if (computedJourney && journeySegments.length > 0) {
    let sawTimedRoute = false;

    for (const segmentTiming of computedJourney.segmentTimings) {
      if (segmentTiming.type !== 'track' || !segmentTiming.trackId) {
        continue;
      }

      const journeySegment = journeySegments[segmentTiming.segmentIndex] as TrackSegment | undefined;
      if (!journeySegment || journeySegment.type !== 'track') {
        continue;
      }

      const track = tracks.find((entry) => entry.id === journeySegment.trackId);
      if (!track) {
        continue;
      }

      const timedPoints = validTimedPoints(track.points);
      if (timedPoints.length >= 2) {
        sawTimedRoute = true;
      }

      const result = matchTimestampOnJourneyTrackSegment(track, segmentTiming, timestampMs);
      if (result.match) {
        // The timestamp already picked the exact point on the route. Turn that
        // one point into progress for the active timing mode - the point
        // itself is never looked up again, so the photo cannot wander to
        // another part of the track.
        const progress = result.match.routeDistance !== undefined
          ? progressForRouteDistance(
            computedJourney.coordinates,
            computedJourney.segmentTimings,
            result.match.routeDistance,
            routeTimingMode,
          )
          : null;

        return progress === null
          ? result
          : { match: { ...result.match, progress }, reason: null };
      }
    }

    return {
      match: null,
      reason: sawTimedRoute ? 'timestamp-out-of-range' : 'no-timed-route',
    };
  }

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  if (!activeTrack) {
    return { match: null, reason: 'no-timed-route' };
  }

  return matchTimestampOnTrack(activeTrack, timestampMs);
}
