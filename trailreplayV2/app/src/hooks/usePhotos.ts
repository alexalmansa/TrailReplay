import { useCallback, useState } from 'react';
import exifr from 'exifr';
import type { PictureAnnotation } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { isImageFile } from '@/utils/files';

interface EXIFData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: string;
  GPSDateStamp?: string;
  GPSTimeStamp?: string;
}

export function usePhotos() {
  const [isProcessing, setIsProcessing] = useState(false);
  const pictures = useAppStore((state) => state.pictures);
  const addPicture = useAppStore((state) => state.addPicture);
  const removePicture = useAppStore((state) => state.removePicture);
  const tracks = useAppStore((state) => state.tracks);
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

  const findPositionOnTrack = useCallback((lat: number, lon: number): number => {
    if (tracks.length === 0) return playback.progress;
    
    const track = tracks[0];
    let minDistance = Infinity;
    let closestPosition = playback.progress;
    
    track.points.forEach((point) => {
      const distance = Math.sqrt(
        Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = point.distance / track.totalDistance;
      }
    });
    
    return closestPosition;
  }, [tracks, playback.progress]);

  const processPhoto = useCallback(async (file: File): Promise<PictureAnnotation> => {
    const url = URL.createObjectURL(file);
    
    // Extract EXIF data
    const exifData = await extractGPSData(file);
    
    let position = playback.progress;
    let lat: number | undefined;
    let lon: number | undefined;
    let timestamp: Date | undefined;
    
    if (exifData) {
      // Use GPS coordinates from EXIF
      if (exifData.latitude !== undefined && exifData.longitude !== undefined) {
        lat = exifData.latitude;
        lon = exifData.longitude;
        position = findPositionOnTrack(lat, lon);
      }
      
      // Use timestamp from EXIF
      if (exifData.DateTimeOriginal) {
        timestamp = new Date(exifData.DateTimeOriginal);
      } else if (exifData.GPSDateStamp && exifData.GPSTimeStamp) {
        timestamp = new Date(`${exifData.GPSDateStamp} ${exifData.GPSTimeStamp}`);
      }
    }
    
    const picture: PictureAnnotation = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url,
      lat,
      lon,
      timestamp,
      progress: position,
      position,
      displayDuration: 5000,
    };
    
    return picture;
  }, [extractGPSData, findPositionOnTrack, playback.progress]);

  const addPhotos = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const imageFiles = Array.from(files).filter((file) => isImageFile(file));
      
      for (const file of imageFiles) {
        const picture = await processPhoto(file);
        addPicture(picture);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [addPicture, processPhoto]);

  return {
    pictures,
    isProcessing,
    addPhotos,
    removePicture,
  };
}
