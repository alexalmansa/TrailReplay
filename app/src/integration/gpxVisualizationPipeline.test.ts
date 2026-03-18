import { describe, expect, it } from 'vitest';
import { createAppStore } from '@/store/createAppStore';
import { getPointAtDistance, parseGPXFiles } from '@/utils/gpxParser';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailReplay">
  <trk>
    <name>Pipeline Route</name>
    <trkseg>
      <trkpt lat="42.0" lon="1.0">
        <ele>1000</ele>
        <time>2025-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="42.0005" lon="1.0005">
        <ele>1010</ele>
        <time>2025-01-01T10:03:00Z</time>
      </trkpt>
      <trkpt lat="42.001" lon="1.001">
        <ele>1025</ele>
        <time>2025-01-01T10:06:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('GPX visualization pipeline', () => {
  it('parses a GPX file and seeds the visualization store end-to-end', async () => {
    const [track] = await parseGPXFiles([
      new File([sampleGpx], 'pipeline-route.gpx', { type: 'application/gpx+xml' }),
    ]);

    expect(track.name).toBe('Pipeline Route');
    expect(track.totalDistance).toBeGreaterThan(0);

    const midpoint = getPointAtDistance(track, track.totalDistance / 2);
    expect(midpoint).not.toBeNull();

    const useStore = createAppStore();
    useStore.getState().addTrack(track);
    useStore.getState().setVideoExportSettings({ fps: 60 });

    const state = useStore.getState();
    expect(state.tracks).toHaveLength(1);
    expect(state.activeTrackId).toBe(track.id);
    expect(state.journeySegments).toHaveLength(1);
    expect(state.settings.trailStyle.trailColor).toBe(track.color);
    expect(state.videoExportSettings.fps).toBe(60);
    expect(state.settings.mapStyle).toBe('esri-clarity');
  });
});
