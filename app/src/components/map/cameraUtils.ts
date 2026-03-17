export function smoothBearing(
  currentBearing: number,
  targetBearing: number,
  smoothingFactor: number = 0.015
): number {
  let diff = targetBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const maxChange = 2;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor));

  return (currentBearing + change + 360) % 360;
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
  elevationData: Array<{ elevation: number; progress: number }>,
  currentProgress: number
): { zoomAdjust: number; pitchAdjust: number } {
  const elevationRisk = Math.min(Math.max(0, elevation) / TERRAIN_CAMERA_SETTINGS.ELEVATION_RISK_METERS, 1);

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
