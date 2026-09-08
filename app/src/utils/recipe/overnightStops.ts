import type { GPXPoint } from '@/types';
import { calculateDistance } from '@/utils/gpx/trackStats';
import type { RouteLeg } from './anchorOnRoute';

/**
 * Where consecutive legs meet: the end of one day and the start of the next is
 * where the night was spent. Derived from the tracks themselves, so "add the
 * places we slept" needs no coordinates from the author.
 */
export interface OvernightStop {
  /** The leg that ends here. */
  legIndex: number;
  lat: number;
  lon: number;
  elevation?: number;
  /** Hours between arriving and setting off again, when both tracks are timed. */
  gapHours: number | null;
  /** How far apart the two legs' endpoints are. A large value means a missing file. */
  moveMeters: number;
  arrival: Date | null;
  departure: Date | null;
}

/** Distance beyond which "the next day started somewhere else" is a gap, not a stop. */
const SAME_PLACE_METERS = 2_000;
/** Below this, two legs are the same day split across files rather than a night. */
const MIN_GAP_HOURS = 3;
/** Above this, the legs are from different trips rather than consecutive days. */
const MAX_GAP_HOURS = 36;

function lastTimed(points: GPXPoint[]): Date | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].time) return points[index].time;
  }
  return null;
}

function firstTimed(points: GPXPoint[]): Date | null {
  for (const point of points) {
    if (point.time) return point.time;
  }
  return null;
}

export interface OvernightStopsResult {
  stops: OvernightStop[];
  warnings: string[];
}

/**
 * A stop is recorded between every consecutive pair of legs. Whether the two
 * endpoints coincide is reported rather than used to reject: a night in a hut
 * and a night after a bus transfer are both nights, and only the author knows
 * which. The warning is what tells them a file is missing.
 */
export function deriveOvernightStops(legs: RouteLeg[]): OvernightStopsResult {
  const stops: OvernightStop[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < legs.length - 1; index += 1) {
    const current = legs[index].track;
    const next = legs[index + 1].track;
    const end = current.points[current.points.length - 1];
    const start = next.points[0];
    if (!end || !start) continue;

    const arrival = lastTimed(current.points);
    const departure = firstTimed(next.points);
    const gapHours = arrival && departure
      ? (departure.getTime() - arrival.getTime()) / 3_600_000
      : null;
    const moveMeters = calculateDistance(end.lat, end.lon, start.lat, start.lon);

    if (gapHours !== null && gapHours < MIN_GAP_HOURS) {
      warnings.push(
        `"${legs[index].name}" and "${legs[index + 1].name}" are ${gapHours.toFixed(1)} h apart — `
        + 'that looks like one day split across two files, not a night. No stop was placed.',
      );
      continue;
    }

    if (gapHours !== null && gapHours > MAX_GAP_HOURS) {
      warnings.push(
        `"${legs[index].name}" and "${legs[index + 1].name}" are ${Math.round(gapHours / 24)} days `
        + 'apart — those look like separate trips rather than consecutive days. '
        + 'A stop was still placed; drop only one trip\'s files if that is wrong.',
      );
    }

    if (moveMeters > SAME_PLACE_METERS) {
      warnings.push(
        `"${legs[index].name}" ends ${(moveMeters / 1000).toFixed(1)} km from where `
        + `"${legs[index + 1].name}" starts. The stop is placed where the day ended; `
        + 'if a track is missing between them, add it.',
      );
    }

    stops.push({
      legIndex: index,
      lat: end.lat,
      lon: end.lon,
      elevation: end.elevation,
      gapHours,
      moveMeters,
      arrival,
      departure,
    });
  }

  return { stops, warnings };
}

/**
 * "Night 2 · 3 May" — a usable label before any place lookup happens. The date
 * reads better than the gap length, and stays sensible when the gap is odd.
 */
export function describeStop(stop: OvernightStop, index: number): string {
  const night = `Night ${index + 1}`;
  if (!stop.arrival) return night;
  const date = stop.arrival.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${night} · ${date}`;
}
