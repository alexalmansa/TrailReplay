import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { formatDistance, formatPace, formatDuration, formatElevation } from '@/utils/units';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import {
  Route,
  Timer,
  Clock,
  Mountain,
  Heart,
  Zap,
  TrendingUp
} from 'lucide-react';

export function StatsOverlay() {
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);

  // Use computed journey for multi-track support
  const {
    currentPosition,
    currentSegment,
    isInTransport,
    totalDistance,
    segmentTimings,
    activeTrack,
  } = useComputedJourney();

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

    return {
      distance: distanceAtProgress, // in meters
      duration: realElapsedSeconds,
      averageSpeed: averageSpeedMps, // m/s for pace calculation
      currentSpeed: currentPosition.speed || 0, // km/h for transport display
      elevation: currentPosition.elevation || 0,
      heartRate: currentPosition.heartRate,
      cadence: currentPosition.cadence,
      power: currentPosition.power,
    };
  }, [currentPosition, playback.progress, totalDistance, segmentTimings, activeTrack, tracks]);

  // Get current track info
  const currentTrackInfo = useMemo(() => {
    if (!currentSegment) return null;

    if (currentSegment.segment.type === 'track' && currentSegment.segment.trackId) {
      const track = tracks.find((t) => t.id === currentSegment.segment.trackId);
      return {
        type: 'track' as const,
        name: track?.name || 'Track',
        color: track?.color || '#C1652F',
      };
    } else if (currentSegment.segment.type === 'transport') {
      const mode = currentSegment.segment.transportMode || 'car';
      const modeLabels: Record<string, string> = {
        car: 'Driving',
        bus: 'Bus',
        train: 'Train',
        plane: 'Flying',
        bike: 'Cycling',
        walk: 'Walking',
        ferry: 'Ferry',
      };
      return {
        type: 'transport' as const,
        name: modeLabels[mode] || 'Transport',
        mode,
        color: '#888888',
      };
    }

    return null;
  }, [currentSegment, tracks]);

  // Don't show if no data
  if (!currentStats || journeySegments.length === 0) return null;

  // Count segments
  const trackCount = segmentTimings.filter((s) => s.type === 'track').length;
  const transportCount = segmentTimings.filter((s) => s.type === 'transport').length;

  return (
    <div className="tr-stats-overlay max-w-md">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatItem
          icon={<Route className="w-4 h-4" />}
          label="Distance"
          value={formatDistance(currentStats.distance, settings.unitSystem)}
        />
        <StatItem
          icon={<Timer className="w-4 h-4" />}
          label="Duration"
          value={formatDuration(currentStats.duration)}
        />
        <StatItem
          icon={<Clock className="w-4 h-4" />}
          label="Avg Pace"
          value={isInTransport ? '--' : formatPace(currentStats.averageSpeed, settings.unitSystem)}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-[var(--evergreen)]/20">
        <SmallStatItem
          icon={<Mountain className="w-3 h-3" />}
          label="Elev"
          value={isInTransport ? '--' : formatElevation(currentStats.elevation, settings.unitSystem)}
        />

        {settings.showHeartRate && currentStats.heartRate && !isInTransport && (
          <SmallStatItem
            icon={<Heart className="w-3 h-3" />}
            label="HR"
            value={`${Math.round(currentStats.heartRate)}`}
            unit="bpm"
            color="text-red-500"
          />
        )}

        {currentStats.cadence && !isInTransport && (
          <SmallStatItem
            icon={<Zap className="w-3 h-3" />}
            label="Cadence"
            value={`${Math.round(currentStats.cadence)}`}
            unit="rpm"
          />
        )}

        {currentStats.power && !isInTransport && (
          <SmallStatItem
            icon={<TrendingUp className="w-3 h-3" />}
            label="Power"
            value={`${Math.round(currentStats.power)}`}
            unit="w"
          />
        )}
      </div>

      {/* Current Segment Info */}
      <div className="mt-4 pt-4 border-t border-[var(--evergreen)]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentTrackInfo?.type === 'transport' ? (
            <>
              <span className="text-lg">
                {TRANSPORT_ICONS[currentTrackInfo.mode || 'car']}
              </span>
              <span className="text-sm font-medium text-[var(--evergreen)]">
                {currentTrackInfo.name}
              </span>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentTrackInfo?.color || '#C1652F' }}
              />
              <span className="text-sm font-medium text-[var(--evergreen)] truncate max-w-[150px]">
                {currentTrackInfo?.name || 'Track'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {segmentTimings.length > 1 && (
            <span className="text-xs text-[var(--evergreen-60)] bg-[var(--evergreen)]/10 px-2 py-0.5 rounded">
              {trackCount} track{trackCount !== 1 ? 's' : ''}
              {transportCount > 0 && ` + ${transportCount} transport`}
            </span>
          )}
          <span className="text-xs text-[var(--evergreen-60)]">
            {(playback.progress * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[var(--evergreen-60)] mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="tr-stat-value text-lg">{value}</div>
    </div>
  );
}

interface SmallStatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}

function SmallStatItem({ icon, label, value, unit, color }: SmallStatItemProps) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-0.5 text-[var(--evergreen-60)] mb-0.5 ${color || ''}`}>
        {icon}
      </div>
      <div className={`text-sm font-bold ${color || 'text-[var(--evergreen)]'}`}>
        {value}
        {unit && <span className="text-[10px] font-normal ml-0.5">{unit}</span>}
      </div>
      <div className="text-[9px] text-[var(--evergreen-60)] uppercase">{label}</div>
    </div>
  );
}
