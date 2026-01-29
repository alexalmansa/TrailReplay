import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getPointAtDistance } from '@/utils/gpxParser';
import { formatDistance, formatSpeed, formatDuration, formatElevation } from '@/utils/units';
import { 
  Route, 
  Timer, 
  Gauge, 
  Mountain, 
  TrendingUp, 
  Heart,
  Zap
} from 'lucide-react';

export function StatsOverlay() {
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  const currentStats = useMemo(() => {
    if (!activeTrack) return null;
    
    const progress = playback.progress;
    const targetDistance = activeTrack.totalDistance * progress;
    const currentPoint = getPointAtDistance(activeTrack, targetDistance);
    
    if (!currentPoint) return null;
    
    return {
      distance: currentPoint.distance,
      duration: activeTrack.totalTime * progress,
      speed: currentPoint.speed,
      elevation: currentPoint.elevation,
      heartRate: currentPoint.heartRate,
      cadence: currentPoint.cadence,
      power: currentPoint.power,
    };
  }, [activeTrack, playback.progress]);
  
  if (!activeTrack || !currentStats) return null;

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
          icon={<Gauge className="w-4 h-4" />}
          label="Speed"
          value={formatSpeed(currentStats.speed / 3.6, settings.unitSystem)}
        />
      </div>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-[var(--evergreen)]/20">
        <SmallStatItem
          icon={<Mountain className="w-3 h-3" />}
          label="Elev"
          value={formatElevation(currentStats.elevation, settings.unitSystem)}
        />
        
        {settings.showHeartRate && currentStats.heartRate && (
          <SmallStatItem
            icon={<Heart className="w-3 h-3" />}
            label="HR"
            value={`${Math.round(currentStats.heartRate)}`}
            unit="bpm"
            color="text-red-500"
          />
        )}
        
        {currentStats.cadence && (
          <SmallStatItem
            icon={<Zap className="w-3 h-3" />}
            label="Cadence"
            value={`${Math.round(currentStats.cadence)}`}
            unit="rpm"
          />
        )}
        
        {currentStats.power && (
          <SmallStatItem
            icon={<TrendingUp className="w-3 h-3" />}
            label="Power"
            value={`${Math.round(currentStats.power)}`}
            unit="w"
          />
        )}
      </div>
      
      {/* Track Info */}
      <div className="mt-4 pt-4 border-t border-[var(--evergreen)]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: activeTrack.color }}
          />
          <span className="text-sm font-medium text-[var(--evergreen)] truncate max-w-[150px]">
            {activeTrack.name}
          </span>
        </div>
        <span className="text-xs text-[var(--evergreen-60)]">
          {(playback.progress * 100).toFixed(1)}%
        </span>
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
