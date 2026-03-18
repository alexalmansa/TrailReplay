import { useCallback, useState } from 'react';
import { parseGPXFiles } from '@/utils/gpxParser';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { handleAsyncError } from '@/utils/errorHandler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-gpx');

export function useGPX() {
  const { t } = useI18n();
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const addTrack = useAppStore((state) => state.addTrack);
  const setError = useAppStore((state) => state.setError);

  const parseFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsParsing(true);
    setParseError(null);
    
    try {
      const fileArray = Array.from(files);
      logger.info('Starting route import', {
        fileCount: fileArray.length,
        fileNames: fileArray.map((file) => file.name),
      });
      const tracks = await parseGPXFiles(fileArray);
      
      if (tracks.length === 0) {
        throw new Error(t('errors.noValidGpx'));
      }
      
      tracks.forEach((track) => {
        addTrack(track);
      });

      logger.info('Route import completed', {
        importedTrackCount: tracks.length,
        trackNames: tracks.map((track) => track.name),
      });
      
      return tracks;
    } catch (error) {
      const message = handleAsyncError(error, {
        scope: 'use-gpx',
        fallbackMessage: t('errors.parseGpxFailed'),
        onError: setError,
      });
      setParseError(message);
      logger.warn('Route import failed', {
        fileCount: files.length,
        errorMessage: message,
      });
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
