/**
 * Journey utilities for multi-track animations
 * Handles coordinate flattening, segment timing, and transport interpolation
 */

import type { GPXTrack, GPXPoint, JourneySegment, TrackSegment, TransportSegment } from '@/types';

// Transport mode speeds (km/h) for estimating transport duration
const TRANSPORT_SPEEDS: Record<string, number> = {
  car: 50,
  bus: 30,
  train: 80,
  plane: 500,
  bike: 15,
  walk: 4,
  ferry: 25,
};

// Transport mode icons
export const TRANSPORT_ICONS: Record<string, string> = {
  car: '🚗',
  bus: '🚌',
  train: '🚆',
  plane: '✈️',
  bike: '🚲',
  walk: '🚶',
  ferry: '⛴️',
};

/**
 * Represents a point in the flattened journey coordinate array
 */
export interface JourneyPoint extends GPXPoint {
  segmentIndex: number;
  segmentType: 'track' | 'transport';
  trackId?: string;
  transportMode?: string;
}

/**
 * Segment timing information for animation
 */
export interface SegmentTiming {
  segmentIndex: number;
  type: 'track' | 'transport';
  duration: number; // in ms
  startTime: number; // in ms
  endTime: number; // in ms
  startDistance: number; // in meters
  endDistance: number; // in meters
  startCoordIndex: number;
  endCoordIndex: number;
  progressStartRatio: number; // 0-1
  progressEndRatio: number; // 0-1
  distanceStartRatio: number; // 0-1
  distanceEndRatio: number; // 0-1
  trackId?: string;
  transportMode?: string;
  color?: string;
}

/**
 * Complete journey data with flattened coordinates and timing
 */
export interface ComputedJourney {
  coordinates: JourneyPoint[];
  segmentTimings: SegmentTiming[];
  totalDuration: number; // in ms
  totalDistance: number; // in meters (from gpxParser Haversine)
  trackDuration: number; // in ms
  transportDuration: number; // in ms
}

export interface JourneyDistanceProfile {
  coordinates: JourneyPoint[];
  cumulativeDistances: number[];
  totalDistance: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate points between two coordinates for smooth transport animation
 */
export function interpolateTransportRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  numPoints: number = 50
): Array<{ lat: number; lon: number; elevation: number }> {
  const points: Array<{ lat: number; lon: number; elevation: number }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lon: from.lon + (to.lon - from.lon) * t,
      elevation: 0, // Transport segments have no elevation data
    });
  }

  return points;
}

/**
 * Get the last point of a track
 */
export function getTrackEndPoint(track: GPXTrack): { lat: number; lon: number } {
  const lastPoint = track.points[track.points.length - 1];
  return { lat: lastPoint.lat, lon: lastPoint.lon };
}

/**
 * Get the first point of a track
 */
export function getTrackStartPoint(track: GPXTrack): { lat: number; lon: number } {
  const firstPoint = track.points[0];
  return { lat: firstPoint.lat, lon: firstPoint.lon };
}

/**
 * Build computed journey from segments and tracks
 * This flattens all coordinates and calculates timing
 */
export function buildComputedJourney(
  journeySegments: JourneySegment[],
  tracks: GPXTrack[]
): ComputedJourney | null {
  if (journeySegments.length === 0) {
    return null;
  }

  const coordinates: JourneyPoint[] = [];
  const segmentTimings: SegmentTiming[] = [];

  let totalDuration = 0;
  let totalDistance = 0;
  let trackDuration = 0;
  let transportDuration = 0;
  let currentCoordIndex = 0;
  let accumulatedTime = 0;
  let accumulatedDistance = 0;

  // First pass: calculate totals for progress ratios
  const totalJourneyDuration = journeySegments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
  const totalJourneyDistance = journeySegments.reduce((sum, segment) => {
    if (segment.type === 'track') {
      const track = tracks.find((t) => t.id === segment.trackId);
      return sum + (track?.totalDistance || 0);
    }

    return sum + calculateDistance(
      segment.from.lat,
      segment.from.lon,
      segment.to.lat,
      segment.to.lon
    ) * 1000;
  }, 0);

  journeySegments.forEach((segment, segmentIndex) => {
    const startCoordIndex = currentCoordIndex;
    const startTime = accumulatedTime;
    const startDistance = accumulatedDistance;
    let segmentDistance = 0;

    if (segment.type === 'track') {
      const trackSeg = segment as TrackSegment;
      const track = tracks.find((t) => t.id === trackSeg.trackId);

      if (track) {
        // Add all track points to the flattened array
        track.points.forEach((point) => {
          coordinates.push({
            ...point,
            segmentIndex,
            segmentType: 'track',
            trackId: track.id,
          });
          currentCoordIndex++;
        });

        segmentDistance = track.totalDistance;
        totalDistance += segmentDistance;
        trackDuration += segment.duration || 0;
      }
    } else {
      const transportSeg = segment as TransportSegment;

      // Interpolate points for transport animation
      const transportPoints = interpolateTransportRoute(
        transportSeg.from,
        transportSeg.to,
        50 // Number of interpolated points
      );

      const transportDistance = calculateDistance(
        transportSeg.from.lat,
        transportSeg.from.lon,
        transportSeg.to.lat,
        transportSeg.to.lon
      ) * 1000;

      let accDistance = 0;
      transportPoints.forEach((point, i) => {
        if (i > 0) {
          accDistance += calculateDistance(
            transportPoints[i - 1].lat,
            transportPoints[i - 1].lon,
            point.lat,
            point.lon
          ) * 1000;
        }

        coordinates.push({
          lat: point.lat,
          lon: point.lon,
          elevation: point.elevation,
          time: null,
          heartRate: null,
          cadence: null,
          power: null,
          temperature: null,
          distance: accDistance,
          speed: TRANSPORT_SPEEDS[transportSeg.mode] || 30,
          segmentIndex,
          segmentType: 'transport',
          transportMode: transportSeg.mode,
        });
        currentCoordIndex++;
      });

      segmentDistance = transportDistance;
      totalDistance += segmentDistance;
      transportDuration += segment.duration || 0;
    }

    const endCoordIndex = currentCoordIndex - 1;
    const endTime = startTime + (segment.duration || 0);
    const endDistance = startDistance + segmentDistance;
    accumulatedTime = endTime;
    accumulatedDistance = endDistance;
    totalDuration += segment.duration || 0;

    // Calculate progress ratios for this segment
    const progressStartRatio = totalJourneyDuration > 0 ? startTime / totalJourneyDuration : 0;
    const progressEndRatio = totalJourneyDuration > 0 ? endTime / totalJourneyDuration : 1;
    const distanceStartRatio = totalJourneyDistance > 0 ? startDistance / totalJourneyDistance : 0;
    const distanceEndRatio = totalJourneyDistance > 0 ? endDistance / totalJourneyDistance : 1;

    // Get track color if available
    let color: string | undefined;
    if (segment.type === 'track') {
      const track = tracks.find((t) => t.id === (segment as TrackSegment).trackId);
      color = track?.color;
    }

    segmentTimings.push({
      segmentIndex,
      type: segment.type,
      duration: segment.duration || 0,
      startTime,
      endTime,
      startDistance,
      endDistance,
      startCoordIndex,
      endCoordIndex,
      progressStartRatio,
      progressEndRatio,
      distanceStartRatio,
      distanceEndRatio,
      trackId: segment.type === 'track' ? (segment as TrackSegment).trackId : undefined,
      transportMode: segment.type === 'transport' ? (segment as TransportSegment).mode : undefined,
      color,
    });
  });

  return {
    coordinates,
    segmentTimings,
    totalDuration,
    totalDistance,
    trackDuration,
    transportDuration,
  };
}

function clampDistance(distance: number, totalDistance: number) {
  return Math.max(0, Math.min(distance, totalDistance));
}

function interpolateNullableNumber(
  start: number | null,
  end: number | null,
  ratio: number
): number | null {
  if (start == null && end == null) return null;
  if (start == null) return end;
  if (end == null) return start;
  return start + (end - start) * ratio;
}

export function buildJourneyDistanceProfile(coordinates: JourneyPoint[]): JourneyDistanceProfile | null {
  if (coordinates.length === 0) return null;

  const cumulativeDistances: number[] = [0];

  for (let i = 1; i < coordinates.length; i += 1) {
    const previous = coordinates[i - 1];
    const current = coordinates[i];
    const isSameTrackSegment =
      previous.segmentIndex === current.segmentIndex &&
      previous.segmentType === 'track' &&
      current.segmentType === 'track' &&
      previous.trackId === current.trackId;

    const delta = isSameTrackSegment && current.distance >= previous.distance
      ? current.distance - previous.distance
      : calculateDistance(previous.lat, previous.lon, current.lat, current.lon) * 1000;

    cumulativeDistances.push(cumulativeDistances[i - 1] + Math.max(0, delta));
  }

  return {
    coordinates,
    cumulativeDistances,
    totalDistance: cumulativeDistances[cumulativeDistances.length - 1] ?? 0,
  };
}

function findDistanceIndex(profile: JourneyDistanceProfile, distance: number): number {
  let left = 0;
  let right = profile.cumulativeDistances.length - 1;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (profile.cumulativeDistances[middle] < distance) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

/**
 * Get the current segment and local progress based on global progress (0-1)
 */
export function getSegmentAtProgress(
  progress: number,
  segmentTimings: SegmentTiming[]
): { segment: SegmentTiming; localProgress: number } | null {
  if (segmentTimings.length === 0) return null;

  // Clamp progress
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Find which segment contains this progress
  for (const segment of segmentTimings) {
    if (clampedProgress >= segment.progressStartRatio && clampedProgress <= segment.progressEndRatio) {
      const segmentRange = segment.progressEndRatio - segment.progressStartRatio;
      const localProgress = segmentRange > 0
        ? (clampedProgress - segment.progressStartRatio) / segmentRange
        : 0;

      return { segment, localProgress };
    }
  }

  // If we're at the very end, return the last segment
  const lastSegment = segmentTimings[segmentTimings.length - 1];
  return { segment: lastSegment, localProgress: 1 };
}

/**
 * Get interpolated point at a given progress (0-1) through the journey
 */
export function getJourneyPointAtProgress(
  progress: number,
  coordinates: JourneyPoint[],
  segmentTimings: SegmentTiming[]
): JourneyPoint | null {
  if (coordinates.length === 0 || segmentTimings.length === 0) return null;

  const segmentInfo = getSegmentAtProgress(progress, segmentTimings);
  if (!segmentInfo) return null;

  const { segment, localProgress } = segmentInfo;

  // Calculate the exact coordinate index within this segment
  const segmentCoordCount = segment.endCoordIndex - segment.startCoordIndex;
  const exactIndex = segment.startCoordIndex + localProgress * segmentCoordCount;

  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.min(lowerIndex + 1, coordinates.length - 1);
  const t = exactIndex - lowerIndex;

  const lower = coordinates[lowerIndex];
  const upper = coordinates[upperIndex];

  if (!lower || !upper) return coordinates[coordinates.length - 1];

  // Interpolate between the two points
  return {
    lat: lower.lat + (upper.lat - lower.lat) * t,
    lon: lower.lon + (upper.lon - lower.lon) * t,
    elevation: lower.elevation + (upper.elevation - lower.elevation) * t,
    time: lower.time,
    heartRate: lower.heartRate,
    cadence: lower.cadence,
    power: lower.power,
    temperature: lower.temperature,
    distance: lower.distance + (upper.distance - lower.distance) * t,
    speed: lower.speed + (upper.speed - lower.speed) * t,
    segmentIndex: segment.segmentIndex,
    segmentType: segment.type,
    trackId: segment.trackId,
    transportMode: segment.transportMode,
  };
}

export function getJourneyDistanceAtProgress(
  progress: number,
  profile: JourneyDistanceProfile,
  segmentTimings: SegmentTiming[]
): number {
  if (profile.coordinates.length === 0 || segmentTimings.length === 0) return 0;

  const segmentInfo = getSegmentAtProgress(progress, segmentTimings);
  if (!segmentInfo) return 0;

  const { segment, localProgress } = segmentInfo;
  const segmentCoordCount = segment.endCoordIndex - segment.startCoordIndex;
  const exactIndex = segment.startCoordIndex + localProgress * segmentCoordCount;
  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.min(lowerIndex + 1, profile.cumulativeDistances.length - 1);
  const ratio = exactIndex - lowerIndex;
  const lowerDistance = profile.cumulativeDistances[lowerIndex] ?? 0;
  const upperDistance = profile.cumulativeDistances[upperIndex] ?? lowerDistance;

  return lowerDistance + (upperDistance - lowerDistance) * ratio;
}

export function getJourneyPointAtDistance(
  profile: JourneyDistanceProfile,
  distance: number
): JourneyPoint | null {
  if (profile.coordinates.length === 0) return null;

  const clampedDistance = clampDistance(distance, profile.totalDistance);
  if (clampedDistance <= 0) return profile.coordinates[0];
  if (clampedDistance >= profile.totalDistance) {
    return profile.coordinates[profile.coordinates.length - 1];
  }

  const pointIndex = Math.max(1, findDistanceIndex(profile, clampedDistance));
  const lowerIndex = pointIndex - 1;
  const upperIndex = pointIndex;
  const lower = profile.coordinates[lowerIndex];
  const upper = profile.coordinates[upperIndex];
  const startDistance = profile.cumulativeDistances[lowerIndex];
  const endDistance = profile.cumulativeDistances[upperIndex];
  const span = endDistance - startDistance;
  const ratio = span > 0 ? (clampedDistance - startDistance) / span : 0;
  const metaPoint = ratio < 1 ? lower : upper;
  const isSameTrackSegment =
    lower.segmentIndex === upper.segmentIndex &&
    lower.segmentType === 'track' &&
    upper.segmentType === 'track' &&
    lower.trackId === upper.trackId;

  return {
    lat: lower.lat + (upper.lat - lower.lat) * ratio,
    lon: lower.lon + (upper.lon - lower.lon) * ratio,
    elevation: lower.elevation + (upper.elevation - lower.elevation) * ratio,
    time: lower.time && upper.time
      ? new Date(lower.time.getTime() + (upper.time.getTime() - lower.time.getTime()) * ratio)
      : metaPoint.time,
    heartRate: interpolateNullableNumber(lower.heartRate, upper.heartRate, ratio),
    cadence: interpolateNullableNumber(lower.cadence, upper.cadence, ratio),
    power: interpolateNullableNumber(lower.power, upper.power, ratio),
    temperature: interpolateNullableNumber(lower.temperature, upper.temperature, ratio),
    distance: isSameTrackSegment
      ? lower.distance + (upper.distance - lower.distance) * ratio
      : metaPoint.distance,
    speed: lower.speed + (upper.speed - lower.speed) * ratio,
    segmentIndex: metaPoint.segmentIndex,
    segmentType: metaPoint.segmentType,
    trackId: metaPoint.trackId,
    transportMode: metaPoint.transportMode,
  };
}

/**
 * Get completed coordinates up to a progress point
 */
export function getCompletedCoordinates(
  progress: number,
  coordinates: JourneyPoint[],
  segmentTimings: SegmentTiming[]
): number[][] {
  if (coordinates.length === 0 || segmentTimings.length === 0) return [];

  const segmentInfo = getSegmentAtProgress(progress, segmentTimings);
  if (!segmentInfo) return [];

  const { segment, localProgress } = segmentInfo;

  // Calculate the exact coordinate index
  const segmentCoordCount = segment.endCoordIndex - segment.startCoordIndex;
  const exactIndex = segment.startCoordIndex + localProgress * segmentCoordCount;
  const endIndex = Math.ceil(exactIndex);

  // Return coordinates up to the current point
  const completedCoords: number[][] = [];
  for (let i = 0; i <= Math.min(endIndex, coordinates.length - 1); i++) {
    completedCoords.push([coordinates[i].lon, coordinates[i].lat]);
  }

  // Add interpolated current point
  const currentPoint = getJourneyPointAtProgress(progress, coordinates, segmentTimings);
  if (currentPoint && completedCoords.length > 0) {
    completedCoords.push([currentPoint.lon, currentPoint.lat]);
  }

  return completedCoords;
}

export function getCompletedCoordinatesAtDistance(
  profile: JourneyDistanceProfile,
  distance: number
): number[][] {
  if (profile.coordinates.length === 0) return [];

  const clampedDistance = clampDistance(distance, profile.totalDistance);
  const completed: number[][] = [];

  for (let i = 0; i < profile.coordinates.length; i += 1) {
    if (profile.cumulativeDistances[i] > clampedDistance) {
      break;
    }

    const point = profile.coordinates[i];
    completed.push([point.lon, point.lat]);
  }

  const currentPoint = getJourneyPointAtDistance(profile, clampedDistance);
  if (
    currentPoint &&
    (completed.length === 0 ||
      completed[completed.length - 1][0] !== currentPoint.lon ||
      completed[completed.length - 1][1] !== currentPoint.lat)
  ) {
    completed.push([currentPoint.lon, currentPoint.lat]);
  }

  return completed;
}

/**
 * Get all coordinates for the full journey line
 */
export function getAllJourneyCoordinates(coordinates: JourneyPoint[]): number[][] {
  return coordinates.map((p) => [p.lon, p.lat]);
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const lon1 = (from.lon * Math.PI) / 180;
  const lon2 = (to.lon * Math.PI) / 180;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Get bearing at a progress point
 */
export function getBearingAtProgress(
  progress: number,
  coordinates: JourneyPoint[],
  segmentTimings: SegmentTiming[]
): number {
  if (coordinates.length < 2) return 0;

  const segmentInfo = getSegmentAtProgress(progress, segmentTimings);
  if (!segmentInfo) return 0;

  const { segment, localProgress } = segmentInfo;

  // Calculate current position index
  const segmentCoordCount = segment.endCoordIndex - segment.startCoordIndex;
  const currentIndex = Math.floor(segment.startCoordIndex + localProgress * segmentCoordCount);

  // Look ahead for bearing calculation
  const lookAhead = Math.min(10, coordinates.length - currentIndex - 1);
  const nextIndex = Math.min(currentIndex + lookAhead, coordinates.length - 1);

  const current = coordinates[currentIndex];
  const next = coordinates[nextIndex];

  if (!current || !next) return 0;

  return calculateBearing(
    { lat: current.lat, lon: current.lon },
    { lat: next.lat, lon: next.lon }
  );
}

export function getBearingAtDistance(profile: JourneyDistanceProfile, distance: number): number {
  if (profile.coordinates.length < 2) return 0;

  const clampedDistance = clampDistance(distance, profile.totalDistance);
  const currentPoint = getJourneyPointAtDistance(profile, clampedDistance);
  const lookAheadDistance = Math.max(profile.totalDistance * 0.01, 10);
  const nextPoint = getJourneyPointAtDistance(
    profile,
    Math.min(clampedDistance + lookAheadDistance, profile.totalDistance)
  );

  if (!currentPoint || !nextPoint) return 0;

  return calculateBearing(
    { lat: currentPoint.lat, lon: currentPoint.lon },
    { lat: nextPoint.lat, lon: nextPoint.lon }
  );
}

export function getSegmentAtDistance(
  profile: JourneyDistanceProfile,
  distance: number,
  segmentTimings: SegmentTiming[]
): { segment: SegmentTiming; localProgress: number } | null {
  const point = getJourneyPointAtDistance(profile, distance);
  if (!point) return null;

  const segment = segmentTimings.find((timing) => timing.segmentIndex === point.segmentIndex);
  if (!segment) return null;

  const clampedDistance = clampDistance(distance, profile.totalDistance);
  const segmentSpan = segment.endDistance - segment.startDistance;
  const localProgress = segmentSpan > 0
    ? (clampedDistance - segment.startDistance) / segmentSpan
    : 0;

  return {
    segment,
    localProgress: Math.max(0, Math.min(localProgress, 1)),
  };
}

/**
 * Get elevation data for the journey (for elevation profile)
 */
export function getJourneyElevationData(
  coordinates: JourneyPoint[],
  segmentTimings: SegmentTiming[]
): Array<{
  distance: number;
  elevation: number;
  progress: number;
  segmentIndex: number;
  segmentType: 'track' | 'transport';
}> {
  void segmentTimings;
  if (coordinates.length === 0) return [];

  const data: Array<{
    distance: number;
    elevation: number;
    progress: number;
    segmentIndex: number;
    segmentType: 'track' | 'transport';
  }> = [];

  let totalDistance = 0;
  const totalCoords = coordinates.length;

  coordinates.forEach((point, i) => {
    if (i > 0) {
      totalDistance += calculateDistance(
        coordinates[i - 1].lat,
        coordinates[i - 1].lon,
        point.lat,
        point.lon
      );
    }

    data.push({
      distance: totalDistance,
      elevation: point.elevation,
      progress: i / (totalCoords - 1),
      segmentIndex: point.segmentIndex,
      segmentType: point.segmentType,
    });
  });

  return data;
}
