import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { formatDistance, formatStatsDuration, formatElevation, formatSpeedFromKmh } from '@/utils/units';
import { useI18n } from '@/i18n/useI18n';
import {
  Route,
  Timer,
  Clock,
  Mountain,
  Heart,
} from 'lucide-react';

interface StatsOverlayProps {
  compact?: boolean;
  layout?: 'default' | 'narrow';
}

export function StatsOverlay({ compact = false, layout = 'default' }: StatsOverlayProps) {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const statsOverlayFields = useAppStore((state) => state.settings.statsOverlay.fields);
  const isNarrowLayout = compact || layout === 'narrow';

  // Use computed journey for multi-track support
  const {
    currentPosition,
    isInTransport,
    totalDistance,
    segmentTimings,
    activeTrack,
    computedJourney,
  } = useComputedJourney();

  /**
   * Calculate elevation gain by summing positive elevation differences between consecutive points
   */
  const calculateElevationGainFromPoints = (points: Array<{ elevation: number }>, upToIndex: number): number => {
    if (upToIndex <= 0 || points.length === 0) return 0;

    let elevationGain = 0;
    const endIndex = Math.min(upToIndex, points.length - 1);

    for (let i = 1; i <= endIndex; i++) {
      const elevationDiff = points[i].elevation - points[i - 1].elevation;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      }
    }

    return elevationGain;
  };

  const currentStats = useMemo(() => {
    if (!currentPosition) return null;

    // Calculate cumulative distance based on journey progress
    // totalDistance is in meters (from gpxParser using Haversine)
    const distanceAtProgress = totalDistance * playback.progress;

    // Calculate real elapsed time from actual track data (not animation time)
    // For single track: use track's totalTime proportional to progress
    // For multi-segment journeys: sum real track durations proportionally
    let realElapsedSeconds = 0;
    if (segmentTimings.length > 0) {
      // Multi-segment journey: sum real track time up to current progress
      for (const timing of segmentTimings) {
        if (timing.type !== 'track' || !timing.trackId) continue;
        const track = tracks.find((t) => t.id === timing.trackId);
        if (!track) continue;
        const trackRealTime = track.movingTime || track.totalTime;
        if (playback.progress >= timing.progressEndRatio) {
          realElapsedSeconds += trackRealTime;
        } else if (playback.progress > timing.progressStartRatio) {
          const segmentSpan = timing.progressEndRatio - timing.progressStartRatio;
          const localProgress = segmentSpan > 0
            ? (playback.progress - timing.progressStartRatio) / segmentSpan
            : 0;
          realElapsedSeconds += trackRealTime * localProgress;
        }
      }
    } else if (activeTrack) {
      // Single track mode: use track's real time proportional to progress
      const trackRealTime = activeTrack.movingTime || activeTrack.totalTime;
      realElapsedSeconds = trackRealTime * playback.progress;
    }

    const averageSpeedMps = realElapsedSeconds > 0 ? distanceAtProgress / realElapsedSeconds : 0;

    // Calculate cumulative elevation gain by summing actual elevation differences
    let cumulativeElevationGain = 0;
    if (computedJourney && segmentTimings.length > 0) {
      // Multi-segment journey: find current coordinate index and sum elevation gain up to it
      for (const timing of segmentTimings) {
        if (timing.type !== 'track') {
          // Skip transport segments in elevation calculation
          continue;
        }

        if (playback.progress >= timing.progressEndRatio) {
          // Completed segment: add all elevation gain
          const segmentCoords = computedJourney.coordinates.slice(timing.startCoordIndex, timing.endCoordIndex + 1);
          cumulativeElevationGain += calculateElevationGainFromPoints(segmentCoords, segmentCoords.length - 1);
        } else if (playback.progress > timing.progressStartRatio) {
          // Partial segment: add elevation gain up to current progress
          const segmentSpan = timing.progressEndRatio - timing.progressStartRatio;
          const localProgress = segmentSpan > 0
            ? (playback.progress - timing.progressStartRatio) / segmentSpan
            : 0;

          const segmentLength = timing.endCoordIndex - timing.startCoordIndex + 1;
          const upToIndex = Math.floor(localProgress * (segmentLength - 1));
          const segmentCoords = computedJourney.coordinates.slice(timing.startCoordIndex, timing.endCoordIndex + 1);
          cumulativeElevationGain += calculateElevationGainFromPoints(segmentCoords, upToIndex);
          break;
        }
      }
    } else if (activeTrack) {
      // Single track mode: find current point and sum elevation gain up to it
      const targetDistance = activeTrack.totalDistance * playback.progress;
      let currentPointIndex = 0;

      for (let i = 0; i < activeTrack.points.length; i++) {
        if (activeTrack.points[i].distance >= targetDistance) {
          currentPointIndex = i;
          break;
        }
        currentPointIndex = i;
      }

      cumulativeElevationGain = calculateElevationGainFromPoints(activeTrack.points, currentPointIndex);
    }

    return {
      distance: distanceAtProgress, // in meters
      duration: realElapsedSeconds,
      averageSpeed: averageSpeedMps, // m/s for pace calculation
      currentSpeed: currentPosition.speed || 0, // km/h for transport display
      elevationGain: cumulativeElevationGain, // meters
      heartRate: currentPosition.heartRate,
    };
  }, [currentPosition, playback, totalDistance, segmentTimings, activeTrack, tracks, computedJourney]);

  // Don't show if no data
  if (!currentStats || journeySegments.length === 0) return null;

  const hasHeartRate = settings.showHeartRate && currentStats.heartRate != null;

  const items = [
    statsOverlayFields.distance && {
      key: 'distance',
      icon: <Route className="w-4 h-4 text-white" />,
      label: t('stats.distance'),
      value: formatDistance(currentStats.distance, settings.unitSystem),
    },
    statsOverlayFields.speed && {
      key: 'speed',
      icon: <Timer className="w-4 h-4 text-white" />,
      label: t('stats.speed'),
      // currentStats.currentSpeed is in km/h (from currentPosition.speed);
      // formatSpeedFromKmh handles the metric/imperial conversion + unit label.
      value: isInTransport
        ? '--'
        : formatSpeedFromKmh(currentStats.currentSpeed || 0, settings.unitSystem),
    },
    statsOverlayFields.elevation && {
      key: 'elevation',
      icon: <Mountain className="w-4 h-4 text-white" />,
      label: t('stats.elev'),
      value: isInTransport ? '--' : formatElevation(currentStats.elevationGain, settings.unitSystem),
    },
    statsOverlayFields.elapsed && {
      key: 'elapsed',
      icon: <Clock className="w-4 h-4 text-white" />,
      label: t('stats.duration'),
      value: formatStatsDuration(currentStats.duration),
    },
    statsOverlayFields.heartRate && hasHeartRate && {
      key: 'heartRate',
      icon: <Heart className="w-4 h-4 text-white" />,
      label: t('stats.heartRateShort'),
      value: isInTransport ? '--' : `${Math.round(currentStats.heartRate!)} ${t('stats.bpm')}`,
    },
  ].filter(Boolean) as Array<{ key: string; icon: React.ReactNode; label: string; value: string }>;

  const columns = items.length <= 1 ? 1 : 2;

  return (
    <div className={`tr-stats-overlay tr-stats-overlay--mini ${isNarrowLayout ? 'max-w-[19.5rem]' : 'max-w-[25.5rem]'}`}>
      <div
        className="grid gap-x-3 gap-y-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <div key={item.key} className="min-w-0 text-center px-1 py-0.5">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="flex items-center justify-center text-white/95">{item.icon}</span>
              <span className="block text-[10px] text-white font-semibold uppercase tracking-[0.08em] leading-[1.1]">
                {item.label}
              </span>
            </div>
            <div className="tr-stat-value flex items-center justify-center text-[15px] leading-[1.05] text-white font-semibold tabular-nums tracking-[-0.02em]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
