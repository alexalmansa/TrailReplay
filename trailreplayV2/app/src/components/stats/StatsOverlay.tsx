import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { formatDistance, formatPace, formatDuration, formatElevation } from '@/utils/units';
import { useI18n } from '@/i18n/useI18n';
import {
  Route,
  Timer,
  Clock,
  Mountain,
  Heart,
  Zap,
  TrendingUp
} from 'lucide-react';

interface StatsOverlayProps {
  compact?: boolean;
}

export function StatsOverlay({ compact = false }: StatsOverlayProps) {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);

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
      cadence: currentPosition.cadence,
      power: currentPosition.power,
    };
  }, [currentPosition, playback, totalDistance, segmentTimings, activeTrack, tracks, computedJourney]);


  // Don't show if no data
  if (!currentStats || journeySegments.length === 0) return null;

  // Count segments
  const trackCount = segmentTimings.filter((s) => s.type === 'track').length;
  const transportCount = segmentTimings.filter((s) => s.type === 'transport').length;

  return (
    <div className={`tr-stats-overlay ${compact ? 'tr-stats-overlay--compact max-w-[17rem]' : 'max-w-md'}`}>
      {/* Main Stats Grid */}
      <div className={`grid grid-cols-3 ${compact ? 'gap-2.5 mb-2.5' : 'gap-4 mb-4'}`}>
        <StatItem
          icon={<Route className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.distance')}
          value={formatDistance(currentStats.distance, settings.unitSystem)}
          compact={compact}
        />
        <StatItem
          icon={<Timer className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.duration')}
          value={formatDuration(currentStats.duration)}
          compact={compact}
        />
        <StatItem
          icon={<Clock className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.avgPace')}
          value={isInTransport ? '--' : formatPace(currentStats.averageSpeed, settings.unitSystem)}
          compact={compact}
        />
      </div>

      {/* Secondary Stats */}
      <div className={`grid grid-cols-4 gap-2 border-t border-[var(--evergreen)]/20 ${compact ? 'pt-2.5' : 'pt-4'}`}>
        <SmallStatItem
          icon={<Mountain className={compact ? 'w-3 h-3' : 'w-3 h-3'} />}
          label={t('stats.elev')}
          value={isInTransport ? '--' : formatElevation(currentStats.elevationGain, settings.unitSystem)}
          compact={compact}
        />

        {settings.showHeartRate && currentStats.heartRate && !isInTransport && (
          <SmallStatItem
            icon={<Heart className="w-3 h-3" />}
            label="HR"
            value={`${Math.round(currentStats.heartRate)}`}
            unit="bpm"
            color="text-red-500"
            compact={compact}
          />
        )}

        {currentStats.cadence && !isInTransport && (
          <SmallStatItem
            icon={<Zap className="w-3 h-3" />}
            label={t('stats.cadence')}
            value={`${Math.round(currentStats.cadence)}`}
            unit="rpm"
            compact={compact}
          />
        )}

        {currentStats.power && !isInTransport && (
          <SmallStatItem
            icon={<TrendingUp className="w-3 h-3" />}
            label={t('stats.power')}
            value={`${Math.round(currentStats.power)}`}
            unit="w"
            compact={compact}
          />
        )}
      </div>

      {/* Multi-segment indicator (show only if journey has multiple segments) */}
      {segmentTimings.length > 1 && (
        <div className={`border-t border-[var(--evergreen)]/20 flex items-center justify-center ${compact ? 'mt-2.5 pt-2.5' : 'mt-4 pt-4'}`}>
          <span className={`text-[var(--evergreen-60)] bg-[var(--evergreen)]/10 px-2 py-0.5 rounded ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {trackCount} track{trackCount !== 1 ? 's' : ''}
            {transportCount > 0 && ` + ${transportCount} transport`}
          </span>
        </div>
      )}
    </div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}

function StatItem({ icon, label, value, compact = false }: StatItemProps) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center text-[var(--evergreen-60)] ${compact ? 'gap-0.5 mb-0.5' : 'gap-1 mb-1'}`}>
        {icon}
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-wide`}>{label}</span>
      </div>
      <div className={`tr-stat-value ${compact ? 'text-base' : 'text-lg'}`}>{value}</div>
    </div>
  );
}

interface SmallStatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
  compact?: boolean;
}

function SmallStatItem({ icon, label, value, unit, color, compact = false }: SmallStatItemProps) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-0.5 text-[var(--evergreen-60)] ${compact ? 'mb-0' : 'mb-0.5'} ${color || ''}`}>
        {icon}
      </div>
      <div className={`${compact ? 'text-[13px]' : 'text-sm'} font-bold ${color || 'text-[var(--evergreen)]'}`}>
        {value}
        {unit && <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-normal ml-0.5`}>{unit}</span>}
      </div>
      <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} text-[var(--evergreen-60)] uppercase`}>{label}</div>
    </div>
  );
}
