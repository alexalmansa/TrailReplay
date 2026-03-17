import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createId } from '@/utils/id';
import { defaultCameraSettings, defaultPlayback, defaultSettings, defaultSidebarOpen, defaultVideoExportSettings, trackColors } from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Initial State
    tracks: [],
    activeTrackId: null,
    comparisonTracks: [],
    journey: null,
    journeySegments: [],
    pictures: [],
    pendingPicturePlacements: [],
    videos: [],
    iconChanges: [],
    textAnnotations: [],
    playback: defaultPlayback,
    cinematicPlayed: false,
    animationPhase: 'idle',
    settings: defaultSettings,
    cameraSettings: defaultCameraSettings,
    videoExportSettings: defaultVideoExportSettings,
    isExporting: false,
    exportProgress: 0,
    exportStage: '',
    isSidebarOpen: defaultSidebarOpen,
    exploreMode: false,
    activePanel: 'tracks',
    isLoading: false,
    error: null,
    cameraPosition: null,
    selectedPictureId: null,

    // Track Actions
    addTrack: (track) =>
      set((state) => {
        const colorIndex = state.tracks.length % trackColors.length;
        const trackColor = track.color || trackColors[colorIndex];
        const trackWithColor = { ...track, color: trackColor, visible: true };
        state.tracks.push(trackWithColor);
        state.exploreMode = false;
        if (!state.activeTrackId) {
          state.activeTrackId = track.id;
          // Sync trail color with first active track
          state.settings.trailStyle.trailColor = trackColor;
        }
        // Auto-create journey if it doesn't exist
        if (!state.journey) {
          state.journey = {
            id: createId('journey'),
            name: 'My Journey',
            segments: [],
            totalDuration: 0,
            totalDistance: 0,
          };
        }
        // Add track to journey with default 60s duration (user can adjust in Journey panel)
        state.journeySegments.push({
          id: createId(`segment-${track.id}`),
          type: 'track',
          trackId: track.id,
          duration: 60000, // 60 seconds default
        });
        // Switch to journey panel
        state.activePanel = 'journey';
      }),

    removeTrack: (trackId) =>
      set((state) => {
        state.tracks = state.tracks.filter((t) => t.id !== trackId);
        state.journeySegments = state.journeySegments.filter((s) => 
          s.type !== 'track' || (s.type === 'track' && s.trackId !== trackId)
        );
        if (state.activeTrackId === trackId) {
          state.activeTrackId = state.tracks[0]?.id || null;
        }
      }),

    setActiveTrack: (trackId) =>
      set((state) => {
        state.activeTrackId = trackId;
        // Sync trail color with active track
        const activeTrack = state.tracks.find((t) => t.id === trackId);
        if (activeTrack && activeTrack.color) {
          state.settings.trailStyle.trailColor = activeTrack.color;
        }
      }),

    updateTrackColor: (trackId, color) =>
      set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) {
          track.color = color;
          // Sync trail style if this is the active track
          if (state.activeTrackId === trackId) {
            state.settings.trailStyle.trailColor = color;
          }
        }
      }),

    updateTrackName: (trackId, name) =>
      set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) track.name = name;
      }),

    toggleTrackVisibility: (trackId) =>
      set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) track.visible = !track.visible;
      }),

    reorderTracks: (fromIndex: number, toIndex: number) =>
      set((state) => {
        const [movedTrack] = state.tracks.splice(fromIndex, 1);
        state.tracks.splice(toIndex, 0, movedTrack);
      }),

    // Comparison Actions
    addComparisonTrack: (track) =>
      set((state) => {
        state.comparisonTracks.push(track);
      }),

    removeComparisonTrack: (trackId) =>
      set((state) => {
        state.comparisonTracks = state.comparisonTracks.filter((t) => t.id !== trackId);
      }),

    toggleComparisonTrack: (trackId) =>
      set((state) => {
        const track = state.comparisonTracks.find((t) => t.id === trackId);
        if (track) track.visible = !track.visible;
      }),

    updateComparisonOffset: (trackId, offset) =>
      set((state) => {
        const track = state.comparisonTracks.find((t) => t.id === trackId);
        if (track) track.offset = offset;
      }),

    updateComparisonTrackName: (trackId, name) =>
      set((state) => {
        const track = state.comparisonTracks.find((t) => t.id === trackId);
        if (track) track.name = name;
      }),

    updateComparisonColor: (trackId, color) =>
      set((state) => {
        const track = state.comparisonTracks.find((t) => t.id === trackId);
        if (track) track.color = color;
      }),

    // Journey Actions
    createJourney: (name) =>
      set((state) => {
        state.journey = {
          id: createId('journey'),
          name,
          segments: [],
          totalDuration: 0,
          totalDistance: 0,
        };
      }),

    addJourneySegment: (segment) =>
      set((state) => {
        state.journeySegments.push(segment);
      }),

    removeJourneySegment: (segmentId) =>
      set((state) => {
        state.journeySegments = state.journeySegments.filter((s) => s.id !== segmentId);
      }),

    reorderJourneySegments: (segments) =>
      set((state) => {
        state.journeySegments = segments;
      }),

    updateJourneySegmentDuration: (segmentId, duration) =>
      set((state) => {
        const segment = state.journeySegments.find((s) => s.id === segmentId);
        if (segment) {
          segment.duration = duration;
        }
      }),

    addTransportSegment: (from, to, mode) =>
      set((state) => {
        state.journeySegments.push({
          id: createId('transport'),
          type: 'transport',
          mode,
          from,
          to,
          duration: 0,
          distance: 0,
        });
      }),

    clearJourney: () =>
      set((state) => {
        state.journey = null;
        state.journeySegments = [];
      }),

    // Picture Actions
    addPicture: (picture) =>
      set((state) => {
        state.pictures.push(picture);
      }),

    queuePendingPicturePlacement: (picture) =>
      set((state) => {
        state.pendingPicturePlacements.push(picture);
      }),

    removePendingPicturePlacement: (pictureId) =>
      set((state) => {
        state.pendingPicturePlacements = state.pendingPicturePlacements.filter((p) => p.id !== pictureId);
      }),

    clearPendingPicturePlacements: () =>
      set((state) => {
        state.pendingPicturePlacements = [];
      }),

    removePicture: (pictureId) =>
      set((state) => {
        state.pictures = state.pictures.filter((p) => p.id !== pictureId);
        if (state.selectedPictureId === pictureId) {
          state.selectedPictureId = null;
        }
      }),

    updatePicturePosition: (pictureId, progress) =>
      set((state) => {
        const picture = state.pictures.find((p) => p.id === pictureId);
        if (picture) {
          picture.progress = progress;
          picture.position = progress;
        }
      }),

    updatePictureMetadata: (pictureId, title, description) =>
      set((state) => {
        const picture = state.pictures.find((p) => p.id === pictureId);
        if (picture) {
          picture.title = title;
          picture.description = description;
        }
      }),

    updatePictureDuration: (pictureId, duration) =>
      set((state) => {
        const picture = state.pictures.find((p) => p.id === pictureId);
        if (picture) {
          picture.displayDuration = duration;
        }
      }),

    // Video Actions
    addVideo: (video) =>
      set((state) => {
        state.videos.push(video);
      }),

    removeVideo: (videoId) =>
      set((state) => {
        state.videos = state.videos.filter((v) => v.id !== videoId);
      }),

    // Icon Change Actions
    addIconChange: (iconChange) =>
      set((state) => {
        state.iconChanges.push(iconChange);
      }),

    removeIconChange: (iconChangeId) =>
      set((state) => {
        state.iconChanges = state.iconChanges.filter((ic) => ic.id !== iconChangeId);
      }),

    updateIconChangePosition: (iconChangeId, progress) =>
      set((state) => {
        const iconChange = state.iconChanges.find((ic) => ic.id === iconChangeId);
        if (iconChange) iconChange.progress = progress;
      }),

    // Text Annotation Actions
    addTextAnnotation: (annotation) =>
      set((state) => {
        state.textAnnotations.push(annotation);
      }),

    removeTextAnnotation: (annotationId) =>
      set((state) => {
        state.textAnnotations = state.textAnnotations.filter((a) => a.id !== annotationId);
      }),

    // Playback Actions
    setPlayback: (playback) =>
      set((state) => {
        Object.assign(state.playback, playback);
      }),

    play: () =>
      set((state) => {
        state.playback.isPlaying = true;
      }),

    pause: () =>
      set((state) => {
        state.playback.isPlaying = false;
      }),

    seek: (time) =>
      set((state) => {
        state.playback.currentTime = Math.max(0, Math.min(time, state.playback.totalDuration));
        state.playback.progress = state.playback.totalDuration > 0
          ? state.playback.currentTime / state.playback.totalDuration
          : 0;
      }),

    seekToProgress: (progress) =>
      set((state) => {
        state.playback.progress = Math.max(0, Math.min(progress, 1));
        state.playback.currentTime = state.playback.progress * state.playback.totalDuration;
      }),

    setSpeed: (speed) =>
      set((state) => {
        state.playback.speed = speed;
      }),

    setCurrentSegment: (index, progress) =>
      set((state) => {
        state.playback.currentSegmentIndex = index;
        state.playback.segmentProgress = progress;
      }),

    setCinematicPlayed: (played) =>
      set((state) => {
        state.cinematicPlayed = played;
      }),

    setAnimationPhase: (phase) =>
      set((state) => {
        state.animationPhase = phase;
      }),

    resetPlayback: () =>
      set((state) => {
        state.playback.isPlaying = false;
        state.playback.currentTime = 0;
        state.playback.progress = 0;
        state.playback.currentSegmentIndex = 0;
        state.playback.segmentProgress = 0;
        state.cinematicPlayed = false;
        state.animationPhase = 'idle';
      }),

    // Settings Actions
    setSettings: (settings) =>
      set((state) => {
        Object.assign(state.settings, settings);
      }),

    setCameraSettings: (settings) =>
      set((state) => {
        Object.assign(state.cameraSettings, settings);
      }),

    setCameraMode: (mode) =>
      set((state) => {
        state.cameraSettings.mode = mode;
        state.settings.cameraMode = mode;
      }),

    setMapStyle: (style) =>
      set((state) => {
        state.settings.mapStyle = style;
      }),

    setUnitSystem: (unit) =>
      set((state) => {
        state.settings.unitSystem = unit;
      }),

    setTrailStyle: (settings) =>
      set((state) => {
        Object.assign(state.settings.trailStyle, settings);
      }),

    // Video Export Actions
    setVideoExportSettings: (settings) =>
      set((state) => {
        Object.assign(state.videoExportSettings, settings);
      }),

    setIsExporting: (isExporting) =>
      set((state) => {
        state.isExporting = isExporting;
        if (!isExporting) {
          state.exportProgress = 0;
          state.exportStage = '';
        }
      }),

    setExportProgress: (progress) =>
      set((state) => {
        state.exportProgress = progress;
      }),

    setExportStage: (stage) =>
      set((state) => {
        state.exportStage = stage;
      }),

    // Camera Actions
    setCameraPosition: (position) =>
      set((state) => {
        state.cameraPosition = position;
      }),

    // UI Actions
    setSidebarOpen: (isOpen) =>
      set((state) => {
        state.isSidebarOpen = isOpen;
      }),
    setExploreMode: (enabled) =>
      set((state) => {
        state.exploreMode = enabled;
      }),

    setActivePanel: (panel) =>
      set((state) => {
        state.activePanel = panel;
      }),

    setLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
    setSelectedPictureId: (pictureId) =>
      set((state) => {
        state.selectedPictureId = pictureId;
      }),

    // Reset
    reset: () =>
      set((state) => {
        state.tracks = [];
        state.activeTrackId = null;
        state.comparisonTracks = [];
        state.journey = null;
        state.journeySegments = [];
        state.pictures = [];
        state.pendingPicturePlacements = [];
        state.videos = [];
        state.iconChanges = [];
        state.textAnnotations = [];
        state.playback = defaultPlayback;
        state.isExporting = false;
        state.exportProgress = 0;
        state.exportStage = '';
        state.error = null;
        state.selectedPictureId = null;
      }),
  }))
);
