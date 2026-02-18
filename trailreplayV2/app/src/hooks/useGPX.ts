import { useCallback, useState } from 'react';
import { parseGPXFiles } from '@/utils/gpxParser';
import { useAppStore } from '@/store/useAppStore';

export function useGPX() {
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
        throw new Error('No valid GPX files found');
      }
      
      tracks.forEach((track) => {
        addTrack(track);
      });
      
      return tracks;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse GPX files';
      setParseError(message);
      setError(message);
      throw error;
    } finally {
      setIsParsing(false);
    }
  }, [addTrack, setError]);

  return {
    parseFiles,
    isParsing,
    parseError,
  };
}
