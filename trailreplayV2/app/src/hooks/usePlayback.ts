import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getPointAtDistance } from '@/utils/gpxParser';

export function usePlayback() {
  const playback = useAppStore((state) => state.playback);
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const setPlayback = useAppStore((state) => state.setPlayback);
  const play = useAppStore((state) => state.play);
  const pause = useAppStore((state) => state.pause);
  const seek = useAppStore((state) => state.seek);
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  // Calculate total duration based on track
  const calculateTotalDuration = useCallback(() => {
    if (!activeTrack) return 0;
    
    // If track has time data, use it
    if (activeTrack.totalTime > 0) {
      return activeTrack.totalTime * 1000; // Convert to milliseconds
    }
    
    // Otherwise, estimate based on distance (assuming average speed of 10 km/h)
    const estimatedHours = activeTrack.totalDistance / 10000; // 10 km/h in m/h
    return estimatedHours * 3600 * 1000; // Convert to milliseconds
  }, [activeTrack]);
  
  // Get current position
  const getCurrentPosition = useCallback(() => {
    if (!activeTrack) return null;
    
    const totalDuration = calculateTotalDuration();
    if (totalDuration === 0) return activeTrack.points[0] || null;
    
    const progress = playback.currentTime / totalDuration;
    const distance = activeTrack.totalDistance * progress;
    
    return getPointAtDistance(activeTrack, distance);
  }, [activeTrack, playback.currentTime, calculateTotalDuration]);
  
  // Animation loop
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const totalDuration = calculateTotalDuration();
    
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
        seek(totalDuration);
      } else {
        seek(newTime);
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
  }, [playback.isPlaying, playback.speed, playback.currentTime, calculateTotalDuration, pause, seek]);
  
  // Update total duration when track changes
  useEffect(() => {
    const totalDuration = calculateTotalDuration();
    setPlayback({ totalDuration });
  }, [activeTrack, calculateTotalDuration, setPlayback]);
  
  const togglePlayback = useCallback(() => {
    if (playback.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playback.isPlaying, play, pause]);
  
  const seekToProgress = useCallback((progress: number) => {
    const totalDuration = calculateTotalDuration();
    seek(progress * totalDuration);
  }, [calculateTotalDuration, seek]);
  
  const restart = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);
  
  const skipForward = useCallback((seconds: number = 10) => {
    const totalDuration = calculateTotalDuration();
    seek(Math.min(playback.currentTime + seconds * 1000, totalDuration));
  }, [playback.currentTime, calculateTotalDuration, seek]);
  
  const skipBackward = useCallback((seconds: number = 10) => {
    seek(Math.max(playback.currentTime - seconds * 1000, 0));
  }, [playback.currentTime, seek]);
  
  return {
    isPlaying: playback.isPlaying,
    currentTime: playback.currentTime,
    totalDuration: playback.totalDuration,
    progress: playback.progress,
    speed: playback.speed,
    currentPosition: getCurrentPosition(),
    activeTrack,
    play,
    pause,
    togglePlayback,
    seek,
    seekToProgress,
    restart,
    skipForward,
    skipBackward,
    setSpeed: (speed: number) => setPlayback({ speed }),
  };
}
