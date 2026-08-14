export function smoothBearing(
  currentBearing: number,
  targetBearing: number,
  smoothingFactor: number = 0.03,
  stabilityDeadbandDegrees: number = 4,
): number {
  let diff = targetBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  // GPS traces frequently oscillate by a few degrees on an otherwise straight
  // section. At a close, pitched camera angle those tiny corrections read as
  // distracting side-to-side camera movement. Keep the current heading until
  // the route has made a meaningful turn; larger turns still take the normal
  // smooth, shortest-path transition below.
  if (Math.abs(diff) < stabilityDeadbandDegrees) {
    return (currentBearing + 360) % 360;
  }

  // Keep sharp switchbacks cinematic rather than snapping the view sideways.
  const maxChange = 0.85;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor));

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
): number {
  const diff = targetZoom - currentZoom;

  if (Math.abs(diff) < stabilityDeadband) {
    return currentZoom;
  }

  const maxChange = diff < 0 ? 0.12 : 0.035;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor));

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
): number {
  const diff = targetPitch - currentPitch;

  if (Math.abs(diff) < stabilityDeadband) {
    return currentPitch;
  }

  const maxChange = diff < 0 ? 0.6 : 0.22;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor));

  return currentPitch + change;
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
