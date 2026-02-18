export interface GPXPoint {
  lat: number;
  lon: number;
  elevation: number;
  time: Date | null;
  heartRate: number | null;
  cadence: number | null;
  power: number | null;
  temperature: number | null;
  distance: number;
  speed: number;
}

export interface GPXTrack {
  id: string;
  name: string;
  points: GPXPoint[];
  totalDistance: number;
  totalTime: number;
  movingTime: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  maxSpeed: number;
  avgSpeed: number;
  avgMovingSpeed: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  color: string;
  visible: boolean;
}

export type TransportMode = 'car' | 'bus' | 'train' | 'plane' | 'bike' | 'walk' | 'ferry';

export interface TransportSegment {
  id: string;
  type: 'transport';
  mode: TransportMode;
  from: { lat: number; lon: number; name?: string };
  to: { lat: number; lon: number; name?: string };
  duration: number;
  distance: number;
}

export interface TrackSegment {
  id: string;
  type: 'track';
  trackId: string;
  duration: number;
}

export type JourneySegment = TrackSegment | TransportSegment;

export interface Journey {
  id: string;
  name: string;
  segments: JourneySegment[];
  totalDuration: number;
  totalDistance: number;
}

export interface PictureAnnotation {
  id: string;
  file: File;
  url: string;
  lat?: number;
  lon?: number;
  timestamp?: Date;
  progress: number;
  position: number;
  title?: string;
  description?: string;
  displayDuration: number;
}

export interface VideoAnnotation {
  id: string;
  file: File;
  url: string;
  lat?: number;
  lon?: number;
  timestamp?: Date;
  progress: number;
  title?: string;
  description?: string;
}

export interface IconChange {
  id: string;
  progress: number;
  icon: string;
  label?: string;
}

export interface TextAnnotation {
  id: string;
  progress: number;
  text: string;
  icon?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  progress: number;
  speed: number;
  currentSegmentIndex: number;
  segmentProgress: number;
}

export type MapStyle = 'satellite' | 'topo' | 'street' | 'outdoor' | 'dark' | 'light';

export interface MapStyleConfig {
  id: MapStyle;
  name: string;
  url: string;
  thumbnail?: string;
}

export type CameraMode = 'overview' | 'follow' | 'follow-behind';

export interface CameraSettings {
  mode: CameraMode;
  zoom: number;
  pitch: number;
  bearing: number;
  followBehindPreset: 'very-close' | 'close' | 'medium' | 'far';
}

export type VideoFormat = 'webm' | 'mp4';
export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra';
export type AspectRatio = '16:9' | '1:1' | '9:16';

export interface VideoExportSettings {
  format: VideoFormat;
  quality: VideoQuality;
  fps: number;
  resolution: { width: number; height: number };
  aspectRatio: AspectRatio;
  includeStats: boolean;
  includeElevation: boolean;
  includeAudio: boolean;
}

export interface HeartRateZone {
  min: number;
  max: number;
  color: string;
  label: string;
}

export interface ComparisonTrack {
  id: string;
  name: string;
  color: string;
  track: GPXTrack;
  visible: boolean;
  offset: number;
}

export type UnitSystem = 'metric' | 'imperial';

export type ColorMode = 'fixed' | 'heartRate';

export interface TrailStyleSettings {
  // Trail Color
  trailColor: string;
  colorMode: ColorMode;
  heartRateZones: HeartRateZone[];
  // Marker Settings
  showMarker: boolean;
  markerSize: number;
  currentIcon: string;
  showCircle: boolean;
  // Track Labels
  showTrackLabels: boolean;
  trackLabel: string;
}

export interface AppSettings {
  unitSystem: UnitSystem;
  mapStyle: MapStyle;
  show3DTerrain: boolean;
  showHeartRate: boolean;
  showPictures: boolean;
  cameraMode: CameraMode;
  defaultAnimationSpeed: number;
  defaultTotalTime: number;
  trailStyle: TrailStyleSettings;
}

export interface LiveStats {
  distance: number;
  duration: number;
  speed: number;
  pace: number;
  elevation: number;
  elevationGain: number;
  heartRate: number | null;
  cadence: number | null;
  power: number | null;
}

export type ActivityType = 'running' | 'cycling' | 'hiking' | 'walking' | 'skiing' | 'other';

export interface ActivityIcon {
  type: ActivityType;
  icon: string;
  label: string;
}
