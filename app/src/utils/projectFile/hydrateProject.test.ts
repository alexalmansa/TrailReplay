import { describe, expect, it } from 'vitest';
import { createAppStore } from '@/store/createAppStore';
import { parseGPX } from '@/utils/gpxParser';
import { buildReplayArchive } from './buildReplayArchive';
import { parseReplayArchive } from './parseReplayArchive';
import { hydrateProject } from './hydrateProject';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailReplay">
  <trk>
    <name>Ridge Loop</name>
    <trkseg>
      <trkpt lat="42.10000" lon="1.20000"><ele>1000</ele></trkpt>
      <trkpt lat="42.10050" lon="1.20050"><ele>1015</ele></trkpt>
      <trkpt lat="42.10100" lon="1.20100"><ele>1005</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('hydrateProject', () => {
  it('restores tracks, journey, pictures (as placeholders), and settings from a saved archive', async () => {
    const sourceStore = createAppStore();
    const track = parseGPX(sampleGpx, 'ridge-loop.gpx');
    sourceStore.getState().addTrack(track);
    sourceStore.getState().updateJourneySegmentDuration(
      sourceStore.getState().journeySegments[0].id,
      45000,
    );
    sourceStore.getState().addPicture({
      id: 'picture-1',
      file: new File(['image'], 'summit.jpg', { type: 'image/jpeg' }),
      url: 'blob:summit',
      isPlaceholder: false,
      progress: 0.5,
      position: 0.5,
      displayDuration: 5000,
      title: 'Summit',
    });
    sourceStore.getState().setUnitSystem('imperial');

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));

    const targetStore = createAppStore();
    // Pre-existing content should be fully replaced by hydration.
    targetStore.getState().addTrack(parseGPX(sampleGpx, 'stale.gpx'));

    hydrateProject(parsed, targetStore.getState());

    const state = targetStore.getState();
    expect(state.tracks).toHaveLength(1);
    expect(state.tracks[0].id).toBe(track.id);
    expect(state.tracks[0].name).toBe('Ridge Loop');
    expect(state.activeTrackId).toBe(track.id);

    expect(state.journeySegments).toHaveLength(1);
    expect(state.journeySegments[0].type).toBe('track');
    expect((state.journeySegments[0] as { trackId: string }).trackId).toBe(track.id);
    expect(state.journeySegments[0].duration).toBe(45000);

    expect(state.pictures).toHaveLength(1);
    expect(state.pictures[0]).toMatchObject({
      id: 'picture-1',
      file: null,
      url: '',
      isPlaceholder: true,
      originalFileName: 'summit.jpg',
      title: 'Summit',
    });

    expect(state.settings.unitSystem).toBe('imperial');
  });

  it('carries a photo route anchor through a save and reopen', async () => {
    const sourceStore = createAppStore();
    sourceStore.getState().addTrack(parseGPX(sampleGpx, 'ridge-loop.gpx'));
    sourceStore.getState().addPicture({
      id: 'picture-anchored',
      file: new File(['image'], 'summit.jpg', { type: 'image/jpeg' }),
      url: 'blob:summit',
      isPlaceholder: false,
      progress: 0.5,
      position: 0.5,
      // Metres from the start of the journey. Without it, a reopened project
      // cannot be recalculated when the timing mode changes afterwards.
      routeDistance: 1234,
      routeSegmentId: sourceStore.getState().journeySegments[0].id,
      routeSegmentDistance: 1234,
      placementSource: 'gps',
      displayDuration: 5000,
    });

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));

    const targetStore = createAppStore();
    hydrateProject(parsed, targetStore.getState());

    expect(targetStore.getState().pictures[0]).toMatchObject({
      routeDistance: 1234,
      routeSegmentId: sourceStore.getState().journeySegments[0].id,
      routeSegmentDistance: 1234,
    });
  });

  it('leaves the anchor absent for projects saved before it existed', async () => {
    const sourceStore = createAppStore();
    sourceStore.getState().addTrack(parseGPX(sampleGpx, 'ridge-loop.gpx'));
    sourceStore.getState().addPicture({
      id: 'picture-legacy',
      file: new File(['image'], 'old.jpg', { type: 'image/jpeg' }),
      url: 'blob:old',
      isPlaceholder: false,
      progress: 0.25,
      position: 0.25,
      displayDuration: 5000,
    });

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));

    const targetStore = createAppStore();
    hydrateProject(parsed, targetStore.getState());

    expect(targetStore.getState().pictures[0].routeDistance).toBeUndefined();
  });

  it('carries camera stability and route timing mode through a save and reopen', async () => {
    const sourceStore = createAppStore();
    sourceStore.getState().addTrack(parseGPX(sampleGpx, 'ridge-loop.gpx'));
    sourceStore.getState().setCameraSettings({ cameraStability: 0.9 });
    sourceStore.getState().setRouteTimingMode('uniform');

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));

    const targetStore = createAppStore();
    hydrateProject(parsed, targetStore.getState());

    const state = targetStore.getState();
    expect(state.cameraSettings.cameraStability).toBe(0.9);
    expect(state.playback.routeTimingMode).toBe('uniform');
  });

  it('defaults route timing mode to recorded for projects saved before it existed', async () => {
    const sourceStore = createAppStore();
    sourceStore.getState().addTrack(parseGPX(sampleGpx, 'ridge-loop.gpx'));
    sourceStore.getState().setRouteTimingMode('uniform');

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));
    delete (parsed.project as { routeTimingMode?: unknown }).routeTimingMode;

    const targetStore = createAppStore();
    hydrateProject(parsed, targetStore.getState());

    expect(targetStore.getState().playback.routeTimingMode).toBe('recorded');
  });

  it('persists stats presentation and defaults legacy projects to the automatic 1x layout', async () => {
    const sourceStore = createAppStore();
    sourceStore.getState().addTrack(parseGPX(sampleGpx, 'ridge-loop.gpx'));
    sourceStore.getState().setSettings({ statsScale: 1.6, statsLayout: 'vertical' });

    const blob = await buildReplayArchive(sourceStore.getState());
    const parsed = await parseReplayArchive(new File([blob], 'project.replay'));

    const scaledStore = createAppStore();
    hydrateProject(parsed, scaledStore.getState());
    expect(scaledStore.getState().settings.statsScale).toBe(1.6);
    expect(scaledStore.getState().settings.statsLayout).toBe('vertical');

    delete (parsed.project.settings as Partial<typeof parsed.project.settings>).statsScale;
    delete (parsed.project.settings as Partial<typeof parsed.project.settings>).statsLayout;
    const legacyStore = createAppStore();
    hydrateProject(parsed, legacyStore.getState());
    expect(legacyStore.getState().settings.statsScale).toBe(1);
    expect(legacyStore.getState().settings.statsLayout).toBe('auto');
  });
});
