import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { PendingPicturePlacement } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { isImageFile } from '@/utils/files';
import { createRenderableImageAsset } from '@/utils/imagePreview';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { createId } from '@/utils/id';
import type { ProcessPhotoResult } from '@/utils/photoPlacement';
import { resolvePhotoPlacement } from '@/utils/photoPlacement';
import { readPhotoMetadata } from '@/utils/photoMetadata';
import { findTimestampPlacement } from '@/utils/photoTimelinePlacement';
import type { RouteMatch } from '@/utils/routeProjection';
import { projectCoordinateToJourney, projectCoordinateToTracks } from '@/utils/routeProjection';
import { trackEvent } from '@/utils/analytics';

export function usePhotos() {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const pictures = useAppStore((state) => state.pictures);
  const addPicture = useAppStore((state) => state.addPicture);
  const queuePendingPicturePlacement = useAppStore((state) => state.queuePendingPicturePlacement);
  const removePicture = useAppStore((state) => state.removePicture);
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const playback = useAppStore((state) => state.playback);

  const findPositionOnRoute = useCallback((lat: number, lon: number): RouteMatch | null => {
    const computedJourney = buildComputedJourney(journeySegments, tracks);

    if (computedJourney && computedJourney.coordinates.length > 0) {
      return projectCoordinateToJourney(computedJourney, lat, lon, playback.progress);
    }

    const candidateTracks = activeTrackId
      ? [
          ...tracks.filter((track) => track.id === activeTrackId),
          ...tracks.filter((track) => track.id !== activeTrackId),
        ]
      : tracks;

    if (candidateTracks.length === 0) {
      return null;
    }

    return projectCoordinateToTracks(candidateTracks, lat, lon, playback.progress);
  }, [activeTrackId, journeySegments, playback.progress, tracks]);

  const processPhoto = useCallback(async (file: File): Promise<ProcessPhotoResult> => {
    const renderableAsset = await createRenderableImageAsset(file);
    const id = createId('photo');

    const metadata = await readPhotoMetadata(file);
    const routeMatch =
      metadata.latitude !== undefined && metadata.longitude !== undefined
        ? findPositionOnRoute(metadata.latitude, metadata.longitude)
        : null;
    const computedJourney = buildComputedJourney(journeySegments, tracks);
    const timestampPlacement = findTimestampPlacement({
      timestamp: metadata.timestamp,
      tracks,
      journeySegments,
      computedJourney,
      activeTrackId,
    });

    return resolvePhotoPlacement({
      id,
      file,
      displayFile: renderableAsset.displayFile,
      url: renderableAsset.url,
      timestamp: metadata.timestamp,
      metadata,
      gpsRouteMatch: routeMatch,
      timestampPlacement: timestampPlacement.match,
      timestampFailureReason: timestampPlacement.reason,
      fallbackProgress: playback.progress,
    });
  }, [activeTrackId, findPositionOnRoute, journeySegments, playback.progress, tracks]);

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
        trackEvent('photo_import_file_processed', {
          photo_file_name: file.name,
          photo_placement_result: result.kind === 'picture'
            ? (result.picture.placementSource ?? 'unknown')
            : 'pending',
          photo_manual_reason: result.kind === 'pending'
            ? result.pendingPlacement.placementReason
            : null,
        });

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
