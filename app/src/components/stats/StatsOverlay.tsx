import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { formatDistance, formatPace, formatStatsDuration, formatElevation, formatSpeedFromKmh } from '@/utils/units';
import { useI18n } from '@/i18n/useI18n';
import type { StatId } from '@/types';
import {
  Route,
  Timer,
  Clock,
  Mountain,
  Heart,
  Zap,
  ArrowUp,
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

  const {
    currentPosition,
    isInTransport,
    totalDistance,
    segmentTimings,
    activeTrack,
    computedJourney,
  } = useComputedJourney();

  const calculateElevationGainFromPoints = (points: Array<{ elevation: number }>, upToIndex: number): number => {
    if (upToIndex <= 0 || points.length === 0) return 0;
    let elevationGain = 0;
    const endIndex = Math.min(upToIndex, points.length - 1);
    for (let i = 1; i <= endIndex; i++) {
      const elevationDiff = points[i].elevation - points[i - 1].elevation;
      if (elevationDiff > 0) elevationGain += elevationDiff;
    }
    return elevationGain;
  };

  const computeRealElapsedAtProgress = useMemo(() => {
    return (progress: number): number => {
      if (segmentTimings.length > 0) {
        let elapsed = 0;
        for (const timing of segmentTimings) {
          if (timing.type !== 'track' || !timing.trackId) continue;
          const track = tracks.find((t) => t.id === timing.trackId);
          if (!track) continue;
          const trackRealTime = track.movingTime || track.totalTime;
          if (progress >= timing.progressEndRatio) {
            elapsed += trackRealTime;
          } else if (progress > timing.progressStartRatio) {
            const segmentSpan = timing.progressEndRatio - timing.progressStartRatio;
            const localProgress = segmentSpan > 0
              ? (progress - timing.progressStartRatio) / segmentSpan
              : 0;
            elapsed += trackRealTime * localProgress;
          }
        }
        return elapsed;
      } else if (activeTrack) {
        return (activeTrack.movingTime || activeTrack.totalTime) * progress;
      }
      return 0;
    };
  }, [segmentTimings, tracks, activeTrack]);

  const currentStats = useMemo(() => {
    if (!currentPosition) return null;

    // Accurate current journey distance from actual interpolated position
    let distanceAtProgress = totalDistance * playback.progress;
    if (currentPosition) {
      if (segmentTimings.length > 0) {
        const posTiming = segmentTimings.find((t) => t.segmentIndex === currentPosition.segmentIndex);
        if (posTiming) distanceAtProgress = posTiming.startDistance + (currentPosition.distance ?? 0);
      } else {
        distanceAtProgress = currentPosition.distance ?? distanceAtProgress;
      }
    }

    const realElapsedSeconds = computeRealElapsedAtProgress(playback.progress);
    const averageSpeedMps = realElapsedSeconds > 0 ? distanceAtProgress / realElapsedSeconds : 0;

    // Per-km pace: pace for the last *completed* km using GPS timestamps (only updates at km boundaries)
    const completedKms = Math.floor(distanceAtProgress / 1000);
    let perKmSpeedMps = 0; // shows '--:--' until first km completes
    if (completedKms >= 1) {
      const kmStartDist = (completedKms - 1) * 1000;
      const kmEndDist = completedKms * 1000;

      // Find the coordinate nearest to a journey-cumulative distance via binary search
      const findCoordAt = (targetMeters: number) => {
        if (computedJourney && segmentTimings.length > 0) {
          for (const t of segmentTimings) {
            if (targetMeters >= t.startDistance && targetMeters <= t.endDistance) {
              const seg = computedJourney.coordinates.slice(t.startCoordIndex, t.endCoordIndex + 1);
              const local = targetMeters - t.startDistance;
              let lo = 0, hi = seg.length - 1;
              while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if ((seg[mid].distance ?? 0) < local) lo = mid + 1;
                else hi = mid;
              }
              return seg[lo] ?? null;
            }
          }
        } else if (activeTrack) {
          const pts = activeTrack.points;
          let lo = 0, hi = pts.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (pts[mid].distance < targetMeters) lo = mid + 1;
            else hi = mid;
          }
          return pts[lo] ?? null;
        }
        return null;
      };

      const startCoord = findCoordAt(kmStartDist);
      const endCoord = findCoordAt(kmEndDist);
      if (startCoord?.time && endCoord?.time) {
        const elapsed = (endCoord.time.getTime() - startCoord.time.getTime()) / 1000;
        if (elapsed > 0) perKmSpeedMps = 1000 / elapsed;
      }
    }

    let cumulativeElevationGain = 0;
    if (computedJourney && segmentTimings.length > 0) {
      for (const timing of segmentTimings) {
        if (timing.type !== 'track') continue;
        if (playback.progress >= timing.progressEndRatio) {
          const segmentCoords = computedJourney.coordinates.slice(timing.startCoordIndex, timing.endCoordIndex + 1);
          cumulativeElevationGain += calculateElevationGainFromPoints(segmentCoords, segmentCoords.length - 1);
        } else if (playback.progress > timing.progressStartRatio) {
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
      const targetDistance = activeTrack.totalDistance * playback.progress;
      let currentPointIndex = 0;
      for (let i = 0; i < activeTrack.points.length; i++) {
        if (activeTrack.points[i].distance >= targetDistance) { currentPointIndex = i; break; }
        currentPointIndex = i;
      }
      cumulativeElevationGain = calculateElevationGainFromPoints(activeTrack.points, currentPointIndex);
    }

    return {
      distance: distanceAtProgress,
      duration: realElapsedSeconds,
      averageSpeed: averageSpeedMps,
      rollingSpeed: perKmSpeedMps,
      currentSpeed: currentPosition.speed || 0,
      elevationGain: cumulativeElevationGain,
      altitude: currentPosition.elevation ?? null,
      heartRate: currentPosition.heartRate,
    };
  }, [currentPosition, playback, totalDistance, computeRealElapsedAtProgress, segmentTimings, activeTrack, computedJourney]);

  if (!currentStats || journeySegments.length === 0) return null;

  const iconCls = isExportVariant ? 'w-3 h-3 text-white' : isNarrowLayout ? 'w-3.5 h-3.5 text-white' : 'w-4 h-4 text-white';

  const ALL_STATS: Array<{ id: StatId; icon: React.ReactNode; label: string; value: string | null }> = [
    {
      id: 'duration',
      icon: <Timer className={iconCls} />,
      label: t('stats.duration'),
      value: formatStatsDuration(currentStats.duration),
    },
    {
      id: 'distance',
      icon: <Route className={iconCls} />,
      label: t('stats.distance'),
      value: formatDistance(currentStats.distance, settings.unitSystem),
    },
    {
      id: 'pace',
      icon: <Clock className={iconCls} />,
      label: settings.paceMode === 'per-km' ? t('stats.pace') : t('stats.avgPace'),
      value: isInTransport ? '--' : formatPace(
        settings.paceMode === 'per-km' ? currentStats.rollingSpeed : currentStats.averageSpeed,
        settings.unitSystem,
      ),
    },
    {
      id: 'elevation',
      icon: <Mountain className={iconCls} />,
      label: t('stats.elev'),
      value: isInTransport ? '--' : formatElevation(currentStats.elevationGain, settings.unitSystem),
    },
    {
      id: 'speed',
      icon: <Zap className={iconCls} />,
      label: t('stats.speed'),
      value: formatSpeedFromKmh(currentStats.currentSpeed, settings.unitSystem),
    },
    {
      id: 'altitude',
      icon: <ArrowUp className={iconCls} />,
      label: t('stats.altitude'),
      value: currentStats.altitude != null ? formatElevation(currentStats.altitude, settings.unitSystem) : '--',
    },
    {
      id: 'heartRate',
      icon: <Heart className={iconCls} />,
      label: t('stats.heartRateShort'),
      value: currentStats.heartRate ? `${Math.round(currentStats.heartRate)} ${t('stats.bpm')}` : null,
    },
  ];

  const visibleStats = ALL_STATS.filter(
    (s) => settings.visibleStats.includes(s.id) && s.value !== null,
  );

  if (visibleStats.length === 0) return null;

  const cols = isExportVariant || isNarrowLayout
    ? Math.min(visibleStats.length, 2)
    : Math.min(visibleStats.length, 4);

  const trackCount = segmentTimings.filter((s) => s.type === 'track').length;
  const transportCount = segmentTimings.filter((s) => s.type === 'transport').length;

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
      <div
        className={`grid ${isExportVariant || isNarrowLayout ? 'gap-x-1.5 gap-y-1.5 mb-0' : 'gap-2 mb-0'}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {visibleStats.map((stat) => (
          <StatItem
            key={stat.id}
            icon={stat.icon}
            label={stat.label}
            value={stat.value!}
            compact={isNarrowLayout}
            exportCompact={isExportVariant}
          />
        ))}
      </div>

      {!isExportVariant && segmentTimings.length > 1 && (
        <div className={`flex items-center justify-center ${isNarrowLayout ? 'mt-2' : 'mt-3'}`}>
          <span className={`text-white bg-white/10 px-2.5 py-1 rounded-full ${isNarrowLayout ? 'text-[9px]' : 'text-xs'}`}>
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
    <div className={`min-w-0 text-center ${exportCompact ? 'px-0.5 py-0.5' : compact ? 'px-1 py-0.5' : 'px-1 py-0.5'}`}>
      <div className={`flex items-center justify-center min-w-0 ${
        exportCompact ? 'gap-1 mb-0.5' : compact ? 'gap-1 mb-1' : 'gap-1.5 mb-1.5'
      }`}>
        <span className={`flex items-center justify-center ${
          exportCompact ? 'text-white/95 w-4.5 h-4.5' : `text-white/92 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`
        }`}>
          {icon}
        </span>
        <span className={`block min-w-0 ${
          exportCompact ? 'text-[7px] text-white' : compact ? 'text-[9px] text-white' : 'text-[10px] text-white'
        } font-semibold uppercase tracking-[0.08em] leading-[1.1]`}>
          {label}
        </span>
      </div>
      <div
        className={`tr-stat-value flex min-h-[1.2rem] items-center justify-center px-0.5 text-center font-semibold tabular-nums tracking-[-0.03em] ${
          exportCompact ? 'text-[9px] leading-[1.05] text-white' : compact ? 'text-[11px] leading-[1.1]' : 'text-[12px] leading-[1.1]'
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
