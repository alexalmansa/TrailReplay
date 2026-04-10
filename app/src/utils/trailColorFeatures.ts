import type { Feature, LineString } from 'geojson';
export const TRANSPORT_SEGMENT_COLOR = '#888888';

type ColoredLineFeature = Feature<LineString, { color: string }>;
export type ColoredSegmentTiming = {
  segmentIndex: number;
  type: 'track' | 'transport';
  startCoordIndex: number;
  endCoordIndex: number;
  color?: string;
};

function pointsMatch(a: number[] | undefined, b: number[] | undefined) {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

function getSegmentColor(segment: Pick<ColoredSegmentTiming, 'type' | 'color'>, fallbackColor: string) {
  if (segment.type === 'transport') {
    return TRANSPORT_SEGMENT_COLOR;
  }

  return segment.color || fallbackColor;
}

export function buildSegmentLineFeatures(params: {
  coordinates: number[][];
  segmentTimings: readonly ColoredSegmentTiming[];
  fallbackColor: string;
  maxCoordIndex?: number;
  partialEndpoint?: [number, number] | null;
  partialSegmentIndex?: number | null;
}): ColoredLineFeature[] {
  const {
    coordinates,
    segmentTimings,
    fallbackColor,
    maxCoordIndex = coordinates.length - 1,
    partialEndpoint = null,
    partialSegmentIndex = null,
  } = params;

  if (coordinates.length < 2 || segmentTimings.length === 0 || maxCoordIndex < 0) {
    return [];
  }

  const features: ColoredLineFeature[] = [];

  segmentTimings.forEach((segment) => {
    if (segment.startCoordIndex > maxCoordIndex) {
      return;
    }

    const endCoordIndex = Math.min(segment.endCoordIndex, maxCoordIndex);
    const segmentCoordinates = coordinates.slice(segment.startCoordIndex, endCoordIndex + 1);
    const shouldAppendPartialPoint = partialEndpoint && partialSegmentIndex === segment.segmentIndex;

    if (shouldAppendPartialPoint && !pointsMatch(segmentCoordinates[segmentCoordinates.length - 1], partialEndpoint)) {
      segmentCoordinates.push(partialEndpoint);
    }

    if (segmentCoordinates.length < 2) {
      return;
    }

    features.push({
      type: 'Feature',
      properties: { color: getSegmentColor(segment, fallbackColor) },
      geometry: {
        type: 'LineString',
        coordinates: segmentCoordinates,
      },
    });
  });

  return features;
}
