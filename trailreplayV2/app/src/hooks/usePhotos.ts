import { useCallback, useState } from 'react';
import exifr from 'exifr';
import { toast } from 'sonner';
import type { PendingPicturePlacement, PictureAnnotation } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { isImageFile } from '@/utils/files';
import { buildComputedJourney, calculateDistance } from '@/utils/journeyUtils';

interface EXIFData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: string;
  GPSDateStamp?: string;
  GPSTimeStamp?: string;
}

interface RouteMatch {
  progress: number;
  lat: number;
  lon: number;
  distanceMeters: number;
}

type ProcessPhotoResult =
  | { kind: 'picture'; picture: PictureAnnotation }
  | { kind: 'pending'; pendingPlacement: PendingPicturePlacement };

const GPS_ROUTE_MATCH_THRESHOLD_METERS = 250;

function createPictureId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createPendingPlacement(params: {
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

export function usePhotos() {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const pictures = useAppStore((state) => state.pictures);
  const addPicture = useAppStore((state) => state.addPicture);
  const queuePendingPicturePlacement = useAppStore((state) => state.queuePendingPicturePlacement);
  const removePicture = useAppStore((state) => state.removePicture);
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);

  const extractGPSData = useCallback(async (file: File): Promise<EXIFData | null> => {
    try {
      const exifData = await exifr.parse(file, ['gps', 'exif', 'ifd0']);
      
      if (!exifData) return null;
      
      return {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
        DateTimeOriginal: exifData.DateTimeOriginal,
        GPSDateStamp: exifData.GPSDateStamp,
        GPSTimeStamp: exifData.GPSTimeStamp,
      };
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      return null;
    }
  }, []);

  const findPositionOnTrack = useCallback((lat: number, lon: number): RouteMatch | null => {
    const computedJourney = buildComputedJourney(journeySegments, tracks);

    if (computedJourney && computedJourney.coordinates.length > 0) {
      let closestIndex = 0;
      let minDistanceKm = Infinity;

      computedJourney.coordinates.forEach((point, index) => {
        const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
        if (distanceKm < minDistanceKm) {
          minDistanceKm = distanceKm;
          closestIndex = index;
        }
      });

      const closestPoint = computedJourney.coordinates[closestIndex];
      if (!closestPoint) return null;

      return {
        progress:
          computedJourney.coordinates.length > 1
            ? closestIndex / (computedJourney.coordinates.length - 1)
            : playback.progress,
        lat: closestPoint.lat,
        lon: closestPoint.lon,
        distanceMeters: minDistanceKm * 1000,
      };
    }

    const track = tracks[0];
    if (!track || track.points.length === 0) return null;

    let closestPoint = track.points[0];
    let minDistanceKm = Infinity;

    track.points.forEach((point) => {
      const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
      if (distanceKm < minDistanceKm) {
        minDistanceKm = distanceKm;
        closestPoint = point;
      }
    });

    return {
      progress: track.totalDistance > 0 ? closestPoint.distance / track.totalDistance : playback.progress,
      lat: closestPoint.lat,
      lon: closestPoint.lon,
      distanceMeters: minDistanceKm * 1000,
    };
  }, [journeySegments, playback.progress, tracks]);

  const processPhoto = useCallback(async (file: File): Promise<ProcessPhotoResult> => {
    const url = URL.createObjectURL(file);
    const id = createPictureId();
    
    // Extract EXIF data
    const exifData = await extractGPSData(file);
    
    let position = playback.progress;
    let lat: number | undefined;
    let lon: number | undefined;
    let timestamp: Date | undefined;
    
    if (exifData) {
      // Use timestamp from EXIF
      if (exifData.DateTimeOriginal) {
        timestamp = new Date(exifData.DateTimeOriginal);
      } else if (exifData.GPSDateStamp && exifData.GPSTimeStamp) {
        timestamp = new Date(`${exifData.GPSDateStamp} ${exifData.GPSTimeStamp}`);
      }

      // Use GPS coordinates from EXIF
      if (exifData.latitude !== undefined && exifData.longitude !== undefined) {
        const routeMatch = findPositionOnTrack(exifData.latitude, exifData.longitude);

        if (routeMatch && routeMatch.distanceMeters > GPS_ROUTE_MATCH_THRESHOLD_METERS) {
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

        if (routeMatch) {
          lat = routeMatch.lat;
          lon = routeMatch.lon;
          position = routeMatch.progress;
        } else {
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
      } else {
        return createPendingPlacement({
          id,
          file,
          url,
          timestamp,
          reason: 'missing-gps',
        });
      }
    } else {
      return createPendingPlacement({
        id,
        file,
        url,
        timestamp,
        reason: 'missing-gps',
      });
    }
    
    const picture: PictureAnnotation = {
      id,
      file,
      url,
      lat,
      lon,
      timestamp,
      progress: position,
      position,
      displayDuration: 5000,
    };
    
    return { kind: 'picture', picture };
  }, [extractGPSData, findPositionOnTrack, playback.progress]);

  const addPhotos = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const imageFiles = Array.from(files).filter((file) => isImageFile(file));
      const queuedPlacements: PendingPicturePlacement[] = [];

      for (const file of imageFiles) {
        const result = await processPhoto(file);

        if (result.kind === 'picture') {
          addPicture(result.picture);
          continue;
        }

        queuedPlacements.push(result.pendingPlacement);
      }

      queuedPlacements.forEach((pendingPlacement) => {
        queuePendingPicturePlacement(pendingPlacement);
      });

      if (queuedPlacements.length === 1) {
        toast.warning(t('media.manualPlacementQueuedSingle'));
      } else if (queuedPlacements.length > 1) {
        toast.warning(t('media.manualPlacementQueuedMultiple', { count: queuedPlacements.length }));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [addPicture, processPhoto, queuePendingPicturePlacement, t]);

  return {
    pictures,
    isProcessing,
    addPhotos,
    removePicture,
  };
}
