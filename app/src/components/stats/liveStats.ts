import type { GPXTrack } from '@/types';
import type { ComputedJourney, JourneyPoint, SegmentTiming } from '@/utils/journeyUtils';

export interface CurrentLiveStats {
  distance: number;
  duration: number;
  averageSpeed: number;
  rollingSpeed: number;
  currentSpeed: number;
  elevationGain: number;
  altitude: number | null;
  heartRate: number | null;
}

interface CalculateCurrentLiveStatsInput {
  activeTrack?: GPXTrack;
  computedJourney: ComputedJourney | null;
  currentPosition: JourneyPoint;
  playbackProgress: number;
  restartPerTrack: boolean;
  segmentTimings: SegmentTiming[];
  totalDistance: number;
  tracks: GPXTrack[];
  /** Video length in seconds, used as a fallback "duration" for routes with no recorded GPS time (see `elapsedTrackTime`). */
  videoDurationSeconds?: number;
}

function recordedTime(track: GPXTrack | undefined): number {
  return track ? track.movingTime || track.totalTime : 0;
}

export function calculateElevationGain(
  points: Array<{ elevation: number }>,
  upToIndex: number,
): number {
  if (upToIndex <= 0 || points.length === 0) return 0;
  let elevationGain = 0;
  const endIndex = Math.min(upToIndex, points.length - 1);
  for (let index = 1; index <= endIndex; index += 1) {
    const elevationDiff = points[index].elevation - points[index - 1].elevation;
    if (elevationDiff > 0) elevationGain += elevationDiff;
  }
  return elevationGain;
}

function localProgressFor(timing: SegmentTiming, playbackProgress: number): number {
  const span = timing.progressEndRatio - timing.progressStartRatio;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (playbackProgress - timing.progressStartRatio) / span));
}

/**
 * GPX files with no recorded timestamps (common for planned/drawn routes,
 * and for anyone using "Constant Pace" specifically because they don't have
 * real timing data) leave every track's `movingTime`/`totalTime` at 0. That
 * silently made this always return 0 regardless of playback position, so the
 * "duration" stat looked stuck rather than reporting the one duration that
 * *is* meaningful here: how far into the exported/played video the replay
 * is. Fall back to that whenever none of the relevant tracks have real time
 * data, instead of showing a duration that can never move.
 */
export function elapsedTrackTime(
  segmentTimings: SegmentTiming[],
  tracks: GPXTrack[],
  activeTrack: GPXTrack | undefined,
  playbackProgress: number,
  videoDurationSeconds: number = 0,
): number {
  if (segmentTimings.length === 0) {
    const trackRealTime = recordedTime(activeTrack);
    return trackRealTime > 0
      ? trackRealTime * playbackProgress
      : videoDurationSeconds * playbackProgress;
  }

  const hasRecordedTiming = segmentTimings.some((timing) => (
    timing.type === 'track' && timing.trackId
      ? recordedTime(tracks.find((candidate) => candidate.id === timing.trackId)) > 0
      : false
  ));
  if (!hasRecordedTiming) {
    return videoDurationSeconds * playbackProgress;
  }

  return segmentTimings.reduce((elapsed, timing) => {
    if (timing.type !== 'track' || !timing.trackId) return elapsed;
    const track = tracks.find((candidate) => candidate.id === timing.trackId);
    if (!track) return elapsed;
    const trackRealTime = recordedTime(track);
    if (playbackProgress >= timing.progressEndRatio) return elapsed + trackRealTime;
    if (playbackProgress > timing.progressStartRatio) {
      return elapsed + trackRealTime * localProgressFor(timing, playbackProgress);
    }
    return elapsed;
  }, 0);
}

function coordinateAtDistance(points: GPXTrack['points'], targetMeters: number) {
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (points[middle].distance < targetMeters) low = middle + 1;
    else high = middle;
  }
  return points[low] ?? null;
}

function coordinateAtJourneyDistance(
  computedJourney: ComputedJourney | null,
  segmentTimings: SegmentTiming[],
  activeTrack: GPXTrack | undefined,
  targetMeters: number,
) {
  if (computedJourney && segmentTimings.length > 0) {
    for (const timing of segmentTimings) {
      if (targetMeters < timing.startDistance || targetMeters > timing.endDistance) continue;
      const segment = computedJourney.coordinates.slice(timing.startCoordIndex, timing.endCoordIndex + 1);
      const localDistance = targetMeters - timing.startDistance;
      let low = 0;
      let high = segment.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if ((segment[middle].distance ?? 0) < localDistance) low = middle + 1;
        else high = middle;
      }
      return segment[low] ?? null;
    }
  }
  return activeTrack ? coordinateAtDistance(activeTrack.points, targetMeters) : null;
}

function completedKilometerSpeed(
  distance: number,
  coordinateAt: (targetMeters: number) => { time: Date | null } | null,
): number {
  const completedKilometers = Math.floor(distance / 1000);
  if (completedKilometers < 1) return 0;
  const start = coordinateAt((completedKilometers - 1) * 1000);
  const end = coordinateAt(completedKilometers * 1000);
  if (!start?.time || !end?.time) return 0;
  const elapsed = (end.time.getTime() - start.time.getTime()) / 1000;
  return elapsed > 0 ? 1000 / elapsed : 0;
}

export function calculateCurrentLiveStats({
  activeTrack,
  computedJourney,
  currentPosition,
  playbackProgress,
  restartPerTrack,
  segmentTimings,
  totalDistance,
  tracks,
  videoDurationSeconds = 0,
}: CalculateCurrentLiveStatsInput): CurrentLiveStats {
  const currentTiming = segmentTimings.find(
    (timing) => timing.segmentIndex === currentPosition.segmentIndex,
  );
  const currentTrack = currentTiming?.type === 'track' && currentTiming.trackId
    ? tracks.find((track) => track.id === currentTiming.trackId)
    : activeTrack;
  const resetThisSegment = restartPerTrack && segmentTimings.length > 1;

  let distance = totalDistance * playbackProgress;
  if (currentTiming) distance = currentTiming.startDistance + (currentPosition.distance ?? 0);
  else distance = currentPosition.distance ?? distance;
  if (resetThisSegment) distance = currentPosition.distance ?? 0;

  let duration = elapsedTrackTime(segmentTimings, tracks, activeTrack, playbackProgress, videoDurationSeconds);
  if (resetThisSegment) {
    if (currentTiming?.type === 'track' && currentTrack) {
      const trackRealTime = recordedTime(currentTrack);
      duration = trackRealTime > 0
        ? trackRealTime * localProgressFor(currentTiming, playbackProgress)
        : (currentTiming.duration / 1000) * localProgressFor(currentTiming, playbackProgress);
    } else {
      duration = 0;
    }
  }

  const rollingSpeed = completedKilometerSpeed(
    distance,
    resetThisSegment && currentTrack
      ? (targetMeters) => coordinateAtDistance(currentTrack.points, targetMeters)
      : (targetMeters) => coordinateAtJourneyDistance(
          computedJourney,
          segmentTimings,
          activeTrack,
          targetMeters,
        ),
  );

  let elevationGain = 0;
  if (computedJourney && segmentTimings.length > 0) {
    for (const timing of segmentTimings) {
      if (timing.type !== 'track') continue;
      const segment = computedJourney.coordinates.slice(timing.startCoordIndex, timing.endCoordIndex + 1);
      if (playbackProgress >= timing.progressEndRatio) {
        if (!resetThisSegment || timing.segmentIndex === currentPosition.segmentIndex) {
          elevationGain += calculateElevationGain(segment, segment.length - 1);
        }
      } else if (playbackProgress > timing.progressStartRatio) {
        const upToIndex = Math.floor(localProgressFor(timing, playbackProgress) * (segment.length - 1));
        elevationGain += calculateElevationGain(segment, upToIndex);
        break;
      }
    }
  } else if (activeTrack) {
    const targetDistance = activeTrack.totalDistance * playbackProgress;
    let pointIndex = 0;
    for (let index = 0; index < activeTrack.points.length; index += 1) {
      pointIndex = index;
      if (activeTrack.points[index].distance >= targetDistance) break;
    }
    elevationGain = calculateElevationGain(activeTrack.points, pointIndex);
  }

  return {
    distance,
    duration,
    averageSpeed: duration > 0 ? distance / duration : 0,
    rollingSpeed,
    currentSpeed: currentPosition.speed || 0,
    elevationGain,
    altitude: currentPosition.elevation ?? null,
    heartRate: currentPosition.heartRate,
  };
}
