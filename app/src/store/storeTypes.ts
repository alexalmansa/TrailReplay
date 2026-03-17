import type {
  GPXTrack,
  PictureAnnotation,
  PendingPicturePlacement,
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

export interface AppState {
  tracks: GPXTrack[];
  activeTrackId: string | null;
  comparisonTracks: ComparisonTrack[];
  journey: Journey | null;
  journeySegments: JourneySegment[];
  pictures: PictureAnnotation[];
  pendingPicturePlacements: PendingPicturePlacement[];
  videos: VideoAnnotation[];
  iconChanges: IconChange[];
  textAnnotations: TextAnnotation[];
  playback: PlaybackState;
  cinematicPlayed: boolean;
  animationPhase: 'idle' | 'intro' | 'playing' | 'outro' | 'ended';
  settings: AppSettings;
  cameraSettings: CameraSettings;
  videoExportSettings: VideoExportSettings;
  isExporting: boolean;
  exportProgress: number;
  exportStage: string;
  isSidebarOpen: boolean;
  exploreMode: boolean;
  activePanel: 'tracks' | 'journey' | 'annotations' | 'pictures' | 'export' | 'settings';
  isLoading: boolean;
  error: string | null;
  selectedPictureId: string | null;
  cameraPosition: { lat: number; lon: number; zoom: number; pitch: number; bearing: number } | null;
  addTrack: (track: GPXTrack) => void;
  removeTrack: (trackId: string) => void;
  setActiveTrack: (trackId: string | null) => void;
  updateTrackColor: (trackId: string, color: string) => void;
  updateTrackName: (trackId: string, name: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  addComparisonTrack: (track: ComparisonTrack) => void;
  removeComparisonTrack: (trackId: string) => void;
  toggleComparisonTrack: (trackId: string) => void;
  updateComparisonOffset: (trackId: string, offset: number) => void;
  updateComparisonTrackName: (trackId: string, name: string) => void;
  updateComparisonColor: (trackId: string, color: string) => void;
  createJourney: (name: string) => void;
  addJourneySegment: (segment: JourneySegment) => void;
  removeJourneySegment: (segmentId: string) => void;
  reorderJourneySegments: (segments: JourneySegment[]) => void;
  updateJourneySegmentDuration: (segmentId: string, duration: number) => void;
  addTransportSegment: (from: { lat: number; lon: number }, to: { lat: number; lon: number }, mode: TransportMode) => void;
  clearJourney: () => void;
  addPicture: (picture: PictureAnnotation) => void;
  queuePendingPicturePlacement: (picture: PendingPicturePlacement) => void;
  removePendingPicturePlacement: (pictureId: string) => void;
  clearPendingPicturePlacements: () => void;
  removePicture: (pictureId: string) => void;
  updatePicturePosition: (pictureId: string, progress: number) => void;
  updatePictureMetadata: (pictureId: string, title: string, description: string) => void;
  updatePictureDuration: (pictureId: string, duration: number) => void;
  addVideo: (video: VideoAnnotation) => void;
  removeVideo: (videoId: string) => void;
  addIconChange: (iconChange: IconChange) => void;
  removeIconChange: (iconChangeId: string) => void;
  updateIconChangePosition: (iconChangeId: string, progress: number) => void;
  addTextAnnotation: (annotation: TextAnnotation) => void;
  removeTextAnnotation: (annotationId: string) => void;
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
  setSettings: (settings: Partial<AppSettings>) => void;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  setCameraMode: (mode: CameraMode) => void;
  setMapStyle: (style: MapStyle) => void;
  setUnitSystem: (unit: UnitSystem) => void;
  setTrailStyle: (settings: Partial<TrailStyleSettings>) => void;
  setVideoExportSettings: (settings: Partial<VideoExportSettings>) => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setExportStage: (stage: string) => void;
  setCameraPosition: (position: { lat: number; lon: number; zoom: number; pitch: number; bearing: number }) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setExploreMode: (enabled: boolean) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedPictureId: (pictureId: string | null) => void;
  reset: () => void;
}
