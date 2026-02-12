import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { convertElevation } from '@/utils/units';

interface MapElevationProfileProps {
  className?: string;
}

export function MapElevationProfile({ className = '' }: MapElevationProfileProps) {
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
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
      return { x, y, elevation: point.elevation };
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
  const progressData = useMemo(() => {
    if (!profileData || playback.progress <= 0) {
      return { pathD: '', currentElevation: 0, markerX: 0, markerY: 0 };
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
    let markerY = svgHeight;
    let currentElevation = 0;

    if (progressIndex < normalizedPoints.length - 1) {
      const currentPoint = normalizedPoints[progressIndex];
      const nextPoint = normalizedPoints[progressIndex + 1];
      const localProgress = (playback.progress * (normalizedPoints.length - 1)) - progressIndex;
      const interpolatedY = currentPoint.y + (nextPoint.y - currentPoint.y) * localProgress;
      pathD += ` L ${progressX} ${interpolatedY}`;
      markerY = interpolatedY;
      currentElevation = currentPoint.elevation + (nextPoint.elevation - currentPoint.elevation) * localProgress;
    } else if (progressIndex < normalizedPoints.length) {
      markerY = normalizedPoints[progressIndex].y;
      currentElevation = normalizedPoints[progressIndex].elevation;
    }

    // Close the path
    pathD += ` L ${progressX} ${svgHeight} Z`;

    return { pathD, currentElevation, markerX: progressX, markerY };
  }, [profileData, playback.progress]);

  // Don't show during intro/outro animations
  const shouldShow = profileData && (animationPhase === 'idle' || animationPhase === 'playing');

  if (!shouldShow) {
    return null;
  }

  const { pathD, svgWidth, svgHeight } = profileData;
  const { pathD: progressPathD, currentElevation, markerX } = progressData;
  const elevUnit = settings.unitSystem === 'metric' ? 'm' : 'ft';
  const trailColor = trailStyle.trailColor;

  const formattedCurrentElev = Math.round(convertElevation(currentElevation, settings.unitSystem));

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 ${className}`}
      id="mapElevationProfile"
    >
      <div className="relative">
        {/* SVG Profile */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-[60px]"
          id="elevationProfileSvg"
        >
          {/* Gradient definitions - using trail color */}
          <defs>
            <linearGradient id="mapElevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={trailColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={trailColor} stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="mapProgressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={trailColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={trailColor} stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Background elevation profile */}
          <path
            d={pathD}
            fill="url(#mapElevationGradient)"
            stroke={trailColor}
            strokeWidth="1"
            strokeOpacity="0.3"
            id="elevationPath"
          />

          {/* Progress overlay */}
          {progressPathD && (
            <path
              d={progressPathD}
              fill="url(#mapProgressGradient)"
              stroke={trailColor}
              strokeWidth="2"
              id="progressPath"
            />
          )}
        </svg>

        {/* Current elevation label - follows the progress, aligned to bottom */}
        {playback.progress > 0 && (
          <div
            className="absolute bottom-1 transform -translate-x-1/2 text-[var(--canvas)] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              left: `${(markerX / svgWidth) * 100}%`,
              backgroundColor: trailColor,
            }}
          >
            {formattedCurrentElev} {elevUnit}
          </div>
        )}
      </div>
    </div>
  );
}
