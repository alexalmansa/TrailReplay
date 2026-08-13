import { getFollowBehindCameraTarget } from '@/utils/followBehindCamera';
import {
  calculateTerrainAwareAdjustments,
  TERRAIN_CAMERA_SETTINGS,
} from '@/components/map/cameraUtils';

export type ReplayCameraMode = 'overview' | 'follow' | 'follow-behind';

export interface ReplayCameraPose {
  bearing: number;
  center: [number, number];
  pitch: number;
  zoom: number;
}

interface CameraPlanOptions {
  cameraMode: ReplayCameraMode;
  coordinates: number[][];
  elevationData: Array<{ elevation: number; progress?: number }>;
  followBehindZoomLevel: number;
  progress: number;
}

const FOLLOW_CAMERA_ZOOM = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getRouteCoordinateAtProgress(
  coordinates: number[][],
  progress: number,
): [number, number] | null {
  if (coordinates.length === 0) return null;

  const index = Math.round(clamp(progress, 0, 1) * (coordinates.length - 1));
  const coordinate = coordinates[index];
  return coordinate ? [coordinate[0], coordinate[1]] : null;
}

export function getRouteBearingAtProgress(
  coordinates: number[][],
  progress: number,
): number {
  if (coordinates.length < 2) return 0;

  const index = Math.round(clamp(progress, 0, 1) * (coordinates.length - 1));
  const current = coordinates[index];
  const lookAhead = coordinates[Math.min(index + 10, coordinates.length - 1)];
  if (!current || !lookAhead) return 0;

  const lat1 = (current[1] * Math.PI) / 180;
  const lat2 = (lookAhead[1] * Math.PI) / 180;
  const lon1 = (current[0] * Math.PI) / 180;
  const lon2 = (lookAhead[0] * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Camera pose at the end of the cinematic intro. */
export function getIntroCameraPose(options: CameraPlanOptions): ReplayCameraPose | null {
  const center = getRouteCoordinateAtProgress(options.coordinates, options.progress);
  if (!center || options.cameraMode === 'overview') return null;

  if (options.cameraMode === 'follow') {
    return { center, zoom: FOLLOW_CAMERA_ZOOM, pitch: 0, bearing: 0 };
  }

  const preset = getFollowBehindCameraTarget(options.followBehindZoomLevel, 'intro');
  const elevationIndex = Math.round(clamp(options.progress, 0, 1) * Math.max(0, options.elevationData.length - 1));
  const elevation = options.elevationData[elevationIndex]?.elevation ?? 0;
  const { zoomAdjust, pitchAdjust } = calculateTerrainAwareAdjustments(
    elevation,
    options.elevationData,
    options.progress,
  );

  return {
    center,
    zoom: clamp(
      preset.zoom - zoomAdjust,
      TERRAIN_CAMERA_SETTINGS.MIN_ZOOM,
      TERRAIN_CAMERA_SETTINGS.MAX_ZOOM,
    ),
    pitch: clamp(
      preset.pitch - pitchAdjust,
      TERRAIN_CAMERA_SETTINGS.MIN_PITCH,
      TERRAIN_CAMERA_SETTINGS.MAX_PITCH,
    ),
    bearing: getRouteBearingAtProgress(options.coordinates, options.progress),
  };
}

/** Steady-state pose that the playback camera converges toward. */
export function getPlaybackCameraPose(options: CameraPlanOptions): ReplayCameraPose | null {
  const center = getRouteCoordinateAtProgress(options.coordinates, options.progress);
  if (!center || options.cameraMode === 'overview') return null;

  if (options.cameraMode === 'follow') {
    return { center, zoom: FOLLOW_CAMERA_ZOOM, pitch: 0, bearing: 0 };
  }

  const preset = getFollowBehindCameraTarget(options.followBehindZoomLevel, 'playback');
  return {
    center,
    zoom: preset.zoom,
    pitch: preset.pitch,
    bearing: getRouteBearingAtProgress(options.coordinates, options.progress),
  };
}

export function getOpeningPreloadProgresses(
  totalDurationMs: number,
  windowMs: number,
  sampleCount: number,
): number[] {
  const duration = Math.max(1, totalDurationMs);
  const endProgress = clamp(windowMs / duration, 0, 1);
  const count = Math.max(1, Math.floor(sampleCount));

  return Array.from({ length: count }, (_, index) => (
    count === 1 ? 0 : (endProgress * index) / (count - 1)
  ));
}
