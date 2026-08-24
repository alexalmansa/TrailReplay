import { describe, expect, it } from 'vitest';
import { parseGPX } from '@/utils/gpxParser';
import { serializeTrackToGpx } from './serializeTrackToGpx';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailReplay" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>Ridge Loop</name>
    <trkseg>
      <trkpt lat="42.10000" lon="1.20000">
        <ele>1000</ele>
        <time>2025-01-01T10:00:00.000Z</time>
        <extensions>
          <gpxtpx:hr>120</gpxtpx:hr>
          <gpxtpx:cad>80</gpxtpx:cad>
          <power>210</power>
          <gpxtpx:atemp>18.5</gpxtpx:atemp>
        </extensions>
      </trkpt>
      <trkpt lat="42.10050" lon="1.20050">
        <ele>1015</ele>
        <time>2025-01-01T10:05:00.000Z</time>
        <extensions>
          <gpxtpx:hr>135</gpxtpx:hr>
          <gpxtpx:cad>82</gpxtpx:cad>
          <power>230</power>
          <gpxtpx:atemp>18.7</gpxtpx:atemp>
        </extensions>
      </trkpt>
      <trkpt lat="42.10100" lon="1.20100">
        <ele>1005</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('serializeTrackToGpx', () => {
  it('round-trips every field the app reads through the real parser', () => {
    const original = parseGPX(sampleGpx, 'ridge-loop.gpx');

    const serialized = serializeTrackToGpx(original);
    const reparsed = parseGPX(serialized, 'ridge-loop.gpx');

    expect(reparsed.name).toBe(original.name);
    expect(reparsed.points).toHaveLength(original.points.length);

    reparsed.points.forEach((point, index) => {
      const originalPoint = original.points[index];
      expect(point.lat).toBeCloseTo(originalPoint.lat, 6);
      expect(point.lon).toBeCloseTo(originalPoint.lon, 6);
      expect(point.elevation).toBeCloseTo(originalPoint.elevation, 6);
      expect(point.time?.getTime() ?? null).toBe(originalPoint.time?.getTime() ?? null);
      expect(point.heartRate).toBe(originalPoint.heartRate);
      expect(point.cadence).toBe(originalPoint.cadence);
      expect(point.power).toBe(originalPoint.power);
      expect(point.temperature).toBe(originalPoint.temperature);
    });

    expect(reparsed.totalDistance).toBeCloseTo(original.totalDistance, 6);
  });

  it('omits extensions and time when the source point has none of them', () => {
    const track = parseGPX(sampleGpx, 'ridge-loop.gpx');
    const serialized = serializeTrackToGpx(track);

    expect(serialized).not.toContain('<time></time>');
    const reparsed = parseGPX(serialized, 'ridge-loop.gpx');
    expect(reparsed.points[2].time).toBeNull();
    expect(reparsed.points[2].heartRate).toBeNull();
  });
});
