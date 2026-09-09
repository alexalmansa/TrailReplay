import type { GPXTrack } from '@/types';
import { RecipeError, type Recipe, type RecipeTrackGlob, type RecipeTrackSpec } from './types';

/**
 * A recipe names files by whatever path the author had — `~/Downloads/day-1.gpx`
 * — but the browser only ever sees the dropped file's own name. Matching is
 * therefore on the basename, and case- and separator-insensitive, so a recipe
 * written against a local path still finds the file the user dropped.
 */
export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function normalize(path: string): string {
  return basename(path).toLowerCase();
}

function stripExtension(name: string): string {
  return name.replace(/\.(gpx|kml)$/i, '');
}

/** `*.gpx`, `day-*.gpx`, `**\/*.gpx` — only `*` is meaningful. */
function globToRegExp(pattern: string): RegExp {
  const escaped = normalize(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*+/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** First timestamp in a track, for chronological ordering. */
function startTime(track: GPXTrack): number | null {
  for (const point of track.points) {
    if (point.time) return point.time.getTime();
  }
  return null;
}

export interface MatchedTrack {
  track: GPXTrack;
  spec: RecipeTrackSpec;
}

function matchOne(
  spec: RecipeTrackSpec,
  available: Map<string, GPXTrack>,
  label: string,
): GPXTrack {
  const wanted = normalize(spec.file);
  const exact = available.get(wanted);
  if (exact) return exact;

  // A recipe written before the file was renamed, or a `.gpx` the user exported
  // as `.kml`, should still land rather than failing the whole import.
  const wantedStem = stripExtension(wanted);
  for (const [name, track] of available) {
    if (stripExtension(name) === wantedStem) return track;
  }

  throw new RecipeError(
    `${label}: no dropped file named "${basename(spec.file)}". `
    + `Got: ${[...available.keys()].join(', ') || 'nothing'}`,
  );
}

/**
 * Pair each track spec with the file it names, in the order the replay should
 * run. A glob takes whatever was dropped, which is what makes "add all the
 * walks I did last week" a single line.
 */
export function matchTrackFiles(
  specs: Recipe['tracks'],
  tracks: GPXTrack[],
  fileNames: string[],
): MatchedTrack[] {
  if (tracks.length === 0) throw new RecipeError('No GPX or KML files were dropped with the recipe');

  const available = new Map<string, GPXTrack>();
  tracks.forEach((track, index) => {
    available.set(normalize(fileNames[index] ?? track.name), track);
  });

  if (!specs) {
    return tracks.map((track) => ({ track, spec: { file: '' } }));
  }

  if (!Array.isArray(specs)) {
    return matchGlob(specs, tracks, fileNames);
  }

  return specs.map((spec, index) => {
    if (!spec?.file) throw new RecipeError(`tracks[${index}]: "file" is required`);
    return { track: matchOne(spec, available, `tracks[${index}]`), spec };
  });
}

function matchGlob(glob: RecipeTrackGlob, tracks: GPXTrack[], fileNames: string[]): MatchedTrack[] {
  const pattern = globToRegExp(glob.files ?? '*');
  const matched = tracks
    .map((track, index) => ({ track, name: normalize(fileNames[index] ?? track.name) }))
    .filter((entry) => pattern.test(entry.name));

  if (matched.length === 0) {
    throw new RecipeError(
      `No dropped file matches "${glob.files}". Got: ${fileNames.map(basename).join(', ')}`,
    );
  }

  const order = glob.order ?? 'chronological';
  if (order === 'chronological') {
    // Files without timestamps keep their dropped order, after the timed ones,
    // rather than being silently interleaved at epoch zero.
    const timed = matched.filter((entry) => startTime(entry.track) !== null);
    const untimed = matched.filter((entry) => startTime(entry.track) === null);
    timed.sort((left, right) => startTime(left.track)! - startTime(right.track)!);
    matched.splice(0, matched.length, ...timed, ...untimed);
  } else if (order === 'name') {
    matched.sort((left, right) => left.name.localeCompare(right.name));
  }

  const colors = Array.isArray(glob.color) ? glob.color : glob.color ? [glob.color] : [];

  return matched.map((entry, index) => ({
    track: entry.track,
    spec: {
      file: entry.name,
      ...(colors.length > 0 ? { color: colors[index % colors.length] } : {}),
      ...(glob.activityIcon ? { activityIcon: glob.activityIcon } : {}),
    },
  }));
}
