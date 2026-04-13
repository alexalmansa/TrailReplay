import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { formatDistance, formatPace, formatStatsDuration, formatElevation } from '@/utils/units';
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
  layout?: 'default' | 'narrow';
  variant?: 'default' | 'export';
}

export function StatsOverlay({ compact = false, layout = 'default', variant = 'default' }: StatsOverlayProps) {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const isNarrowLayout = compact || layout === 'narrow';
  const isExportVariant = variant === 'export';

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
  const secondaryStats = [
    settings.showHeartRate && currentStats.heartRate && !isInTransport
      ? {
          key: 'heart-rate',
          icon: <Heart className="w-3 h-3" />,
          label: t('stats.heartRateShort'),
          value: `${Math.round(currentStats.heartRate)}`,
          unit: t('stats.bpm'),
          color: 'text-red-500',
        }
      : null,
    currentStats.cadence && !isInTransport
      ? {
          key: 'cadence',
          icon: <Zap className="w-3 h-3" />,
          label: t('stats.cadence'),
          value: `${Math.round(currentStats.cadence)}`,
          unit: t('stats.rpm'),
        }
      : null,
    currentStats.power && !isInTransport
      ? {
          key: 'power',
          icon: <TrendingUp className="w-3 h-3" />,
          label: t('stats.power'),
          value: `${Math.round(currentStats.power)}`,
          unit: t('stats.watts'),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    unit?: string;
    color?: string;
  }>;

  return (
    <div
      className={`tr-stats-overlay ${
        isExportVariant
          ? 'tr-stats-overlay--compact tr-stats-overlay--export max-w-[15.5rem]'
          : isNarrowLayout
            ? 'tr-stats-overlay--compact tr-stats-overlay--narrow max-w-[19.5rem]'
            : 'max-w-[25.5rem]'
      }`}
    >
      {/* Main Stats Grid */}
      <div className={`grid ${
        isExportVariant || isNarrowLayout
          ? 'grid-cols-2 gap-x-1.5 gap-y-1.5 mb-0'
          : 'grid-cols-4 gap-1.5 mb-3'
      }`}>
        <StatItem
          icon={<Route className={isExportVariant ? 'w-3 h-3' : isNarrowLayout ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.distance')}
          value={formatDistance(currentStats.distance, settings.unitSystem)}
          compact={isNarrowLayout}
          exportCompact={isExportVariant}
        />
        <StatItem
          icon={<Timer className={isExportVariant ? 'w-3 h-3' : isNarrowLayout ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.duration')}
          value={formatStatsDuration(currentStats.duration)}
          compact={isNarrowLayout}
          exportCompact={isExportVariant}
        />
        <StatItem
          icon={<Clock className={isExportVariant ? 'w-3 h-3' : isNarrowLayout ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.avgPace')}
          value={isInTransport ? '--' : formatPace(currentStats.averageSpeed, settings.unitSystem)}
          compact={isNarrowLayout}
          exportCompact={isExportVariant}
        />
        <StatItem
          icon={<Mountain className={isExportVariant ? 'w-3 h-3' : isNarrowLayout ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          label={t('stats.elev')}
          value={isInTransport ? '--' : formatElevation(currentStats.elevationGain, settings.unitSystem)}
          compact={isNarrowLayout}
          exportCompact={isExportVariant}
        />
      </div>

      {/* Secondary Stats */}
      {!isExportVariant && secondaryStats.length > 0 && (
        <div
          className={`grid gap-1.5 border-t border-[var(--evergreen)]/14 ${isNarrowLayout ? 'pt-2' : 'pt-3'}`}
          style={{ gridTemplateColumns: `repeat(${secondaryStats.length}, minmax(0, 1fr))` }}
        >
          {secondaryStats.map((stat) => (
            <SmallStatItem
              key={stat.key}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              unit={stat.unit}
              color={stat.color}
              compact={isNarrowLayout}
            />
          ))}
        </div>
      )}

      {/* Multi-segment indicator (show only if journey has multiple segments) */}
      {!isExportVariant && segmentTimings.length > 1 && (
        <div className={`border-t border-[var(--evergreen)]/14 flex items-center justify-center ${isNarrowLayout ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
          <span className={`text-[var(--evergreen-60)] bg-[var(--evergreen)]/8 px-2.5 py-1 rounded-full ${isNarrowLayout ? 'text-[9px]' : 'text-xs'}`}>
            {trackCount} {trackCount === 1 ? t('stats.trackSingle') : t('stats.trackPlural')}
            {transportCount > 0 && ` + ${transportCount} ${transportCount === 1 ? t('stats.transportSingle') : t('stats.transportPlural')}`}
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
  exportCompact?: boolean;
}

function StatItem({ icon, label, value, compact = false, exportCompact = false }: StatItemProps) {
  return (
    <div className={`min-w-0 rounded-[0.85rem] border border-[var(--evergreen)]/12 bg-white/55 text-center shadow-[0_1px_0_rgba(27,42,32,0.06)] ${
      exportCompact ? 'px-1.5 py-1.5' : compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
    }`}>
      <div className={`flex items-center justify-center min-w-0 ${
        exportCompact ? 'gap-1 mb-0.5' : compact ? 'gap-1 mb-1' : 'gap-1.5 mb-1.5'
      }`}>
        <span className={`flex items-center justify-center rounded-full bg-[var(--trail-orange-15)] text-[var(--trail-orange)] ${
          exportCompact ? 'w-4.5 h-4.5' : compact ? 'w-6 h-6' : 'w-7 h-7'
        }`}>
          {icon}
        </span>
        <span className={`block min-w-0 text-[var(--evergreen-80)] ${
          exportCompact ? 'text-[7px]' : compact ? 'text-[9px]' : 'text-[10px]'
        } font-semibold uppercase tracking-[0.08em] leading-[1.1]`}>
          {label}
        </span>
      </div>
      <div
        className={`tr-stat-value flex min-h-[1.2rem] items-center justify-center px-0.5 text-center font-semibold tabular-nums tracking-[-0.03em] ${
          exportCompact ? 'text-[9px] leading-[1.05]' : compact ? 'text-[11px] leading-[1.1]' : 'text-[12px] leading-[1.1]'
        }`}
        title={value}
      >
        {value}
      </div>
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
    <div className={`min-w-0 rounded-[0.85rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)]/55 text-center ${compact ? 'px-1.5 py-1.5' : 'px-2 py-2'}`}>
      <div className={`flex min-h-[1.2rem] items-center justify-center gap-0.5 text-[var(--evergreen-80)] ${compact ? 'mb-0.5 py-[1px]' : 'mb-1 py-[1px]'} ${color || ''}`}>
        <span className="opacity-85">{icon}</span>
      </div>
      <div
        className={`flex min-h-[1rem] items-center justify-center px-0.5 ${compact ? 'text-[8px]' : 'text-[9px]'} font-bold whitespace-nowrap leading-[1.15] min-w-0 ${color || 'text-[var(--evergreen)]'}`}
        title={unit ? `${value} ${unit}` : value}
      >
        {value}
        {unit && <span className={`${compact ? 'text-[7px]' : 'text-[8px]'} font-normal ml-0.5`}>{unit}</span>}
      </div>
      <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} text-[var(--evergreen-80)] uppercase font-semibold tracking-[0.08em] leading-[1.2] truncate`}>{label}</div>
    </div>
  );
}
