import { describe, expect, it } from 'vitest';
import { createAppStore } from './createAppStore';
import type {
  ComparisonTrack,
  GPXTrack,
  IconChange,
  PendingPicturePlacement,
  PictureAnnotation,
  TextAnnotation,
  VideoAnnotation,
} from '@/types';

function createTrack(overrides: Partial<GPXTrack> = {}): GPXTrack {
  return {
    id: overrides.id ?? 'track-1',
    name: overrides.name ?? 'Sample Track',
    points: overrides.points ?? [
      {
        lat: 42,
        lon: 1,
        elevation: 1000,
        time: null,
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 0,
        speed: 0,
      },
    ],
    totalDistance: overrides.totalDistance ?? 10000,
    totalTime: overrides.totalTime ?? 3600000,
    movingTime: overrides.movingTime ?? 3500000,
    elevationGain: overrides.elevationGain ?? 1200,
    elevationLoss: overrides.elevationLoss ?? 1200,
    maxElevation: overrides.maxElevation ?? 2100,
    minElevation: overrides.minElevation ?? 900,
    maxSpeed: overrides.maxSpeed ?? 8,
    avgSpeed: overrides.avgSpeed ?? 4,
    avgMovingSpeed: overrides.avgMovingSpeed ?? 4.2,
    bounds: overrides.bounds ?? {
      minLat: 42,
      maxLat: 42.1,
      minLon: 1,
      maxLon: 1.1,
    },
    color: overrides.color ?? '#10B981',
    visible: overrides.visible ?? true,
  };
}

function createPendingPlacement(id: string): PendingPicturePlacement {
  return {
    id,
    file: new File(['image'], `${id}.jpg`, { type: 'image/jpeg' }),
    url: `blob:${id}`,
    displayDuration: 5000,
    placementReason: 'missing-gps',
  };
}

function createPicture(id: string): PictureAnnotation {
  return {
    id,
    file: new File(['image'], `${id}.jpg`, { type: 'image/jpeg' }),
    url: `blob:${id}`,
    progress: 0.25,
    position: 0.25,
    displayDuration: 4000,
    title: 'Before',
    description: 'Before description',
  };
}

function createVideo(id: string): VideoAnnotation {
  return {
    id,
    file: new File(['video'], `${id}.mp4`, { type: 'video/mp4' }),
    url: `blob:${id}`,
    progress: 0.5,
    title: 'Clip',
    description: 'Clip description',
  };
}

function createComparisonTrack(id: string): ComparisonTrack {
  return {
    id,
    name: `Comparison ${id}`,
    color: '#6366F1',
    track: createTrack({ id: `${id}-source` }),
    visible: true,
    offset: 0,
  };
}

describe('createAppStore', () => {
  it('creates the expected journey state when the first imported track is added', () => {
    const useStore = createAppStore();
    const track = createTrack();

    useStore.getState().addTrack(track);

    const state = useStore.getState();
    expect(state.tracks).toHaveLength(1);
    expect(state.activeTrackId).toBe(track.id);
    expect(state.journey?.name).toBe('My Journey');
    expect(state.journeySegments).toHaveLength(1);
    expect(state.journeySegments[0]).toMatchObject({
      type: 'track',
      trackId: track.id,
      duration: 60000,
    });
    expect(state.activePanel).toBe('journey');
    expect(state.settings.trailStyle.trailColor).toBe(track.color);
  });

  it('keeps manual picture placements queued in upload order until the queue is cleared', () => {
    const useStore = createAppStore();
    const firstPlacement = createPendingPlacement('photo-1');
    const secondPlacement = createPendingPlacement('photo-2');

    useStore.getState().queuePendingPicturePlacement(firstPlacement);
    useStore.getState().queuePendingPicturePlacement(secondPlacement);

    expect(useStore.getState().pendingPicturePlacements.map((picture) => picture.id)).toEqual([
      'photo-1',
      'photo-2',
    ]);

    useStore.getState().removePendingPicturePlacement('photo-1');
    expect(useStore.getState().pendingPicturePlacements.map((picture) => picture.id)).toEqual([
      'photo-2',
    ]);

    useStore.getState().clearPendingPicturePlacements();
    expect(useStore.getState().pendingPicturePlacements).toEqual([]);
  });

  it('resets settings with fresh defaults instead of reusing mutated objects', () => {
    const useStore = createAppStore();
    const initialTrailStyle = useStore.getState().settings.trailStyle;

    useStore.getState().setTrailStyle({
      currentIcon: '🚵',
      trackLabel: 'Changed',
    });
    useStore.getState().setSettings({
      mapStyle: 'street',
    });

    useStore.getState().reset();

    const state = useStore.getState();
    expect(state.settings.mapStyle).toBe('esri-clarity');
    expect(state.settings.trailStyle.currentIcon).toBe('🏃');
    expect(state.settings.trailStyle.trackLabel).toBe('Track 1');
    expect(state.settings.trailStyle).not.toBe(initialTrailStyle);
  });

  it('locks the sidebar on export while recording is active', () => {
    const useStore = createAppStore();

    useStore.getState().setActivePanel('settings');
    useStore.getState().setIsExporting(true);

    expect(useStore.getState().activePanel).toBe('export');

    useStore.getState().setActivePanel('settings');
    expect(useStore.getState().activePanel).toBe('export');

    useStore.getState().setIsExporting(false);
    useStore.getState().setActivePanel('settings');
    expect(useStore.getState().activePanel).toBe('settings');
  });

  it('keeps export settings isolated from generic app settings', () => {
    const useStore = createAppStore();

    useStore.getState().setSettings({ mapStyle: 'street' });
    useStore.getState().setVideoExportSettings({ fps: 60, aspectRatio: '9:16' });

    const state = useStore.getState();
    expect(state.settings.mapStyle).toBe('street');
    expect(state.settings.cameraMode).toBe('follow-behind');
    expect(state.videoExportSettings.fps).toBe(60);
    expect(state.videoExportSettings.aspectRatio).toBe('9:16');
  });

  it('keeps playback controls internally consistent when seeking and resetting', () => {
    const useStore = createAppStore();

    useStore.getState().setPlayback({ totalDuration: 120000 });
    useStore.getState().play();
    useStore.getState().setSpeed(2);
    useStore.getState().seek(150000);
    useStore.getState().setCurrentSegment(2, 0.4);
    useStore.getState().setCinematicPlayed(true);
    useStore.getState().setAnimationPhase('playing');

    let state = useStore.getState();
    expect(state.playback.isPlaying).toBe(true);
    expect(state.playback.currentTime).toBe(120000);
    expect(state.playback.progress).toBe(1);
    expect(state.playback.speed).toBe(2);
    expect(state.playback.currentSegmentIndex).toBe(2);
    expect(state.playback.segmentProgress).toBe(0.4);
    expect(state.cinematicPlayed).toBe(true);
    expect(state.animationPhase).toBe('playing');

    useStore.getState().pause();
    useStore.getState().seekToProgress(-1);
    state = useStore.getState();
    expect(state.playback.isPlaying).toBe(false);
    expect(state.playback.progress).toBe(0);
    expect(state.playback.currentTime).toBe(0);

    useStore.getState().resetPlayback();
    state = useStore.getState();
    expect(state.playback).toMatchObject({
      isPlaying: false,
      currentTime: 0,
      totalDuration: 0,
      progress: 0,
      speed: 1,
      currentSegmentIndex: 0,
      segmentProgress: 0,
    });
    expect(state.cinematicPlayed).toBe(false);
    expect(state.animationPhase).toBe('idle');
  });

  it('updates media annotations and clears related selection state when removed', () => {
    const useStore = createAppStore();
    const picture = createPicture('picture-1');
    const video = createVideo('video-1');
    const iconChange: IconChange = { id: 'icon-1', progress: 0.2, icon: '🚴' };
    const annotation: TextAnnotation = { id: 'text-1', progress: 0.3, text: 'Aid station' };

    useStore.getState().addPicture(picture);
    useStore.getState().setSelectedPictureId(picture.id);
    useStore.getState().updatePicturePosition(picture.id, 0.75);
    useStore.getState().updatePictureMetadata(picture.id, 'Updated', 'Updated description');
    useStore.getState().updatePictureDuration(picture.id, 6500);
    useStore.getState().addVideo(video);
    useStore.getState().addIconChange(iconChange);
    useStore.getState().updateIconChangePosition(iconChange.id, 0.5);
    useStore.getState().addTextAnnotation(annotation);

    let state = useStore.getState();
    expect(state.selectedPictureId).toBe(picture.id);
    expect(state.pictures[0]).toMatchObject({
      progress: 0.75,
      position: 0.75,
      title: 'Updated',
      description: 'Updated description',
      displayDuration: 6500,
    });
    expect(state.videos).toHaveLength(1);
    expect(state.iconChanges[0].progress).toBe(0.5);
    expect(state.textAnnotations).toHaveLength(1);

    useStore.getState().removeVideo(video.id);
    useStore.getState().removeIconChange(iconChange.id);
    useStore.getState().removeTextAnnotation(annotation.id);
    useStore.getState().removePicture(picture.id);

    state = useStore.getState();
    expect(state.selectedPictureId).toBeNull();
    expect(state.pictures).toEqual([]);
    expect(state.videos).toEqual([]);
    expect(state.iconChanges).toEqual([]);
    expect(state.textAnnotations).toEqual([]);
  });

  it('manages track ordering, active styling, and comparison track state', () => {
    const useStore = createAppStore();
    const firstTrack = createTrack({ id: 'track-1', color: '#10B981' });
    const secondTrack = createTrack({ id: 'track-2', color: '#3B82F6', name: 'Track Two' });
    const comparisonTrack = createComparisonTrack('comparison-1');

    useStore.getState().addTrack(firstTrack);
    useStore.getState().addTrack(secondTrack);
    useStore.getState().toggleTrackVisibility(secondTrack.id);
    useStore.getState().updateTrackName(secondTrack.id, 'Renamed Track');
    useStore.getState().updateTrackColor(secondTrack.id, '#F97316');
    useStore.getState().setActiveTrack(secondTrack.id);
    useStore.getState().reorderTracks(1, 0);
    useStore.getState().addComparisonTrack(comparisonTrack);
    useStore.getState().toggleComparisonTrack(comparisonTrack.id);
    useStore.getState().updateComparisonOffset(comparisonTrack.id, 2500);
    useStore.getState().updateComparisonTrackName(comparisonTrack.id, 'Offset Track');
    useStore.getState().updateComparisonColor(comparisonTrack.id, '#EF4444');

    let state = useStore.getState();
    expect(state.tracks.map((track) => track.id)).toEqual(['track-2', 'track-1']);
    expect(state.tracks[0]).toMatchObject({
      id: 'track-2',
      name: 'Renamed Track',
      color: '#F97316',
      visible: false,
    });
    expect(state.activeTrackId).toBe('track-2');
    expect(state.settings.trailStyle.trailColor).toBe('#F97316');
    expect(state.comparisonTracks[0]).toMatchObject({
      visible: false,
      offset: 2500,
      name: 'Offset Track',
      color: '#EF4444',
    });

    useStore.getState().removeComparisonTrack(comparisonTrack.id);
    useStore.getState().removeTrack(secondTrack.id);
    state = useStore.getState();
    expect(state.activeTrackId).toBe(firstTrack.id);
    expect(state.tracks.map((track) => track.id)).toEqual([firstTrack.id]);
    expect(state.journeySegments.every((segment) => segment.type !== 'track' || segment.trackId !== secondTrack.id)).toBe(
      true
    );
    expect(state.comparisonTracks).toEqual([]);
  });
});
