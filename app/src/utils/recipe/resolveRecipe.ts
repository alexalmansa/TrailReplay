import type { GPXTrack, IconChange, JourneySegment, TextAnnotation } from '@/types';
import type { RouteLandmark } from '@/types/landmarks';
import { createId } from '@/utils/id';
import { anchorOnRoute, buildLegs, type RouteAnchor, type RouteLeg } from './anchorOnRoute';
import { matchTrackFiles } from './matchTrackFiles';
import { deriveOvernightStops, describeStop } from './overnightStops';
import {
  RecipeError,
  type Recipe,
  type RecipeAnnotation,
  type RecipeLandmark,
  type RecipeReport,
  type RecipeResolvedEntry,
} from './types';

/** Total replay length when legs are stitched and the recipe says nothing. */
const DEFAULT_TOTAL_DURATION_MS = 60_000;
const DEFAULT_ANNOTATION_MS = 5_000;

export interface ResolvedRecipe {
  tracks: GPXTrack[];
  activeTrackId: string;
  journeySegments: JourneySegment[];
  userLandmarks: RouteLandmark[];
  textAnnotations: TextAnnotation[];
  iconChanges: IconChange[];
  report: RecipeReport;
}

function entry(title: string, at: RouteAnchor, derived?: boolean): RecipeResolvedEntry {
  return {
    title,
    trackName: at.leg.name,
    km: at.trackMeters / 1000,
    progress: at.progress,
    ...(at.offRouteMeters !== undefined ? { offRouteMeters: Math.round(at.offRouteMeters) } : {}),
    ...(derived ? { derived: true } : {}),
  };
}

function landmarkFrom(
  spec: RecipeLandmark,
  at: RouteAnchor,
  id: string,
  title: string,
  derived: boolean,
): RouteLandmark {
  return {
    id,
    type: spec.type ?? 'custom',
    source: 'user',
    display: spec.display ?? 'highlight',
    lat: at.lat,
    lon: at.lon,
    progress: at.progress,
    ...(at.elevation !== undefined ? { elevation: Math.round(at.elevation) } : {}),
    title,
    ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
    // Top importance keeps an authored pin through the replay's visibility
    // budget and its 250 m corridor rule, which only prunes below 5.
    importance: spec.importance ?? 5,
    ...(spec.icon ? { icon: spec.icon } : {}),
    routeDistanceMeters: Math.round(at.routeDistanceMeters),
    ...(spec.color ? { color: spec.color } : {}),
    ...(derived ? { metadata: { tags: { recipe: 'derived' } } } : {}),
  };
}

function annotationFrom(
  spec: RecipeAnnotation,
  at: RouteAnchor,
  id: string,
  title: string,
): TextAnnotation {
  return {
    id,
    progress: at.progress,
    lat: at.lat,
    lon: at.lon,
    title,
    ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
    color: spec.color ?? '#C1652F',
    ...(at.elevation !== undefined ? { elevation: Math.round(at.elevation) } : {}),
    displayDuration: spec.displayDuration ?? DEFAULT_ANNOTATION_MS,
  };
}

/** Anchors for a derived set, as `{ anchor, title }` pairs ready to place. */
function expandAuto(
  auto: string,
  legs: RouteLeg[],
  warnings: string[],
): Array<{ track: number; km: number; title: string }> {
  if (auto === 'start') {
    return [{ track: 0, km: 0, title: 'Start' }];
  }

  if (auto === 'finish' || auto === 'start-finish') {
    const last = legs[legs.length - 1];
    const finish = {
      track: legs.length - 1,
      km: last.track.totalDistance / 1000,
      title: 'Finish',
    };
    if (auto === 'finish') return [finish];

    // On a loop the two coincide and the app collapses pins within 80 m, so one
    // pin saying both is what the author actually wants.
    const start = legs[0].track.points[0];
    const end = last.track.points[last.track.points.length - 1];
    const sameSpot = start && end
      && Math.abs(start.lat - end.lat) < 0.001 && Math.abs(start.lon - end.lon) < 0.001;
    return sameSpot
      ? [{ track: 0, km: 0, title: 'Start / Finish' }]
      : [{ track: 0, km: 0, title: 'Start' }, finish];
  }

  if (auto === 'overnight-stops') {
    const { stops, warnings: stopWarnings } = deriveOvernightStops(legs);
    warnings.push(...stopWarnings);
    return stops.map((stop, index) => ({
      track: stop.legIndex,
      km: legs[stop.legIndex].track.totalDistance / 1000,
      title: describeStop(stop, index),
    }));
  }

  throw new RecipeError(`Unknown "auto" value: ${auto}`);
}

export function resolveRecipe(
  recipe: Recipe,
  tracks: GPXTrack[],
  fileNames: string[],
): ResolvedRecipe {
  const matched = matchTrackFiles(recipe.tracks, tracks, fileNames);

  const named = matched.map((match, index) => ({
    track: match.track,
    name: match.spec.name ?? match.track.name,
    duration: match.spec.duration,
    spec: match.spec,
    index,
  }));

  const stitched = (recipe.mode ?? 'stitch') === 'stitch' && named.length > 1;
  const { legs, durations } = buildLegs(named, {
    stitched,
    legDuration: recipe.legDuration ?? 'by-distance',
    totalDuration: recipe.totalDuration ?? DEFAULT_TOTAL_DURATION_MS,
  });

  // Presentation the recipe asked for, applied to the app's parsed tracks.
  const resolvedTracks = named.map((item) => {
    const track = item.track;
    track.name = item.name;
    if (item.spec.color) track.color = item.spec.color;
    const icon = item.spec.activityIcon ?? recipe.activityIcon;
    if (icon) track.activityIcon = icon;
    if (item.spec.visible === false) track.visible = false;
    return track;
  });

  const warnings: string[] = [];

  const landmarks: RouteLandmark[] = [];
  const landmarkEntries: RecipeResolvedEntry[] = [];
  (recipe.landmarks ?? []).forEach((spec, index) => {
    const label = `landmarks[${index}]${spec.title ? ` "${spec.title}"` : ''}`;
    if (spec.auto) {
      for (const [autoIndex, derived] of expandAuto(spec.auto, legs, warnings).entries()) {
        const at = anchorOnRoute({ track: derived.track, km: derived.km }, legs, label);
        const title = spec.title ? `${spec.title} ${autoIndex + 1}` : derived.title;
        landmarks.push(landmarkFrom(spec, at, spec.id ?? createId('recipe-landmark'), title, true));
        landmarkEntries.push(entry(title, at, true));
      }
      return;
    }
    const at = anchorOnRoute(spec, legs, label);
    const title = spec.title ?? `Landmark ${index + 1}`;
    landmarks.push(landmarkFrom(spec, at, spec.id ?? createId('recipe-landmark'), title, false));
    landmarkEntries.push(entry(title, at));
  });

  const annotations: TextAnnotation[] = [];
  const annotationEntries: RecipeResolvedEntry[] = [];
  (recipe.annotations ?? []).forEach((spec, index) => {
    const label = `annotations[${index}]${spec.title ? ` "${spec.title}"` : ''}`;
    if (spec.auto) {
      for (const [autoIndex, derived] of expandAuto(spec.auto, legs, warnings).entries()) {
        const at = anchorOnRoute({ track: derived.track, km: derived.km }, legs, label);
        const title = spec.title ? `${spec.title} ${autoIndex + 1}` : derived.title;
        annotations.push(annotationFrom(spec, at, spec.id ?? createId('recipe-note'), title));
        annotationEntries.push(entry(title, at, true));
      }
      return;
    }
    const at = anchorOnRoute(spec, legs, label);
    const title = spec.title ?? '';
    annotations.push(annotationFrom(spec, at, spec.id ?? createId('recipe-note'), title));
    annotationEntries.push(entry(title, at));
  });

  const iconChanges: IconChange[] = [];
  const iconEntries: RecipeResolvedEntry[] = [];
  (recipe.iconChanges ?? []).forEach((spec, index) => {
    const label = `iconChanges[${index}]`;
    if (!spec.icon) throw new RecipeError(`${label}: "icon" is required`);
    const at = anchorOnRoute(spec, legs, label);
    iconChanges.push({
      id: spec.id ?? createId('recipe-icon'),
      progress: at.progress,
      icon: spec.icon,
      ...(spec.label ? { label: spec.label } : {}),
    });
    iconEntries.push(entry(spec.label ?? spec.icon, at));
  });

  warnings.push(...collidingPins(landmarks));
  warnings.push(...overlappingCards(annotations, recipe.totalDuration ?? DEFAULT_TOTAL_DURATION_MS));

  const activeIndex = typeof recipe.activeTrack === 'number'
    ? recipe.activeTrack
    : recipe.activeTrack
      ? named.findIndex((item) => item.name.toLowerCase() === String(recipe.activeTrack).toLowerCase())
      : 0;
  const activeTrack = resolvedTracks[activeIndex] ?? resolvedTracks[0];

  return {
    tracks: resolvedTracks,
    activeTrackId: activeTrack.id,
    journeySegments: stitched
      ? resolvedTracks.map((track, index) => ({
        id: createId(`segment-${track.id}`),
        type: 'track' as const,
        trackId: track.id,
        duration: durations[index],
      }))
      : [],
    userLandmarks: landmarks,
    textAnnotations: annotations,
    iconChanges,
    report: {
      trackCount: resolvedTracks.length,
      totalDistanceMeters: resolvedTracks.reduce((sum, track) => sum + track.totalDistance, 0),
      stitched,
      landmarks: landmarkEntries,
      annotations: annotationEntries,
      iconChanges: iconEntries,
      warnings,
    },
  };
}

/**
 * The map collapses pins within 80 m of each other, so a colliding pair is a
 * pin the author will not find and will not be told about at render time.
 */
function collidingPins(landmarks: RouteLandmark[]): string[] {
  const warnings: string[] = [];
  for (let i = 0; i < landmarks.length; i += 1) {
    for (let j = i + 1; j < landmarks.length; j += 1) {
      const metres = Math.hypot(
        (landmarks[i].lat - landmarks[j].lat) * 111_320,
        (landmarks[i].lon - landmarks[j].lon) * 111_320 * Math.cos(landmarks[i].lat * Math.PI / 180),
      );
      if (metres < 80) {
        warnings.push(
          `"${landmarks[i].title}" and "${landmarks[j].title}" are ${Math.round(metres)} m apart; `
          + 'the map keeps only one pin below 80 m. Merge them into one.',
        );
      }
    }
  }
  return warnings;
}

/** Two cards whose on-screen windows overlap fight for the same corner. */
function overlappingCards(annotations: TextAnnotation[], totalDuration: number): string[] {
  const sorted = [...annotations].sort((left, right) => left.progress - right.progress);
  const warnings: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const gapMs = (current.progress - previous.progress) * totalDuration;
    if (gapMs < current.displayDuration) {
      warnings.push(
        `"${previous.title}" and "${current.title}" are ${Math.round(gapMs / 1000)} s apart but the `
        + `second shows for ${Math.round(current.displayDuration / 1000)} s, so they overlap. `
        + 'Shorten displayDuration or lengthen the replay.',
      );
    }
  }
  return warnings;
}
