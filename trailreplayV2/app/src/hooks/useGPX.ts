import { useCallback, useState } from 'react';
import { parseGPXFiles } from '@/utils/gpxParser';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';

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
      const tracks = await parseGPXFiles(fileArray);
      
      if (tracks.length === 0) {
        throw new Error(t('errors.noValidGpx'));
      }
      
      tracks.forEach((track) => {
        addTrack(track);
      });
      
      return tracks;
    } catch (error) {
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
