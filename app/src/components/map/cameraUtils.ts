/**
 * Scales a stability-tuned setting (0-1, where 0.5 matches the values tuned
 * below) into a multiplier applied to smoothing speed and deadbands. 0 = very
 * stable (quarter speed, wider deadbands), 1 = very reactive (1.75x speed,
 * narrower deadbands).
 */
export function cameraReactivityFromStability(cameraStability: number): number {
  const safeValue = Number.isFinite(cameraStability) ? cameraStability : 0.5;
  const clamped = Math.max(0, Math.min(1, safeValue));
  return 0.25 + clamped * 1.5;
}

/**
 * The smoothing constants below are per-call caps on how far the camera may
 * move. They were tuned against live playback, which updates the camera once
 * per rendered animation frame at roughly this interval. Deterministic video
 * export instead calls the smoothing functions once per *encoded* frame, so a
 * 30fps export calls them half as often as a 60fps export over the same
 * clip — without correcting for that, the exact same route plays back with
 * half the camera movement at 30fps and double at 60fps. Callers should scale
 * the elapsed *simulated playback time* between calls (not wall-clock time)
 * against this reference to keep the camera's real-world speed constant
 * regardless of frame rate. Wall-clock time doesn't work for this: during
 * deterministic export, playback time advances by a fixed step per encoded
 * frame independent of how long that frame actually takes to render.
 */
export const CAMERA_SMOOTHING_REFERENCE_FRAME_MS = 1000 / 60;

export function frameTimeMultiplierFromDeltaMs(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 1;
  // Clamp so a stalled tab or a very low export fps can't make a single call
  // fling the camera across a huge jump; it just catches up over a couple of
  // extra calls instead, which stays smooth since every step still eases
  // toward the same target pose.
  const clampedDeltaMs = Math.min(deltaMs, CAMERA_SMOOTHING_REFERENCE_FRAME_MS * 4);
  return clampedDeltaMs / CAMERA_SMOOTHING_REFERENCE_FRAME_MS;
}

export function smoothBearing(
  currentBearing: number,
  targetBearing: number,
  smoothingFactor: number = 0.03,
  stabilityDeadbandDegrees: number = 4,
  reactivity: number = 1,
  frameTimeMultiplier: number = 1,
): number {
  let diff = targetBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  // GPS traces frequently oscillate by a few degrees on an otherwise straight
  // section. At a close, pitched camera angle those tiny corrections read as
  // distracting side-to-side camera movement. Keep the current heading until
  // the route has made a meaningful turn; larger turns still take the normal
  // smooth, shortest-path transition below. A lower reactivity widens this
  // deadband (more stable); a higher one narrows it (more responsive). This
  // threshold is about ignoring GPS jitter, not about frame rate, so it is
  // deliberately left unscaled by frameTimeMultiplier.
  const deadband = stabilityDeadbandDegrees / reactivity;
  if (Math.abs(diff) < deadband) {
    return (currentBearing + 360) % 360;
  }

  // Keep sharp switchbacks cinematic rather than snapping the view sideways.
  const speed = reactivity * frameTimeMultiplier;
  const maxChange = 0.85 * speed;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor * speed));

  return (currentBearing + change + 360) % 360;
}

/**
 * Smooths the terrain-aware follow-camera zoom without letting minor elevation
 * estimate changes make the view pulse. Zooming in is deliberately slower than
 * zooming out: opening the frame quickly preserves a safe view of the marker
 * when the route enters steeper terrain.
 */
export function smoothZoom(
  currentZoom: number,
  targetZoom: number,
  smoothingFactor: number = 0.12,
  stabilityDeadband: number = 0.035,
  reactivity: number = 1,
  frameTimeMultiplier: number = 1,
): number {
  const diff = targetZoom - currentZoom;

  const deadband = stabilityDeadband / reactivity;
  if (Math.abs(diff) < deadband) {
    return currentZoom;
  }

  const speed = reactivity * frameTimeMultiplier;
  const maxChange = (diff < 0 ? 0.12 : 0.035) * speed;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor * speed));

  return currentZoom + change;
}

/**
 * Keeps terrain protection from visibly tilting the horizon in steps. Reducing
 * pitch opens the view, so that safety adjustment is allowed to happen faster
 * than pitching back down into a close cinematic angle.
 */
export function smoothPitch(
  currentPitch: number,
  targetPitch: number,
  smoothingFactor: number = 0.12,
  stabilityDeadband: number = 0.35,
  reactivity: number = 1,
  frameTimeMultiplier: number = 1,
): number {
  const diff = targetPitch - currentPitch;

  const deadband = stabilityDeadband / reactivity;
  if (Math.abs(diff) < deadband) {
    return currentPitch;
  }

  const speed = reactivity * frameTimeMultiplier;
  const maxChange = (diff < 0 ? 0.6 : 0.22) * speed;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor * speed));

  return currentPitch + change;
}

/**
 * Chases a target lng/lat the way MapLibre's `easeTo({ duration })` would if
 * retriggered every frame with a slowly moving target: each call advances by
 * the fraction of `chaseDurationMs` that has elapsed, so repeated calls trace
 * out the same decaying-lag path.
 *
 * Live playback used to get this lag "for free" from calling
 * `map.easeTo({ center, duration: 100 })` every animation frame — a fresh
 * 100ms linear ease queued on top of whatever ease was already in flight,
 * which averages out route/GPS jitter into a smooth pan. Deterministic export
 * instead has to render a fully-settled pose before every encoded frame (a
 * mid-ease frame would bake motion blur into a still image), so it applies
 * poses with `jumpTo` — which skipped this lag entirely and let every bit of
 * jitter in `currentPosition` show up directly, making the exported camera
 * visibly twitchier than the live preview of the exact same replay. Computing
 * the same lag by hand and passing the result to `jumpTo` in both places
 * keeps them visually identical while still letting export capture a
 * fully-settled frame each time.
 */
export function smoothCoordinate(
  current: [number, number],
  target: [number, number],
  deltaMs: number,
  chaseDurationMs: number = 100,
): [number, number] {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return target;

  const t = Math.min(1, deltaMs / chaseDurationMs);
  return [
    current[0] + (target[0] - current[0]) * t,
    current[1] + (target[1] - current[1]) * t,
  ];
}

export const TERRAIN_CAMERA_SETTINGS = {
  ELEVATION_RISK_METERS: 1200,
  STEEPNESS_RISK_FACTOR: 18,
  LOOK_AHEAD_PROGRESS: 0.02,
  MAX_ZOOM_OUT: 2,
  MAX_PITCH_REDUCE: 15,
  MIN_ZOOM: 8,
  MAX_ZOOM: 14,
  MIN_PITCH: 15,
  MAX_PITCH: 50,
} as const;

export function calculateTerrainAwareAdjustments(
  elevation: number,
  elevationData: Array<{ elevation: number; progress?: number }>,
  currentProgress: number
): { zoomAdjust: number; pitchAdjust: number } {
  // Absolute altitude is not what makes a replay camera lose its subject. The
  // problem is the climb relative to this route's lowest section: a track that
  // starts at sea level and climbs 1,500 m needs more room, while a flat route
  // entirely at 1,500 m does not. This also keeps the selected close framing at
  // the start of an alpine route and expands it progressively on the climb.
  const finiteElevations = elevationData
    .map((sample) => sample.elevation)
    .filter(Number.isFinite);
  const routeBaseElevation = finiteElevations.length > 0
    ? Math.min(...finiteElevations)
    : elevation;
  const relativeElevation = Math.max(0, elevation - routeBaseElevation);
  const elevationRisk = Math.min(
    relativeElevation / TERRAIN_CAMERA_SETTINGS.ELEVATION_RISK_METERS,
    1,
  );

  let steepnessRisk = 0;
  if (elevationData.length > 2) {
    const lookAhead = TERRAIN_CAMERA_SETTINGS.LOOK_AHEAD_PROGRESS;
    const behindIdx = Math.max(0, Math.floor((currentProgress - lookAhead) * (elevationData.length - 1)));
    const aheadIdx = Math.min(elevationData.length - 1, Math.floor((currentProgress + lookAhead) * (elevationData.length - 1)));
    const behindElev = elevationData[behindIdx]?.elevation || elevation;
    const aheadElev = elevationData[aheadIdx]?.elevation || elevation;
    const elevChange = Math.abs(aheadElev - behindElev);
    steepnessRisk = Math.min((elevChange / 100) * TERRAIN_CAMERA_SETTINGS.STEEPNESS_RISK_FACTOR / 100, 1);
  }

  const combinedRisk = Math.max(elevationRisk, steepnessRisk);

  return {
    zoomAdjust: combinedRisk * TERRAIN_CAMERA_SETTINGS.MAX_ZOOM_OUT,
    pitchAdjust: combinedRisk * TERRAIN_CAMERA_SETTINGS.MAX_PITCH_REDUCE,
  };
}
