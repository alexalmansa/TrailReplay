import type { RouteLandmark } from '@/types/landmarks';

export interface LandmarkVisibilityInput {
  mode: 'overview' | 'follow' | 'follow-behind';
  preset?: 'very-close' | 'close' | 'medium' | 'far';
  progress: number;
  totalDistanceMeters: number;
  currentDistanceMeters?: number;
}

export function selectVisibleLandmarks(landmarks: RouteLandmark[], input: LandmarkVisibilityInput): RouteLandmark[] {
  const ranked = [...landmarks].sort((a, b) => b.importance - a.importance);
  if (input.mode === 'overview') return ranked.filter((landmark) => landmark.importance >= 4).concat(ranked.filter((landmark) => landmark.importance < 4).slice(0, 8));
  const radius = input.preset === 'very-close'
    ? 1_500
    : input.preset === 'close'
      ? 5_000
      : input.preset === 'far'
        ? 20_000
        : 10_000;
  const currentDistance = input.currentDistanceMeters
    ?? input.progress * input.totalDistanceMeters;
  const aroundMarker = ranked.filter((landmark) => Math.abs((landmark.routeDistanceMeters ?? 0) - currentDistance) <= radius);
  if (input.preset === 'very-close') return aroundMarker.slice(0, 6);
  return aroundMarker.slice(0, 16);
}
