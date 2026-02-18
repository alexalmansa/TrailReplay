import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  GPXTrack,
  PictureAnnotation,
  VideoAnnotation,
  IconChange,
  TextAnnotation,
  JourneySegment,
  Journey,
  PlaybackState,
  VideoExportSettings,
  ComparisonTrack,
  AppSettings,
  UnitSystem,
  MapStyle,
  CameraMode,
  CameraSettings,
  TransportMode,
  TrailStyleSettings,
} from '@/types';

interface AppState {
  // Tracks
  tracks: GPXTrack[];
  activeTrackId: string | null;
  comparisonTracks: ComparisonTrack[];
  
  // Journey Builder
  journey: Journey | null;
  journeySegments: JourneySegment[];
  
  // Media
  pictures: PictureAnnotation[];
  videos: VideoAnnotation[];
  
  // Annotations
  iconChanges: IconChange[];
  textAnnotations: TextAnnotation[];
  
  // Playback
  playback: PlaybackState;
  cinematicPlayed: boolean;
  animationPhase: 'idle' | 'intro' | 'playing' | 'outro' | 'ended';
  
  // Settings
  settings: AppSettings;
  cameraSettings: CameraSettings;
  
  // Video Export
  videoExportSettings: VideoExportSettings;
  isExporting: boolean;
  exportProgress: number;
  exportStage: string;
  
  // UI State
  isSidebarOpen: boolean;
  exploreMode: boolean;
  activePanel: 'tracks' | 'journey' | 'annotations' | 'pictures' | 'export' | 'settings';
  isLoading: boolean;
  error: string | null;
  selectedPictureId: string | null;
  
  // Camera
  cameraPosition: { lat: number; lon: number; zoom: number; pitch: number; bearing: number } | null;
  
  // Actions
  addTrack: (track: GPXTrack) => void;
  removeTrack: (trackId: string) => void;
  setActiveTrack: (trackId: string | null) => void;
  updateTrackColor: (trackId: string, color: string) => void;
  updateTrackName: (trackId: string, name: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Comparison
  addComparisonTrack: (track: ComparisonTrack) => void;
  removeComparisonTrack: (trackId: string) => void;
  toggleComparisonTrack: (trackId: string) => void;
  updateComparisonOffset: (trackId: string, offset: number) => void;
  updateComparisonTrackName: (trackId: string, name: string) => void;
  updateComparisonColor: (trackId: string, color: string) => void;
  
  // Journey
  createJourney: (name: string) => void;
  addJourneySegment: (segment: JourneySegment) => void;
  removeJourneySegment: (segmentId: string) => void;
  reorderJourneySegments: (segments: JourneySegment[]) => void;
  updateJourneySegmentDuration: (segmentId: string, duration: number) => void;
  addTransportSegment: (from: { lat: number; lon: number }, to: { lat: number; lon: number }, mode: TransportMode) => void;
  clearJourney: () => void;
  
  // Pictures
  addPicture: (picture: PictureAnnotation) => void;
  removePicture: (pictureId: string) => void;
  updatePicturePosition: (pictureId: string, progress: number) => void;
  updatePictureMetadata: (pictureId: string, title: string, description: string) => void;
  updatePictureDuration: (pictureId: string, duration: number) => void;
  
  // Videos
  addVideo: (video: VideoAnnotation) => void;
  removeVideo: (videoId: string) => void;
  
  // Icon Changes
  addIconChange: (iconChange: IconChange) => void;
  removeIconChange: (iconChangeId: string) => void;
  updateIconChangePosition: (iconChangeId: string, progress: number) => void;
  
  // Text Annotations
  addTextAnnotation: (annotation: TextAnnotation) => void;
  removeTextAnnotation: (annotationId: string) => void;
  
  // Playback
  setPlayback: (playback: Partial<PlaybackState>) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  seekToProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  setCurrentSegment: (index: number, progress: number) => void;
  setCinematicPlayed: (played: boolean) => void;
  setAnimationPhase: (phase: 'idle' | 'intro' | 'playing' | 'outro' | 'ended') => void;
  resetPlayback: () => void;
  
  // Settings
  setSettings: (settings: Partial<AppSettings>) => void;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  setCameraMode: (mode: CameraMode) => void;
  setMapStyle: (style: MapStyle) => void;
  setUnitSystem: (unit: UnitSystem) => void;
  setTrailStyle: (settings: Partial<TrailStyleSettings>) => void;
  
  // Video Export
  setVideoExportSettings: (settings: Partial<VideoExportSettings>) => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setExportStage: (stage: string) => void;
  
  // Camera
  setCameraPosition: (position: { lat: number; lon: number; zoom: number; pitch: number; bearing: number }) => void;
  
  // UI
  setSidebarOpen: (isOpen: boolean) => void;
  setExploreMode: (enabled: boolean) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedPictureId: (pictureId: string | null) => void;
  
  // Reset
  reset: () => void;
}

const defaultPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  progress: 0,
  speed: 1,
  currentSegmentIndex: 0,
  segmentProgress: 0,
};

const defaultSettings: AppSettings = {
  unitSystem: 'metric',
  mapStyle: 'esri-clarity',
  show3DTerrain: true,
  showHeartRate: false,
  showPictures: true,
  cameraMode: 'follow-behind',
  defaultAnimationSpeed: 1,
  defaultTotalTime: 30, // Default 30 seconds per track
  trailStyle: {
    trailColor: '#C1652F', // Trail orange
    colorMode: 'fixed',
    heartRateZones: [
      { min: 50, max: 120, color: '#8BC34A', label: 'Zone 1' },
      { min: 121, max: 140, color: '#4CAF50', label: 'Zone 2' },
      { min: 141, max: 160, color: '#FFC107', label: 'Zone 3' },
      { min: 161, max: 180, color: '#FF9800', label: 'Zone 4' },
      { min: 181, max: 220, color: '#F44336', label: 'Zone 5' },
    ],
    showMarker: true,
    markerSize: 1.0,
    currentIcon: '🏃',
    showCircle: true,
    showTrackLabels: false,
    trackLabel: 'Track 1',
  },
  mapOverlays: { skiPistes: false, slopeOverlay: false, placeLabels: true, aspectOverlay: false },
  waybackRelease: null,
  waybackItemURL: null,
};

const defaultCameraSettings: CameraSettings = {
  mode: 'follow-behind',
  zoom: 14,
  pitch: 55,
  bearing: 0,
  followBehindPreset: 'medium',
};

const defaultVideoExportSettings: VideoExportSettings = {
  format: 'webm',
  quality: 'high',
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  aspectRatio: '16:9',
  includeStats: true,
  includeElevation: true,
  includeAudio: false,
};

const trackColors = [
  '#C1652F', // trail-orange
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#EF4444', // red
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#EC4899', // pink
];

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Initial State
    tracks: [],
    activeTrackId: null,
    comparisonTracks: [],
    journey: null,
    journeySegments: [],
    pictures: [],
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
    isSidebarOpen: true,
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
            id: `journey-${Date.now()}`,
            name: 'My Journey',
            segments: [],
            totalDuration: 0,
            totalDistance: 0,
          };
        }
        // Add track to journey with default 60s duration (user can adjust in Journey panel)
        state.journeySegments.push({
          id: `segment-${Date.now()}-${track.id}`,
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
          id: `journey-${Date.now()}`,
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
          id: `transport-${Date.now()}`,
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
        if (picture) picture.progress = progress;
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
