import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface PlaybackProviderProps {
  children: React.ReactNode;
}

export function PlaybackProvider({ children }: PlaybackProviderProps) {
  const playback = useAppStore((state) => state.playback);
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const setPlayback = useAppStore((state) => state.setPlayback);
  const pause = useAppStore((state) => state.pause);
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  // Calculate total duration based on journey segments or active track
  const calculateTotalDuration = useCallback(() => {
    // If we have journey segments, use their total duration
    if (journeySegments.length > 0) {
      return journeySegments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
    }
    
    // Otherwise, use the active track duration
    if (!activeTrack) return 0;
    
    // If track has time data, use it
    if (activeTrack.totalTime > 0) {
      return activeTrack.totalTime * 1000; // Convert to milliseconds
    }
    
    // Otherwise, estimate based on distance (assuming average speed of 10 km/h)
    const estimatedHours = activeTrack.totalDistance / 10000; // 10 km/h in m/h
    return estimatedHours * 3600 * 1000; // Convert to milliseconds
  }, [journeySegments, activeTrack]);
  
  // Animation loop
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimeRef.current = 0;
      return;
    }
    
    const totalDuration = calculateTotalDuration();
    if (totalDuration === 0) return;
    
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      const newTime = playback.currentTime + deltaTime * playback.speed;
      
      if (newTime >= totalDuration) {
        // End of playback
        pause();
        setPlayback({ currentTime: totalDuration, progress: 1 });
      } else {
        const progress = totalDuration > 0 ? newTime / totalDuration : 0;
        setPlayback({ currentTime: newTime, progress });
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playback.isPlaying, playback.speed, playback.currentTime, calculateTotalDuration, pause, setPlayback]);
  
  // Update total duration when track or journey changes
  useEffect(() => {
    const totalDuration = calculateTotalDuration();
    setPlayback({ totalDuration });
  }, [journeySegments, activeTrack, calculateTotalDuration, setPlayback]);
  
  return <>{children}</>;
}
