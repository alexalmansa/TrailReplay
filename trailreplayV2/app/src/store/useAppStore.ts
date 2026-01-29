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
  toggleTrackVisibility: (trackId: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  
  // Comparison
  addComparisonTrack: (track: ComparisonTrack) => void;
  removeComparisonTrack: (trackId: string) => void;
  toggleComparisonTrack: (trackId: string) => void;
  updateComparisonOffset: (trackId: string, offset: number) => void;
  
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
  
  // Settings
  setSettings: (settings: Partial<AppSettings>) => void;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  setCameraMode: (mode: CameraMode) => void;
  setMapStyle: (style: MapStyle) => void;
  setUnitSystem: (unit: UnitSystem) => void;
  
  // Video Export
  setVideoExportSettings: (settings: Partial<VideoExportSettings>) => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setExportStage: (stage: string) => void;
  
  // Camera
  setCameraPosition: (position: { lat: number; lon: number; zoom: number; pitch: number; bearing: number }) => void;
  
  // UI
  setSidebarOpen: (isOpen: boolean) => void;
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
  mapStyle: 'satellite',
  show3DTerrain: true,
  showHeartRate: false,
  showPictures: true,
  cameraMode: 'follow-behind',
  defaultAnimationSpeed: 1,
  defaultTotalTime: 30, // Default 30 seconds per track
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
    settings: defaultSettings,
    cameraSettings: defaultCameraSettings,
    videoExportSettings: defaultVideoExportSettings,
    isExporting: false,
    exportProgress: 0,
    exportStage: '',
    isSidebarOpen: true,
    activePanel: 'tracks',
    isLoading: false,
    error: null,
    cameraPosition: null,
    selectedPictureId: null,

    // Track Actions
    addTrack: (track) =>
      set((state) => {
        const colorIndex = state.tracks.length % trackColors.length;
        const trackWithColor = { ...track, color: track.color || trackColors[colorIndex], visible: true };
        state.tracks.push(trackWithColor);
        if (!state.activeTrackId) {
          state.activeTrackId = track.id;
        }
        // Add to journey if it exists
        if (state.journey) {
          state.journeySegments.push({
            id: `segment-${Date.now()}`,
            type: 'track',
            trackId: track.id,
            duration: track.totalTime * 1000,
          });
        }
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
      }),

    updateTrackColor: (trackId, color) =>
      set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) track.color = color;
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
