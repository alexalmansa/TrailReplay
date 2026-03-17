import type { PendingPicturePlacement, PictureAnnotation } from '@/types';

export interface EXIFData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: string;
  GPSDateStamp?: string;
  GPSTimeStamp?: string;
}

export interface RouteMatch {
  progress: number;
  lat: number;
  lon: number;
  distanceMeters: number;
}

export type ProcessPhotoResult =
  | { kind: 'picture'; picture: PictureAnnotation }
  | { kind: 'pending'; pendingPlacement: PendingPicturePlacement };

export const GPS_ROUTE_MATCH_THRESHOLD_METERS = 250;

export function createPendingPlacement(params: {
  id: string;
  file: File;
  url: string;
  timestamp?: Date;
  reason: PendingPicturePlacement['placementReason'];
  originalLat?: number;
  originalLon?: number;
  mismatchDistanceMeters?: number;
}): ProcessPhotoResult {
  return {
    kind: 'pending',
    pendingPlacement: {
      id: params.id,
      file: params.file,
      url: params.url,
      timestamp: params.timestamp,
      displayDuration: 5000,
      placementReason: params.reason,
      originalLat: params.originalLat,
      originalLon: params.originalLon,
      mismatchDistanceMeters: params.mismatchDistanceMeters,
    },
  };
}

export function resolvePhotoPlacement(params: {
  id: string;
  file: File;
  url: string;
  timestamp?: Date;
  exifData: EXIFData | null;
  routeMatch: RouteMatch | null;
  fallbackProgress: number;
}): ProcessPhotoResult {
  const { exifData, fallbackProgress, file, id, routeMatch, timestamp, url } = params;

  if (!exifData || exifData.latitude === undefined || exifData.longitude === undefined) {
    return createPendingPlacement({
      id,
      file,
      url,
      timestamp,
      reason: 'missing-gps',
    });
  }

  if (!routeMatch) {
    return createPendingPlacement({
      id,
      file,
      url,
      timestamp,
      reason: 'route-mismatch',
      originalLat: exifData.latitude,
      originalLon: exifData.longitude,
    });
  }

  if (routeMatch.distanceMeters > GPS_ROUTE_MATCH_THRESHOLD_METERS) {
    return createPendingPlacement({
      id,
      file,
      url,
      timestamp,
      reason: 'route-mismatch',
      originalLat: exifData.latitude,
      originalLon: exifData.longitude,
      mismatchDistanceMeters: routeMatch.distanceMeters,
    });
  }

  return {
    kind: 'picture',
    picture: {
      id,
      file,
      url,
      lat: routeMatch.lat,
      lon: routeMatch.lon,
      timestamp,
      progress: routeMatch.progress ?? fallbackProgress,
      position: routeMatch.progress ?? fallbackProgress,
      placementSource: 'gps',
      displayDuration: 5000,
    },
  };
}
