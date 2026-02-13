import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePlayback } from '@/hooks/usePlayback';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevation,
  formatPace,
} from '@/utils/units';
import {
  Mountain,
  Clock,
  Route,
  TrendingUp,
  TrendingDown,
  Gauge,
  Heart,
  Timer,
} from 'lucide-react';

interface StatsPanelProps {
  className?: string;
  compact?: boolean;
}

export function StatsPanel({ className = '', compact = false }: StatsPanelProps) {
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const settings = useAppStore((state) => state.settings);
  const { currentPosition } = usePlayback();
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  const stats = useMemo(() => {
    if (!activeTrack) return null;
    
    const current = currentPosition || activeTrack.points[0];
    
    return {
      totalDistance: activeTrack.totalDistance,
      currentDistance: current?.distance || 0,
      totalTime: activeTrack.totalTime,
      elevationGain: activeTrack.elevationGain,
      elevationLoss: activeTrack.elevationLoss,
      maxElevation: activeTrack.maxElevation,
      minElevation: activeTrack.minElevation,
      avgSpeed: activeTrack.avgSpeed,
      maxSpeed: activeTrack.maxSpeed,
      currentSpeed: current?.speed || 0,
      currentHeartRate: current?.heartRate || null,
    };
  }, [activeTrack, currentPosition]);
  
  if (!stats || !activeTrack) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <p className="text-gray-500 text-center">No track data available</p>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 ${className}`}>
        <div className="grid grid-cols-4 gap-3">
          <StatItemCompact
            icon={<Route className="w-4 h-4" />}
            label="Distance"
            value={formatDistance(stats.currentDistance, settings.unitSystem)}
            subValue={`/ ${formatDistance(stats.totalDistance, settings.unitSystem)}`}
          />
          <StatItemCompact
            icon={<Gauge className="w-4 h-4" />}
            label="Speed"
            value={formatSpeed(stats.currentSpeed / 3.6, settings.unitSystem)}
          />
          <StatItemCompact
            icon={<Mountain className="w-4 h-4" />}
            label="Elevation"
            value={formatElevation(currentPosition?.elevation || stats.minElevation, settings.unitSystem)}
          />
          {settings.showHeartRate && stats.currentHeartRate && (
            <StatItemCompact
              icon={<Heart className="w-4 h-4" />}
              label="Heart Rate"
              value={`${Math.round(stats.currentHeartRate)}`}
              subValue="bpm"
              color="text-red-500"
            />
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Route className="w-5 h-5 text-orange-500" />
        Track Statistics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatItem
          icon={<Route className="w-5 h-5" />}
          label="Total Distance"
          value={formatDistance(stats.totalDistance, settings.unitSystem)}
          color="text-blue-500"
        />
        
        <StatItem
          icon={<Clock className="w-5 h-5" />}
          label="Duration"
          value={formatDuration(stats.totalTime)}
          color="text-green-500"
        />
        
        <StatItem
          icon={<TrendingUp className="w-5 h-5" />}
          label="Elevation Gain"
          value={formatElevation(stats.elevationGain, settings.unitSystem)}
          color="text-orange-500"
        />
        
        <StatItem
          icon={<TrendingDown className="w-5 h-5" />}
          label="Elevation Loss"
          value={formatElevation(stats.elevationLoss, settings.unitSystem)}
          color="text-purple-500"
        />
        
        <StatItem
          icon={<Mountain className="w-5 h-5" />}
          label="Max Elevation"
          value={formatElevation(stats.maxElevation, settings.unitSystem)}
          color="text-teal-500"
        />
        
        <StatItem
          icon={<Gauge className="w-5 h-5" />}
          label="Avg Speed"
          value={formatSpeed(stats.avgSpeed / 3.6, settings.unitSystem)}
          color="text-indigo-500"
        />
        
        <StatItem
          icon={<Timer className="w-5 h-5" />}
          label="Avg Pace"
          value={formatPace(stats.avgSpeed / 3.6, settings.unitSystem)}
          color="text-pink-500"
        />
        
        <StatItem
          icon={<Gauge className="w-5 h-5" />}
          label="Max Speed"
          value={formatSpeed(stats.maxSpeed / 3.6, settings.unitSystem)}
          color="text-red-500"
        />
        
        {settings.showHeartRate && (
          <StatItem
            icon={<Heart className="w-5 h-5" />}
            label="Current HR"
            value={stats.currentHeartRate ? `${Math.round(stats.currentHeartRate)} bpm` : '--'}
            color="text-rose-500"
          />
        )}
      </div>
      
      {/* Live Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-600 mb-3">Live Position</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-lg font-semibold">
              {formatDistance(stats.currentDistance, settings.unitSystem)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Speed</p>
            <p className="text-lg font-semibold">
              {formatSpeed(stats.currentSpeed / 3.6, settings.unitSystem)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Elevation</p>
            <p className="text-lg font-semibold">
              {formatElevation(currentPosition?.elevation || stats.minElevation, settings.unitSystem)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

function StatItem({ icon, label, value, color = 'text-gray-600' }: StatItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`${color} mt-0.5`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

interface StatItemCompactProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}

function StatItemCompact({ icon, label, value, subValue, color = 'text-gray-600' }: StatItemCompactProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`${color} mb-1`}>{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold">
        {value}
        {subValue && <span className="text-xs text-gray-400 ml-0.5">{subValue}</span>}
      </p>
    </div>
  );
}
