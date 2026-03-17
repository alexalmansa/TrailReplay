import type { GPXPoint, GPXTrack } from '@/types';

export function interpolateTrackPoint(track: GPXTrack, distance: number): GPXPoint | null {
  if (track.points.length === 0) return null;
  if (distance <= 0) return track.points[0];
  if (distance >= track.totalDistance) return track.points[track.points.length - 1];

  let left = 0;
  let right = track.points.length - 1;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (track.points[middle].distance < distance) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  const pointIndex = Math.max(1, left);
  const previousPoint = track.points[pointIndex - 1];
  const nextPoint = track.points[pointIndex];
  const segmentDistance = nextPoint.distance - previousPoint.distance;

  if (segmentDistance === 0) return previousPoint;

  const ratio = (distance - previousPoint.distance) / segmentDistance;

  return {
    lat: previousPoint.lat + (nextPoint.lat - previousPoint.lat) * ratio,
    lon: previousPoint.lon + (nextPoint.lon - previousPoint.lon) * ratio,
    elevation: previousPoint.elevation + (nextPoint.elevation - previousPoint.elevation) * ratio,
    time: previousPoint.time && nextPoint.time
      ? new Date(previousPoint.time.getTime() + (nextPoint.time.getTime() - previousPoint.time.getTime()) * ratio)
      : null,
    heartRate: previousPoint.heartRate && nextPoint.heartRate
      ? previousPoint.heartRate + (nextPoint.heartRate - previousPoint.heartRate) * ratio
      : null,
    cadence: previousPoint.cadence && nextPoint.cadence
      ? previousPoint.cadence + (nextPoint.cadence - previousPoint.cadence) * ratio
      : null,
    power: previousPoint.power && nextPoint.power
      ? previousPoint.power + (nextPoint.power - previousPoint.power) * ratio
      : null,
    temperature: previousPoint.temperature && nextPoint.temperature
      ? previousPoint.temperature + (nextPoint.temperature - previousPoint.temperature) * ratio
      : null,
    distance,
    speed: previousPoint.speed + (nextPoint.speed - previousPoint.speed) * ratio,
  };
}
