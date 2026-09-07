import type { RouteLandmark } from '@/types/landmarks';

let counter = 0;

/** Ids stay recognisable so a user landmark is never confused with an OSM one. */
export function createUserLandmarkId() {
  counter += 1;
  return `user-landmark-${Date.now().toString(36)}-${counter}`;
}

export function createUserLandmark({
  lat,
  lon,
  progress,
  title = 'New landmark',
}: {
  lat: number;
  lon: number;
  progress: number | null;
  title?: string;
}): RouteLandmark {
  return {
    id: createUserLandmarkId(),
    type: 'custom',
    source: 'user',
    display: 'highlight',
    lat,
    lon,
    progress,
    title,
    // Top importance keeps a landmark the user placed by hand from being
    // dropped by the replay's visibility budget.
    importance: 5,
    icon: 'pin',
  };
}
