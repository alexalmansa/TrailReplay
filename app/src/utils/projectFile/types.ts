import type {
  AppSettings,
  CameraSettings,
  IconChange,
  Journey,
  JourneySegment,
  RouteTimingMode,
  SocialShareSettings,
  TextAnnotation,
  VideoExportSettings,
} from '@/types';
import type { LandmarkType, RouteLandmark } from '@/types/landmarks';

export const CURRENT_FORMAT_VERSION = 1;
export const SUPPORTED_FORMAT_VERSIONS = [1];

// package.json version is unused elsewhere in the app (still "0.0.0"); kept here purely
// as diagnostic metadata in saved archives, not relied on for any behavior.
export const APP_VERSION = '0.0.0';

export const MAX_ARCHIVE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export interface ReplayManifest {
  formatVersion: number;
  appVersion: string;
  projectName: string;
  createdAt: string;
  savedAt: string;
  trackCount: number;
  pictureCount: number;
  videoCount: number;
}

export interface ReplayTrackMeta {
  id: string;
  name: string;
  activityIcon: string;
  color: string;
  visible: boolean;
  routeFile: string;
}

export interface ReplayComparisonTrackMeta {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  offset: number;
  routeFile: string;
}

export interface SerializedPicture {
  id: string;
  originalFileName: string;
  lat?: number;
  lon?: number;
  timestamp?: string;
  progress: number;
  position: number;
  /**
   * Distance from the start of the journey, in metres. `progress` depends on
   * the timing mode; this does not, so it is what lets a reopened project be
   * recalculated when the mode changes afterwards. Absent in projects saved
   * before this field existed.
   */
  routeDistance?: number;
  routeSegmentId?: string;
  routeSegmentDistance?: number;
  placementSource?: 'gps' | 'timestamp' | 'manual';
  title?: string;
  description?: string;
  displayDuration: number;
}

export interface SerializedVideo {
  id: string;
  originalFileName: string;
  lat?: number;
  lon?: number;
  timestamp?: string;
  progress: number;
  title?: string;
  description?: string;
}

export interface ReplayProjectFile {
  formatVersion: number;
  tracks: ReplayTrackMeta[];
  activeTrackId: string | null;
  comparisonTracks: ReplayComparisonTrackMeta[];
  journey: Journey | null;
  journeySegments: JourneySegment[];
  pictures: SerializedPicture[];
  videos: SerializedVideo[];
  iconChanges: IconChange[];
  textAnnotations: TextAnnotation[];
  userLandmarks: RouteLandmark[];
  enabledLandmarkGroups: LandmarkType[];
  nearbyPlaceTypes: LandmarkType[] | null;
  showAutomaticLandmarks: boolean;
  routeTimingMode: RouteTimingMode;
  settings: AppSettings;
  cameraSettings: CameraSettings;
  videoExportSettings: VideoExportSettings;
  socialShareSettings: SocialShareSettings;
}

export interface ParsedProject {
  manifest: ReplayManifest;
  project: ReplayProjectFile;
  tracks: Array<{ meta: ReplayTrackMeta; gpxText: string }>;
  comparisonTracks: Array<{ meta: ReplayComparisonTrackMeta; gpxText: string }>;
}
