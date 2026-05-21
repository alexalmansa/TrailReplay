import type { CameraSettings } from '@/types';

export const DEFAULT_FOLLOW_BEHIND_PRESET: CameraSettings['followBehindPreset'] = 'medium';
export const FOLLOW_BEHIND_ZOOM_MIN = 0;
export const FOLLOW_BEHIND_ZOOM_MAX = 100;

type FollowBehindCameraAnchor = {
  id: CameraSettings['followBehindPreset'];
  level: number;
  pitch: number;
  zoom: number;
};

type FollowBehindCameraProfile = 'intro' | 'playback';

const PLAYBACK_CAMERA_ANCHORS: FollowBehindCameraAnchor[] = [
  { id: 'far', level: 0, zoom: 11, pitch: 30 },
  { id: 'medium', level: 33, zoom: 14, pitch: 35 },
  { id: 'close', level: 66, zoom: 15, pitch: 45 },
  { id: 'very-close', level: 100, zoom: 16, pitch: 55 },
];

const INTRO_CAMERA_ANCHORS: FollowBehindCameraAnchor[] = [
  { id: 'far', level: 0, zoom: 14, pitch: 45 },
  { id: 'medium', level: 33, zoom: 15, pitch: 50 },
  { id: 'close', level: 66, zoom: 16, pitch: 55 },
  { id: 'very-close', level: 100, zoom: 17, pitch: 60 },
];

function getFollowBehindCameraAnchors(profile: FollowBehindCameraProfile): FollowBehindCameraAnchor[] {
  return profile === 'intro' ? INTRO_CAMERA_ANCHORS : PLAYBACK_CAMERA_ANCHORS;
}

function clampFollowBehindZoomLevel(level: number): number {
  return Math.min(FOLLOW_BEHIND_ZOOM_MAX, Math.max(FOLLOW_BEHIND_ZOOM_MIN, level));
}

function interpolateCameraAnchor(
  level: number,
  anchors: FollowBehindCameraAnchor[],
): { zoom: number; pitch: number } {
  const clampedLevel = clampFollowBehindZoomLevel(level);
  const lowerAnchor = anchors.reduce((closest, anchor) => (
    anchor.level <= clampedLevel ? anchor : closest
  ), anchors[0]);
  const upperAnchor = anchors.find((anchor) => anchor.level >= clampedLevel) ?? anchors[anchors.length - 1];

  if (lowerAnchor.level === upperAnchor.level) {
    return {
      zoom: lowerAnchor.zoom,
      pitch: lowerAnchor.pitch,
    };
  }

  const progress = (clampedLevel - lowerAnchor.level) / (upperAnchor.level - lowerAnchor.level);

  return {
    zoom: lowerAnchor.zoom + ((upperAnchor.zoom - lowerAnchor.zoom) * progress),
    pitch: lowerAnchor.pitch + ((upperAnchor.pitch - lowerAnchor.pitch) * progress),
  };
}

export function getFollowBehindZoomLevelForPreset(
  preset: CameraSettings['followBehindPreset'],
): number {
  const anchor = PLAYBACK_CAMERA_ANCHORS.find((candidate) => candidate.id === preset);
  return anchor?.level ?? PLAYBACK_CAMERA_ANCHORS[1].level;
}

export function getNearestFollowBehindPreset(
  level: number,
): CameraSettings['followBehindPreset'] {
  const clampedLevel = clampFollowBehindZoomLevel(level);

  return PLAYBACK_CAMERA_ANCHORS.reduce((closest, anchor) => {
    const currentDistance = Math.abs(anchor.level - clampedLevel);
    const closestDistance = Math.abs(closest.level - clampedLevel);
    return currentDistance < closestDistance ? anchor : closest;
  }, PLAYBACK_CAMERA_ANCHORS[0]).id;
}

export function getFollowBehindZoomLevelFromZoom(
  zoom: number,
  profile: FollowBehindCameraProfile,
): number {
  const anchors = getFollowBehindCameraAnchors(profile);
  const lowerAnchor = anchors.reduce((closest, anchor) => (
    anchor.zoom <= zoom ? anchor : closest
  ), anchors[0]);
  const upperAnchor = anchors.find((anchor) => anchor.zoom >= zoom) ?? anchors[anchors.length - 1];

  if (lowerAnchor.zoom === upperAnchor.zoom) {
    return lowerAnchor.level;
  }

  const progress = (zoom - lowerAnchor.zoom) / (upperAnchor.zoom - lowerAnchor.zoom);

  return clampFollowBehindZoomLevel(
    lowerAnchor.level + ((upperAnchor.level - lowerAnchor.level) * progress),
  );
}

export function getFollowBehindCameraTarget(
  level: number,
  profile: FollowBehindCameraProfile,
): { zoom: number; pitch: number } {
  return interpolateCameraAnchor(
    level,
    getFollowBehindCameraAnchors(profile),
  );
}
