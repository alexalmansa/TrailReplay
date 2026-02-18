import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { convertElevation } from '@/utils/units';

interface MapElevationProfileProps {
  className?: string;
}

export function MapElevationProfile({ className = '' }: MapElevationProfileProps) {
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const tracks = useAppStore((state) => state.tracks);

  // Use computed journey for multi-track support
  const {
    elevationData,
    segmentTimings,
    currentTrackColor,
    isInTransport,
    currentSegment,
  } = useComputedJourney();

  // Generate elevation profile data
  const profileData = useMemo(() => {
    if (elevationData.length === 0) {
      return null;
    }

    const svgWidth = 800;
    const svgHeight = 60;

    // Get elevation data, filtering out transport segments for elevation calculation
    const trackElevations = elevationData
      .filter((d) => d.segmentType === 'track')
      .map((d) => d.elevation);

    const validElevations = trackElevations.filter((e) => e > 0);

    if (validElevations.length === 0) {
      return null;
    }

    const minElevation = Math.min(...validElevations);
    const maxElevation = Math.max(...validElevations);
    const elevationRange = maxElevation - minElevation;

    // Normalize elevations to SVG coordinates
    const padding = 5;
    const chartHeight = svgHeight - padding * 2;

    const normalizedPoints = elevationData.map((point) => {
      const x = point.progress * svgWidth;
      // For transport segments, use min elevation
      const elevation = point.segmentType === 'transport' ? minElevation : (point.elevation > 0 ? point.elevation : minElevation);
      const normalizedY = elevationRange > 0
        ? ((elevation - minElevation) / elevationRange) * chartHeight
        : chartHeight / 2;
      // SVG y is inverted (0 at top)
      const y = svgHeight - padding - normalizedY;
      return {
        x,
        y,
        elevation: point.elevation,
        segmentIndex: point.segmentIndex,
        segmentType: point.segmentType,
        progress: point.progress,
      };
    });

    // Create path for elevation profile (filled area from bottom)
    let pathD = `M 0 ${svgHeight}`;
    normalizedPoints.forEach((point) => {
      pathD += ` L ${point.x} ${point.y}`;
    });
    pathD += ` L ${svgWidth} ${svgHeight} Z`;

    // Create segment paths with different colors
    const segmentPaths: Array<{
      pathD: string;
      color: string;
      segmentIndex: number;
      type: 'track' | 'transport';
    }> = [];

    segmentTimings.forEach((timing) => {
      const segmentPoints = normalizedPoints.filter(
        (p) => p.progress >= timing.progressStartRatio && p.progress <= timing.progressEndRatio
      );

      if (segmentPoints.length > 1) {
        let segPathD = `M ${segmentPoints[0].x} ${svgHeight}`;
        segmentPoints.forEach((point) => {
          segPathD += ` L ${point.x} ${point.y}`;
        });
        segPathD += ` L ${segmentPoints[segmentPoints.length - 1].x} ${svgHeight} Z`;

        // Get track color for this segment
        let color = trailStyle.trailColor;
        if (timing.type === 'track' && timing.trackId) {
          const track = tracks.find((t) => t.id === timing.trackId);
          if (track?.color) {
            color = track.color;
          }
        } else if (timing.type === 'transport') {
          color = '#888888'; // Gray for transport
        }

        segmentPaths.push({
          pathD: segPathD,
          color,
          segmentIndex: timing.segmentIndex,
          type: timing.type,
        });
      }
    });

    return {
      pathD,
      minElevation,
      maxElevation,
      svgWidth,
      svgHeight,
      normalizedPoints,
      segmentPaths,
    };
  }, [elevationData, segmentTimings, trailStyle.trailColor, tracks]);

  // Calculate progress path (filled area showing progress)
  const progressData = useMemo(() => {
    if (!profileData || playback.progress <= 0) {
      return { pathD: '', currentElevation: 0, markerX: 0, markerY: 0, currentColor: trailStyle.trailColor };
    }

    const { svgWidth, svgHeight, normalizedPoints } = profileData;
    const progressIndex = Math.floor(playback.progress * (normalizedPoints.length - 1));
    const progressX = playback.progress * svgWidth;

    // Find the current segment's color
    let currentColor = currentTrackColor || trailStyle.trailColor;
    if (isInTransport) {
      currentColor = '#888888';
    }

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

    return { pathD, currentElevation, markerX: progressX, markerY, currentColor };
  }, [profileData, playback.progress, currentTrackColor, trailStyle.trailColor, isInTransport]);

  // Don't show during intro/outro animations
  const shouldShow = profileData && (animationPhase === 'idle' || animationPhase === 'playing');

  if (!shouldShow) {
    return null;
  }

  const { svgWidth, svgHeight, segmentPaths } = profileData;
  const { pathD: progressPathD, currentElevation, markerX, currentColor } = progressData;
  const elevUnit = settings.unitSystem === 'metric' ? 'm' : 'ft';

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
          {/* Gradient definitions for segments */}
          <defs>
            {segmentPaths.map((seg) => (
              <linearGradient
                key={`gradient-${seg.segmentIndex}`}
                id={`segmentGradient-${seg.segmentIndex}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={seg.color} stopOpacity={seg.type === 'transport' ? '0.2' : '0.3'} />
                <stop offset="100%" stopColor={seg.color} stopOpacity={seg.type === 'transport' ? '0.05' : '0.1'} />
              </linearGradient>
            ))}
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={currentColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={currentColor} stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Background elevation profiles for each segment */}
          {segmentPaths.map((seg) => (
            <path
              key={`segment-${seg.segmentIndex}`}
              d={seg.pathD}
              fill={`url(#segmentGradient-${seg.segmentIndex})`}
              stroke={seg.color}
              strokeWidth="1"
              strokeOpacity={seg.type === 'transport' ? '0.3' : '0.5'}
              strokeDasharray={seg.type === 'transport' ? '4,4' : 'none'}
              id={`segmentPath-${seg.segmentIndex}`}
            />
          ))}

          {/* Progress overlay */}
          {progressPathD && (
            <path
              d={progressPathD}
              fill="url(#progressGradient)"
              stroke={currentColor}
              strokeWidth="2"
              id="progressPath"
            />
          )}

          {/* Segment boundaries (vertical lines) */}
          {segmentTimings.length > 1 && segmentTimings.slice(1).map((timing, i) => (
            <line
              key={`boundary-${i}`}
              x1={timing.progressStartRatio * svgWidth}
              y1="0"
              x2={timing.progressStartRatio * svgWidth}
              y2={svgHeight}
              stroke="white"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          ))}
        </svg>

        {/* Current elevation label - follows the progress, aligned to bottom */}
        {playback.progress > 0 && (
          <div
            className="absolute bottom-1 transform -translate-x-1/2 text-[var(--canvas)] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              left: `${(markerX / svgWidth) * 100}%`,
              backgroundColor: currentColor,
            }}
          >
            {isInTransport ? (
              <span className="flex items-center gap-1">
                {currentSegment?.segment.transportMode === 'car' && '🚗'}
                {currentSegment?.segment.transportMode === 'bus' && '🚌'}
                {currentSegment?.segment.transportMode === 'train' && '🚆'}
                {currentSegment?.segment.transportMode === 'plane' && '✈️'}
                {currentSegment?.segment.transportMode === 'bike' && '🚲'}
                {currentSegment?.segment.transportMode === 'walk' && '🚶'}
                {currentSegment?.segment.transportMode === 'ferry' && '⛴️'}
              </span>
            ) : (
              <>{formattedCurrentElev} {elevUnit}</>
            )}
          </div>
        )}

        {/* Segment labels (small indicators at top) */}
        {segmentTimings.length > 1 && (
          <div className="absolute top-0 left-0 right-0 flex">
            {segmentTimings.map((timing, i) => {
              const width = (timing.progressEndRatio - timing.progressStartRatio) * 100;
              const left = timing.progressStartRatio * 100;
              const track = timing.trackId ? tracks.find((t) => t.id === timing.trackId) : null;

              return (
                <div
                  key={`label-${i}`}
                  className="absolute h-1 rounded-full opacity-60"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: timing.type === 'transport' ? '#888888' : (track?.color || trailStyle.trailColor),
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
