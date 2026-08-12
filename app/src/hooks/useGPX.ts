import { useCallback, useState } from 'react';
import { parseGPXFiles } from '@/utils/gpxParser';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { getDistanceBucket, trackEvent } from '@/utils/analytics';

export type RouteInputMethod = 'file_picker' | 'dropzone';

export function useGPX() {
  const { t } = useI18n();
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const addTrack = useAppStore((state) => state.addTrack);
  const setError = useAppStore((state) => state.setError);

  const parseFiles = useCallback(async (
    files: FileList | File[] | null,
    routeInputMethod: RouteInputMethod = 'file_picker',
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    setIsParsing(true);
    setParseError(null);
    trackEvent('route_import_started', {
      route_file_count: fileArray.length,
      route_input_method: routeInputMethod,
    });
    
    try {
      const tracks = await parseGPXFiles(fileArray);
      
      if (tracks.length === 0) {
        throw new Error(t('errors.noValidGpx'));
      }
      
      tracks.forEach((track) => {
        addTrack(track);
      });

      trackEvent('route_import_completed', {
        route_imported_track_count: tracks.length,
        route_input_method: routeInputMethod,
        route_total_distance_bucket: getDistanceBucket(
          tracks.reduce((total, track) => total + track.totalDistance, 0),
        ),
        route_has_timestamps: tracks.some((track) =>
          track.points.some((point) => point.time !== null)
        ),
      });
      
      return tracks;
    } catch (error) {
      trackEvent('route_import_failed', {
        route_file_count: fileArray.length,
        route_input_method: routeInputMethod,
        route_error_type: error instanceof Error && error.message === t('errors.noValidGpx')
          ? 'empty_result'
          : 'parse_error',
      });
      const message = error instanceof Error ? error.message : t('errors.parseGpxFailed');
      setParseError(message);
      setError(message);
      throw error;
    } finally {
      setIsParsing(false);
    }
  }, [addTrack, setError, t]);

  return {
    parseFiles,
    isParsing,
    parseError,
  };
}
