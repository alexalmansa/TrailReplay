import { useCallback, useState } from 'react';
import exifr from 'exifr';
import { toast } from 'sonner';
import type { PendingPicturePlacement } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { isImageFile } from '@/utils/files';
import { buildComputedJourney, calculateDistance } from '@/utils/journeyUtils';
import { createId } from '@/utils/id';
import { handleAsyncError } from '@/utils/errorHandler';
import { optimizeImageFile } from '@/utils/imageOptimization';
import type { EXIFData, ProcessPhotoResult, RouteMatch } from '@/utils/photoPlacement';
import { resolvePhotoPlacement } from '@/utils/photoPlacement';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-photos');

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
      handleAsyncError(error, {
        scope: 'photo-exif',
        fallbackMessage: 'Failed to extract image metadata',
        metadata: { fileName: file.name },
      });
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
    const optimizedFile = await optimizeImageFile(file);
    const url = URL.createObjectURL(optimizedFile);
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

    const result = resolvePhotoPlacement({
      id,
      file: optimizedFile,
      url,
      timestamp,
      exifData,
      routeMatch,
      fallbackProgress: playback.progress,
    });

    logger.info('Photo processed', {
      fileName: file.name,
      optimized: optimizedFile.name !== file.name || optimizedFile.size !== file.size,
      hadGps: Boolean(exifData?.latitude !== undefined && exifData.longitude !== undefined),
      placementKind: result.kind,
      routeMatchDistanceMeters: routeMatch?.distanceMeters,
    });

    return result;
  }, [extractGPSData, findPositionOnTrack, playback.progress]);

  const addPhotos = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const imageFiles = Array.from(files).filter((file) => isImageFile(file));
      logger.info('Starting photo import', {
        receivedFileCount: Array.from(files).length,
        imageFileCount: imageFiles.length,
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

      if (queuedPlacements.length === 1) {
        toast.warning(t('media.manualPlacementQueuedSingle'));
      } else if (queuedPlacements.length > 1) {
        toast.warning(t('media.manualPlacementQueuedMultiple', { count: queuedPlacements.length }));
      }

      logger.info('Photo import completed', {
        pictureCountAdded: imageFiles.length - queuedPlacements.length,
        queuedForManualPlacement: queuedPlacements.length,
      });
    } catch (error) {
      const message = handleAsyncError(error, {
        scope: 'use-photos',
        fallbackMessage: 'Failed to process images',
      });
      logger.warn('Photo import failed', {
        errorMessage: message,
      });
      throw error;
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
