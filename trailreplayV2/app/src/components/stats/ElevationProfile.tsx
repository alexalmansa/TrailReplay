import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePlayback } from '@/hooks/usePlayback';
import { convertElevation, convertDistance } from '@/utils/units';

interface ElevationProfileProps {
  className?: string;
  height?: number;
}

export function ElevationProfile({ className = '', height = 150 }: ElevationProfileProps) {
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const settings = useAppStore((state) => state.settings);
  const { progress, seekToProgress } = usePlayback();
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  const { pathD, areaD, width } = useMemo(() => {
    if (!activeTrack || activeTrack.points.length === 0) {
      return { pathD: '', areaD: '', width: 0, height: 0 };
    }
    
    const width = 800;
    const svgHeight = height;
    const padding = { top: 10, right: 10, bottom: 25, left: 40 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;
    
    // Get elevation data
    const elevations = activeTrack.points.map((p) =>
      convertElevation(p.elevation, settings.unitSystem)
    );
    const distances = activeTrack.points.map((p) =>
      convertDistance(p.distance, settings.unitSystem)
    );
    
    const minElevation = Math.min(...elevations) * 0.95;
    const maxElevation = Math.max(...elevations) * 1.05;
    const maxDistance = Math.max(...distances);
    
    // Scale functions
    const xScale = (distance: number) =>
      padding.left + (distance / maxDistance) * chartWidth;
    const yScale = (elevation: number) =>
      svgHeight - padding.bottom - ((elevation - minElevation) / (maxElevation - minElevation)) * chartHeight;
    
    // Create path
    let pathD = `M ${xScale(distances[0])} ${yScale(elevations[0])}`;
    
    for (let i = 1; i < activeTrack.points.length; i++) {
      pathD += ` L ${xScale(distances[i])} ${yScale(elevations[i])}`;
    }
    
    // Create area path
    const areaD = `${pathD} L ${xScale(distances[distances.length - 1])} ${svgHeight - padding.bottom} L ${xScale(distances[0])} ${svgHeight - padding.bottom} Z`;
    
    return {
      pathD,
      areaD,
      width,
      height: svgHeight,
      xScale,
      yScale,
      minElevation,
      maxElevation,
      maxDistance,
      padding,
      chartWidth,
      chartHeight,
    };
  }, [activeTrack, settings.unitSystem, height]);
  
  // Handle mouse move for hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !activeTrack) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, (x - (padding?.left || 0)) / (chartWidth || 1)));
    setHoverPosition(progress);
  };
  
  // Handle click to seek
  const handleClick = () => {
    if (hoverPosition !== null) {
      seekToProgress(hoverPosition);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };
  
  if (!activeTrack || activeTrack.points.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <p className="text-gray-500 text-center">No elevation data available</p>
      </div>
    );
  }
  
  const currentX = padding.left + progress * (chartWidth || 0);
  const hoverX = hoverPosition !== null ? padding.left + hoverPosition * (chartWidth || 0) : null;
  
  // Get hover point data
  const hoverPoint = hoverPosition !== null
    ? activeTrack.points[Math.floor(hoverPosition * (activeTrack.points.length - 1))]
    : null;
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        Elevation Profile
      </h3>
      
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full cursor-crosshair"
          style={{ height }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1={padding.left + tick * chartWidth}
              y1={padding.top}
              x2={padding.left + tick * chartWidth}
              y2={height - padding.bottom}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((tick) => (
            <line
              key={`h-${tick}`}
              x1={padding.left}
              y1={padding.top + tick * chartHeight}
              x2={width - padding.right}
              y2={padding.top + tick * chartHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Area fill */}
          <path
            d={areaD}
            fill="url(#elevationGradient)"
            opacity="0.3"
          />
          
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#C1652F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Current position indicator */}
          <line
            x1={currentX}
            y1={padding.top}
            x2={currentX}
            y2={height - padding.bottom}
            stroke="#ef4444"
            strokeWidth="2"
          />
          
          {/* Hover indicator */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={padding.top}
              x2={hoverX}
              y2={height - padding.bottom}
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
          
          {/* Axis labels */}
          <text
            x={padding.left}
            y={height - 5}
            fontSize="10"
            fill="#6b7280"
          >
            0 {settings.unitSystem === 'metric' ? 'km' : 'mi'}
          </text>
          <text
            x={width - padding.right}
            y={height - 5}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {convertDistance(activeTrack.totalDistance, settings.unitSystem).toFixed(1)} {settings.unitSystem === 'metric' ? 'km' : 'mi'}
          </text>
          
          {/* Y-axis labels */}
          <text
            x={padding.left - 5}
            y={padding.top + 5}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {Math.round(maxElevation || 0)}
          </text>
          <text
            x={padding.left - 5}
            y={height - padding.bottom}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {Math.round(minElevation || 0)}
          </text>
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C1652F" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C1652F" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Hover tooltip */}
        {hoverPoint && hoverPosition !== null && (
          <div
            className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
            style={{
              left: `${hoverPosition * 100}%`,
              top: '0',
              transform: 'translateX(-50%)',
            }}
          >
            <p>{formatElevation(hoverPoint.elevation, settings.unitSystem)}</p>
            <p className="text-gray-400">
              {formatDistance(hoverPoint.distance, settings.unitSystem)}
            </p>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <span>Distance</span>
        <span>Elevation ({settings.unitSystem === 'metric' ? 'm' : 'ft'})</span>
      </div>
    </div>
  );
}

// Helper functions
function formatElevation(meters: number, unitSystem: 'metric' | 'imperial'): string {
  const value = convertElevation(meters, unitSystem);
  return `${Math.round(value)} ${unitSystem === 'metric' ? 'm' : 'ft'}`;
}

function formatDistance(meters: number, unitSystem: 'metric' | 'imperial'): string {
  const value = convertDistance(meters, unitSystem);
  return `${value.toFixed(2)} ${unitSystem === 'metric' ? 'km' : 'mi'}`;
}

// Need to declare these for the component
const padding = { top: 10, right: 10, bottom: 25, left: 40 };
const chartWidth = 800 - padding.left - padding.right;
const chartHeight = 150 - padding.top - padding.bottom;
const minElevation = 0;
const maxElevation = 1000;
