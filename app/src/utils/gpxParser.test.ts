import { describe, expect, it, vi } from 'vitest';
import {
  calculateHeartRateZones,
  getHeartRateColor,
  getPointAtDistance,
  parseGPX,
  parseGPXFiles,
  parseKML,
} from './gpxParser';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailReplay">
  <trk>
    <name>Sample GPX</name>
    <trkseg>
      <trkpt lat="42.0" lon="1.0">
        <ele>1000</ele>
        <time>2025-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="42.0005" lon="1.0005">
        <ele>1015</ele>
        <time>2025-01-01T10:05:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Sample KML</name>
    <LineString>
      <coordinates>
        1.0,42.0,1000 1.0005,42.0005,1015
      </coordinates>
    </LineString>
  </Placemark>
</kml>`;

describe('gpxParser', () => {
  it('parses GPX tracks into computed track stats', () => {
    const track = parseGPX(sampleGpx, 'sample.gpx');

    expect(track.name).toBe('Sample GPX');
    expect(track.points).toHaveLength(2);
    expect(track.totalDistance).toBeGreaterThan(0);
    expect(track.elevationGain).toBe(15);
    expect(track.totalTime).toBe(300);
  });

  it('parses KML LineStrings into tracks', () => {
    const track = parseKML(sampleKml, 'sample.kml');

    expect(track.name).toBe('Sample KML');
    expect(track.points).toHaveLength(2);
    expect(track.totalDistance).toBeGreaterThan(0);
    expect(track.elevationGain).toBe(15);
  });

  it('interpolates a point by distance along a track', () => {
    const track = parseGPX(sampleGpx, 'sample.gpx');
    const midpoint = getPointAtDistance(track, track.totalDistance / 2);

    expect(midpoint).not.toBeNull();
    expect(midpoint!.lat).toBeGreaterThan(track.points[0].lat);
    expect(midpoint!.lat).toBeLessThan(track.points[1].lat);
    expect(midpoint!.distance).toBeCloseTo(track.totalDistance / 2, 5);
  });

  it('skips invalid files when parsing batches and keeps valid GPX/KML tracks', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tracks = await parseGPXFiles([
      new File([sampleGpx], 'valid.gpx', { type: 'application/gpx+xml' }),
      new File([sampleKml], 'valid.kml', { type: 'application/vnd.google-earth.kml+xml' }),
      new File(['<gpx><trk>'], 'broken.gpx', { type: 'application/gpx+xml' }),
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    ]);

    expect(tracks).toHaveLength(2);
    expect(tracks.map((track) => track.name)).toEqual(['Sample GPX', 'Sample KML']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('derives heart-rate zones and colors deterministically', () => {
    const zones = calculateHeartRateZones(200);

    expect(zones.tempo).toMatchObject({
      min: 140,
      max: 160,
      color: '#fbbf24',
    });
    expect(getHeartRateColor(110, 200)).toBe('#4ade80');
    expect(getHeartRateColor(150, 200)).toBe('#fbbf24');
    expect(getHeartRateColor(195, 200)).toBe('#ef4444');
  });
});
