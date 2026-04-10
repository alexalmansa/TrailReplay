import { describe, expect, it } from 'vitest';
import { buildSegmentLineFeatures, TRANSPORT_SEGMENT_COLOR } from './trailColorFeatures';
import type { ColoredSegmentTiming } from './trailColorFeatures';

const segmentTimings: ColoredSegmentTiming[] = [
  {
    segmentIndex: 0,
    type: 'track',
    startCoordIndex: 0,
    endCoordIndex: 2,
    color: '#ff0000',
  },
  {
    segmentIndex: 1,
    type: 'track',
    startCoordIndex: 3,
    endCoordIndex: 5,
    color: '#0000ff',
  },
];

describe('buildSegmentLineFeatures', () => {
  it('builds one colored line feature per segment', () => {
    const features = buildSegmentLineFeatures({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 5],
      ],
      segmentTimings,
      fallbackColor: '#00ff00',
    });

    expect(features).toHaveLength(2);
    expect(features[0].properties.color).toBe('#ff0000');
    expect(features[1].properties.color).toBe('#0000ff');
  });

  it('extends the active segment with the interpolated current point', () => {
    const features = buildSegmentLineFeatures({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 5],
      ],
      segmentTimings,
      fallbackColor: '#00ff00',
      maxCoordIndex: 3,
      partialEndpoint: [3.5, 3.5],
      partialSegmentIndex: 1,
    });

    expect(features).toHaveLength(2);
    expect(features[1].geometry.coordinates.at(-1)).toEqual([3.5, 3.5]);
  });

  it('uses the transport fallback color for transport segments', () => {
    const features = buildSegmentLineFeatures({
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      segmentTimings: [
        {
          segmentIndex: 0,
          type: 'transport',
          startCoordIndex: 0,
          endCoordIndex: 1,
        },
      ],
      fallbackColor: '#00ff00',
    });

    expect(features[0].properties.color).toBe(TRANSPORT_SEGMENT_COLOR);
  });
});
