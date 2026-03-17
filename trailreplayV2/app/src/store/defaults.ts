import { getInitialLanguage } from '@/i18n/translations';
import type { AppSettings, CameraSettings, PlaybackState, VideoExportSettings } from '@/types';

export const defaultPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  progress: 0,
  speed: 1,
  currentSegmentIndex: 0,
  segmentProgress: 0,
};

export const defaultSettings: AppSettings = {
  language: getInitialLanguage(),
  unitSystem: 'metric',
  mapStyle: 'esri-clarity',
  show3DTerrain: true,
  showHeartRate: false,
  showPictures: true,
  cameraMode: 'follow-behind',
  defaultAnimationSpeed: 1,
  defaultTotalTime: 30,
  trailStyle: {
    trailColor: '#C1652F',
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

export const defaultCameraSettings: CameraSettings = {
  mode: 'follow-behind',
  zoom: 14,
  pitch: 55,
  bearing: 0,
  followBehindPreset: 'medium',
};

export const defaultVideoExportSettings: VideoExportSettings = {
  format: 'webm',
  quality: 'high',
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  aspectRatio: '16:9',
  includeStats: true,
  includeElevation: true,
  includeAudio: false,
};

export const defaultSidebarOpen =
  typeof window === 'undefined' ? true : window.innerWidth >= 768;

export const trackColors = [
  '#C1652F',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EF4444',
  '#F59E0B',
  '#06B6D4',
  '#EC4899',
];
