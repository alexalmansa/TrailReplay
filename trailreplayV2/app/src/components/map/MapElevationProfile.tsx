import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { convertElevation, convertDistance } from '@/utils/units';

interface MapElevationProfileProps {
  className?: string;
}

export function MapElevationProfile({ className = '' }: MapElevationProfileProps) {
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const animationPhase = useAppStore((state) => state.animationPhase);

  const activeTrack = tracks.find((t) => t.id === activeTrackId);

  // Generate elevation profile data
  const profileData = useMemo(() => {
    if (!activeTrack || activeTrack.points.length === 0) {
      return null;
    }

    const svgWidth = 800;
    const svgHeight = 60;
    const points = activeTrack.points;

    // Get elevation data
    const elevations = points.map((p) => p.elevation);
    const validElevations = elevations.filter((e) => e > 0);

    if (validElevations.length === 0) {
      return null;
    }

    const minElevation = Math.min(...validElevations);
    const maxElevation = Math.max(...validElevations);
    const elevationRange = maxElevation - minElevation;

    // Normalize elevations to SVG coordinates
    // Leave small padding at top and bottom
    const padding = 5;
    const chartHeight = svgHeight - padding * 2;

    const normalizedPoints = points.map((point, index) => {
      const x = (index / (points.length - 1)) * svgWidth;
      const elevation = point.elevation > 0 ? point.elevation : minElevation;
      const normalizedY = elevationRange > 0
        ? ((elevation - minElevation) / elevationRange) * chartHeight
        : chartHeight / 2;
      // SVG y is inverted (0 at top)
      const y = svgHeight - padding - normalizedY;
      return { x, y };
    });

    // Create path for elevation profile (filled area from bottom)
    let pathD = `M 0 ${svgHeight}`;
    normalizedPoints.forEach((point) => {
      pathD += ` L ${point.x} ${point.y}`;
    });
    pathD += ` L ${svgWidth} ${svgHeight} Z`;

    return {
      pathD,
      minElevation,
      maxElevation,
      svgWidth,
      svgHeight,
      normalizedPoints,
    };
  }, [activeTrack]);

  // Calculate progress path (filled area showing progress)
  const progressPathD = useMemo(() => {
    if (!profileData || playback.progress <= 0) {
      return '';
    }

    const { svgWidth, svgHeight, normalizedPoints } = profileData;
    const progressIndex = Math.floor(playback.progress * (normalizedPoints.length - 1));
    const progressX = playback.progress * svgWidth;

    let pathD = `M 0 ${svgHeight}`;

    // Add points up to current progress
    for (let i = 0; i <= progressIndex && i < normalizedPoints.length; i++) {
      pathD += ` L ${normalizedPoints[i].x} ${normalizedPoints[i].y}`;
    }

    // Interpolate to exact progress position if between points
    if (progressIndex < normalizedPoints.length - 1) {
      const currentPoint = normalizedPoints[progressIndex];
      const nextPoint = normalizedPoints[progressIndex + 1];
      const localProgress = (playback.progress * (normalizedPoints.length - 1)) - progressIndex;
      const interpolatedY = currentPoint.y + (nextPoint.y - currentPoint.y) * localProgress;
      pathD += ` L ${progressX} ${interpolatedY}`;
    }

    // Close the path
    pathD += ` L ${progressX} ${svgHeight} Z`;

    return pathD;
  }, [profileData, playback.progress]);

  // Calculate current stats at progress point
  const currentStats = useMemo(() => {
    if (!activeTrack || activeTrack.points.length === 0) {
      return { distance: 0, elevation: 0, elevationGain: 0 };
    }

    const currentIndex = Math.min(
      Math.floor(playback.progress * (activeTrack.points.length - 1)),
      activeTrack.points.length - 1
    );

    const currentPoint = activeTrack.points[currentIndex];
    const distance = currentPoint?.distance || 0;
    const elevation = currentPoint?.elevation || 0;

    // Calculate elevation gain up to current point
    let elevationGain = 0;
    let prevElevation = activeTrack.points[0]?.elevation || 0;
    for (let i = 1; i <= currentIndex; i++) {
      const currElev = activeTrack.points[i]?.elevation || 0;
      if (currElev > prevElevation) {
        elevationGain += currElev - prevElevation;
      }
      prevElevation = currElev;
    }

    return { distance, elevation, elevationGain };
  }, [activeTrack, playback.progress]);

  // Don't show during intro/outro animations
  const shouldShow = profileData && (animationPhase === 'idle' || animationPhase === 'playing');

  if (!shouldShow) {
    return null;
  }

  const { pathD, minElevation, maxElevation, svgWidth, svgHeight } = profileData;
  const elevUnit = settings.unitSystem === 'metric' ? 'm' : 'ft';
  const distUnit = settings.unitSystem === 'metric' ? 'km' : 'mi';

  const formattedDistance = convertDistance(currentStats.distance, settings.unitSystem).toFixed(1);
  const formattedElevGain = Math.round(convertElevation(currentStats.elevationGain, settings.unitSystem));
  const formattedCurrentElev = Math.round(convertElevation(currentStats.elevation, settings.unitSystem));

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-10 ${className}`}
      id="mapElevationProfile"
    >
      <div className="relative bg-[var(--canvas)]/90 backdrop-blur-sm border-t-2 border-[var(--evergreen)]">
        {/* Live Stats Row - shows during playback */}
        {(animationPhase === 'playing' || playback.progress > 0) && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--evergreen)]/20">
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--evergreen)]/60">D:</span>
                <span className="text-[var(--trail-orange)] font-bold">{formattedDistance} {distUnit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--evergreen)]/60">E:</span>
                <span className="text-[var(--trail-orange)] font-bold">+{formattedElevGain} {elevUnit}</span>
              </div>
            </div>
            {/* Current elevation badge */}
            <div className="bg-[var(--trail-orange)] text-[var(--canvas)] text-[10px] font-bold px-2 py-0.5 rounded">
              {formattedCurrentElev} {elevUnit}
            </div>
          </div>
        )}

        <div className="flex">
          {/* Elevation labels */}
          <div className="flex flex-col justify-between py-1 px-2 text-[10px] font-medium text-[var(--evergreen)] min-w-[45px]">
            <span>{Math.round(convertElevation(maxElevation, settings.unitSystem))} {elevUnit}</span>
            <span>{Math.round(convertElevation(minElevation, settings.unitSystem))} {elevUnit}</span>
          </div>

          {/* SVG Profile */}
          <div className="flex-1 pr-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="w-full h-[60px]"
              id="elevationProfileSvg"
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="mapElevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--evergreen)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="var(--evergreen)" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="mapProgressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--trail-orange)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--trail-orange)" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Background elevation profile */}
              <path
                d={pathD}
                fill="url(#mapElevationGradient)"
                stroke="var(--evergreen)"
                strokeWidth="1"
                strokeOpacity="0.4"
                id="elevationPath"
              />

              {/* Progress overlay */}
              {progressPathD && (
                <path
                  d={progressPathD}
                  fill="url(#mapProgressGradient)"
                  stroke="var(--trail-orange)"
                  strokeWidth="2"
                  id="progressPath"
                />
              )}

              {/* Current position marker line */}
              {playback.progress > 0 && (
                <line
                  x1={playback.progress * svgWidth}
                  y1="0"
                  x2={playback.progress * svgWidth}
                  y2={svgHeight}
                  stroke="var(--trail-orange)"
                  strokeWidth="2"
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
