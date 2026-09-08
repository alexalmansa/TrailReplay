#!/usr/bin/env node
/**
 * Build a TrailReplay `.replay` project from a small JSON "recipe".
 *
 * The point is that annotating a route should not require driving the UI. A
 * recipe names GPX files and describes landmarks by the thing a source actually
 * publishes — a kilometre mark — and this resolves each one to the lat/lon and
 * route progress the app stores, then writes the archive.
 *
 * Usage:
 *   node scripts/make-replay.mjs <recipe.json> [-o out.replay]
 *
 * The format is documented in docs/AGENT_REPLAY_FILE.md. Node built-ins only,
 * so it runs from a clean checkout with no install step.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';
import { homedir } from 'node:os';

const FORMAT_VERSION = 1;

// ---------------------------------------------------------------------------
// Minimal zip writer (deflate, no external dependency)
// ---------------------------------------------------------------------------

function zipEntry(name, contents, offset) {
  const nameBytes = Buffer.from(name, 'utf8');
  const deflated = deflateRawSync(contents, { level: 6 });
  // A file that deflates larger than it started is stored instead.
  const useDeflate = deflated.length < contents.length;
  const body = useDeflate ? deflated : contents;
  const method = useDeflate ? 8 : 0;
  const sum = crc32(contents);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(0, 10); // mtime/mdate: fixed, so output is reproducible
  local.writeUInt32LE(sum, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(contents.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(0, 12);
  central.writeUInt32LE(sum, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(contents.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 38); // external attrs
  central.writeUInt32LE(offset, 42);

  return {
    local: Buffer.concat([local, nameBytes, body]),
    central: Buffer.concat([central, nameBytes]),
  };
}

function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [name, contents] of Object.entries(files)) {
    const entry = zipEntry(name, Buffer.from(contents), offset);
    locals.push(entry.local);
    centrals.push(entry.central);
    offset += entry.local.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(locals.length, 8);
  end.writeUInt16LE(locals.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralDirectory, end]);
}

// ---------------------------------------------------------------------------
// GPX geometry
// ---------------------------------------------------------------------------

/** Matches app/src/utils/journeyUtils.ts calculateDistance — kilometres. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Points with the cumulative distance the app will compute for them. Only
 * geometry is read; the archive ships the original GPX bytes, so anything else
 * in the file reaches the app untouched.
 */
function readTrack(gpxText, label) {
  const points = [];
  const pointPattern = /<trkpt\b[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>|<trkpt\b[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*\/>/g;

  for (const match of gpxText.matchAll(pointPattern)) {
    const lat = Number(match[1] ?? match[4]);
    const lon = Number(match[2] ?? match[5]);
    const elevation = Number(/<ele>([-\d.]+)<\/ele>/.exec(match[3] ?? '')?.[1] ?? Number.NaN);
    points.push({ lat, lon, elevation: Number.isFinite(elevation) ? elevation : undefined });
  }

  if (points.length < 2) {
    throw new Error(`${label}: found ${points.length} track points — expected a GPX with a <trk>`);
  }

  let total = 0;
  points[0].distance = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineKm(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    points[i].distance = total;
  }

  const name = /<trk>[\s\S]*?<name>([^<]*)<\/name>/.exec(gpxText)?.[1]?.trim()
    ?? /<name>([^<]*)<\/name>/.exec(gpxText)?.[1]?.trim();

  return { points, totalKm: total, gpxName: name };
}

/** Interpolate the point sitting `km` along the route. */
function pointAtKm(track, km) {
  if (km < 0 || km > track.totalKm + 1e-6) {
    throw new Error(`km ${km} is outside this route, which is ${track.totalKm.toFixed(2)} km long`);
  }

  const { points } = track;
  let index = points.findIndex((point) => point.distance >= km);
  if (index <= 0) index = km <= 0 ? 1 : points.length - 1;

  const before = points[index - 1];
  const after = points[index];
  const span = after.distance - before.distance;
  const fraction = span > 0 ? (km - before.distance) / span : 0;

  return {
    lat: before.lat + (after.lat - before.lat) * fraction,
    lon: before.lon + (after.lon - before.lon) * fraction,
    elevation: before.elevation !== undefined && after.elevation !== undefined
      ? before.elevation + (after.elevation - before.elevation) * fraction
      : before.elevation,
    km,
  };
}

/**
 * Nearest point on the route to a coordinate, mirroring what the app records
 * when a landmark is dropped on the map by hand.
 */
function projectToTrack(track, lat, lon) {
  let best = null;
  for (const point of track.points) {
    const distance = haversineKm(lat, lon, point.lat, point.lon);
    if (!best || distance < best.offRouteKm) {
      best = { offRouteKm: distance, km: point.distance };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Recipe -> project
// ---------------------------------------------------------------------------

function expandPath(value, recipeDir) {
  const expanded = value.startsWith('~/') ? resolve(homedir(), value.slice(2)) : value;
  return resolve(recipeDir, expanded);
}

function slugify(value, fallback) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

/**
 * Resolve where an annotation sits on the route. A recipe may anchor by `km`
 * (what race pages publish), by `lat`/`lon` (what a map pick gives), or by
 * `progress` directly.
 */
function anchor(entry, tracks, label) {
  const track = entry.track === undefined
    ? tracks[0]
    : tracks[typeof entry.track === 'number'
      ? entry.track
      : tracks.findIndex((candidate) => candidate.name === entry.track)];

  if (!track) throw new Error(`${label}: no track named ${JSON.stringify(entry.track)}`);

  if (entry.km !== undefined) {
    const point = pointAtKm(track, entry.km);
    return { ...point, progress: track.totalKm > 0 ? entry.km / track.totalKm : 0 };
  }

  if (entry.lat !== undefined && entry.lon !== undefined) {
    const match = projectToTrack(track, entry.lat, entry.lon);
    return {
      lat: entry.lat,
      lon: entry.lon,
      km: match.km,
      offRouteKm: match.offRouteKm,
      progress: track.totalKm > 0 ? match.km / track.totalKm : 0,
    };
  }

  if (entry.progress !== undefined) {
    const point = pointAtKm(track, entry.progress * track.totalKm);
    return { ...point, progress: entry.progress };
  }

  throw new Error(`${label}: needs one of "km", "lat"+"lon", or "progress"`);
}

function buildProject(recipe, recipeDir) {
  const routeFiles = {};
  const usedNames = new Set();
  const tracks = [];
  const trackMetas = [];

  for (const [index, spec] of (recipe.tracks ?? []).entries()) {
    if (!spec.file) throw new Error(`tracks[${index}]: "file" is required`);
    const path = expandPath(spec.file, recipeDir);
    const gpxText = readFileSync(path, 'utf8');
    const parsed = readTrack(gpxText, spec.file);
    const name = spec.name ?? parsed.gpxName ?? basename(path).replace(/\.gpx$/i, '');

    let routeFile = `routes/${slugify(name, `route-${index}`)}.gpx`;
    if (usedNames.has(routeFile)) routeFile = `routes/${slugify(name, 'route')}-${index}.gpx`;
    usedNames.add(routeFile);
    routeFiles[routeFile] = gpxText;

    tracks.push({ ...parsed, name });
    trackMetas.push({
      id: `track-${index}`,
      name,
      routeFile,
      ...(spec.color ? { color: spec.color } : {}),
      ...(spec.activityIcon ?? recipe.activityIcon
        ? { activityIcon: spec.activityIcon ?? recipe.activityIcon }
        : {}),
      ...(spec.visible === false ? { visible: false } : {}),
    });
  }

  if (tracks.length === 0) throw new Error('recipe has no tracks');

  const resolved = [];

  const userLandmarks = (recipe.landmarks ?? []).map((entry, index) => {
    const label = `landmarks[${index}] ${JSON.stringify(entry.title ?? '')}`;
    const at = anchor(entry, tracks, label);
    resolved.push({ kind: 'landmark', title: entry.title, ...at });

    return {
      id: entry.id ?? `recipe-landmark-${index}`,
      type: entry.type ?? 'custom',
      source: 'user',
      display: entry.display ?? 'highlight',
      lat: at.lat,
      lon: at.lon,
      progress: at.progress,
      ...(at.elevation !== undefined ? { elevation: Math.round(at.elevation) } : {}),
      title: entry.title ?? `Landmark ${index + 1}`,
      ...(entry.subtitle ? { subtitle: entry.subtitle } : {}),
      // 5 keeps every authored landmark through the replay's visibility budget
      // and its 250 m corridor rule, which only prunes below top importance.
      importance: entry.importance ?? 5,
      ...(entry.icon ? { icon: entry.icon } : {}),
      routeDistanceMeters: Math.round(at.km * 1000),
      ...(entry.color ? { color: entry.color } : {}),
    };
  });

  const textAnnotations = (recipe.annotations ?? []).map((entry, index) => {
    const label = `annotations[${index}] ${JSON.stringify(entry.title ?? '')}`;
    const at = anchor(entry, tracks, label);
    resolved.push({ kind: 'annotation', title: entry.title, ...at });

    return {
      id: entry.id ?? `recipe-annotation-${index}`,
      progress: at.progress,
      lat: at.lat,
      lon: at.lon,
      title: entry.title ?? '',
      ...(entry.subtitle ? { subtitle: entry.subtitle } : {}),
      color: entry.color ?? '#C1652F',
      ...(at.elevation !== undefined ? { elevation: Math.round(at.elevation) } : {}),
      displayDuration: entry.displayDuration ?? 5000,
    };
  });

  const project = {
    formatVersion: FORMAT_VERSION,
    tracks: trackMetas,
    activeTrackId: trackMetas[0].id,
    journey: {
      id: 'recipe-journey',
      name: recipe.name ?? trackMetas[0].name,
      segments: [],
      totalDuration: 0,
      totalDistance: 0,
    },
    userLandmarks,
    textAnnotations,
    // Authored landmarks are the point of the file; the derived ones would
    // compete with them for the map's label budget.
    showAutomaticLandmarks: recipe.showAutomaticLandmarks ?? false,
    ...(recipe.routeTimingMode ? { routeTimingMode: recipe.routeTimingMode } : {}),
    settings: {
      ...recipe.settings,
      trailStyle: {
        // A track colour set in the recipe should also colour the trail, which
        // is a setting rather than a track field.
        ...(trackMetas[0].color ? { trailColor: trackMetas[0].color, markerColor: trackMetas[0].color } : {}),
        ...(recipe.activityIcon ? { currentIcon: recipe.activityIcon } : {}),
        ...recipe.settings?.trailStyle,
      },
    },
    ...(recipe.cameraSettings ? { cameraSettings: recipe.cameraSettings } : {}),
    ...(recipe.videoExportSettings ? { videoExportSettings: recipe.videoExportSettings } : {}),
    ...(recipe.socialShareSettings ? { socialShareSettings: recipe.socialShareSettings } : {}),
  };

  return { project, routeFiles, tracks, resolved };
}

// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf('-o');
  const recipePath = args.find((arg, index) => !arg.startsWith('-') && (outFlag === -1 || index !== outFlag + 1));

  if (!recipePath) {
    console.error('Usage: node scripts/make-replay.mjs <recipe.json> [-o out.replay]');
    process.exit(1);
  }

  const recipeDir = dirname(resolve(recipePath));
  const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
  const { project, routeFiles, tracks, resolved } = buildProject(recipe, recipeDir);

  const outPath = outFlag !== -1
    ? resolve(args[outFlag + 1])
    : expandPath(recipe.output ?? `${slugify(recipe.name ?? 'project', 'project')}.replay`, recipeDir);

  writeFileSync(outPath, makeZip({
    ...routeFiles,
    'project.json': JSON.stringify(project, null, 2),
  }));

  for (const track of tracks) {
    console.log(`track  ${track.name} — ${track.totalKm.toFixed(2)} km, ${track.points.length} points`);
  }
  for (const entry of resolved) {
    const offRoute = entry.offRouteKm !== undefined
      ? `, ${Math.round(entry.offRouteKm * 1000)} m off route`
      : '';
    console.log(
      `${entry.kind === 'landmark' ? 'pin   ' : 'note  '} km ${entry.km.toFixed(2)}`
      + ` (${(entry.progress * 100).toFixed(1)}%) ${entry.lat.toFixed(5)},${entry.lon.toFixed(5)}`
      + `${offRoute} — ${entry.title}`,
    );
  }
  console.log(`\nwrote ${outPath}`);
}

main();
