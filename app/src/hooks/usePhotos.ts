import { useCallback, useState } from 'react';
import exifr from 'exifr';
import { toast } from 'sonner';
import type { PendingPicturePlacement } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { isImageFile } from '@/utils/files';
import { buildComputedJourney, calculateDistance } from '@/utils/journeyUtils';
import { createId } from '@/utils/id';
import type { EXIFData, ProcessPhotoResult, RouteMatch } from '@/utils/photoPlacement';
import { resolvePhotoPlacement } from '@/utils/photoPlacement';
import { trackEvent } from '@/utils/analytics';

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
    const id = createId('photo');
    
    // Extract EXIF data
    const exifData = await extractGPSData(file);
    
    let timestamp: Date | undefined;
    
    if (exifData) {
      // Use timestamp from EXIF
      if (exifData.DateTimeOriginal) {
        timestamp = new Date(exifData.DateTimeOriginal);
      } else if (exifData.GPSDateStamp && exifData.GPSTimeStamp) {
        timestamp = new Date(`${exifData.GPSDateStamp} ${exifData.GPSTimeStamp}`);
      }
    }

    const routeMatch =
      exifData?.latitude !== undefined && exifData.longitude !== undefined
        ? findPositionOnTrack(exifData.latitude, exifData.longitude)
        : null;

    return resolvePhotoPlacement({
      id,
      file,
      url,
      timestamp,
      exifData,
      routeMatch,
      fallbackProgress: playback.progress,
    });
  }, [extractGPSData, findPositionOnTrack, playback.progress]);

  const addPhotos = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const allFiles = Array.from(files);
      const imageFiles = allFiles.filter((file) => isImageFile(file));
      trackEvent('photo_import_started', {
        photo_received_file_count: allFiles.length,
        photo_image_file_count: imageFiles.length,
      });
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

      trackEvent('photo_import_completed', {
        photo_picture_count_added: imageFiles.length - queuedPlacements.length,
        photo_queued_for_manual_placement: queuedPlacements.length,
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
