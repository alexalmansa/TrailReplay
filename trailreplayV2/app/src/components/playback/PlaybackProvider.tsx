import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface PlaybackProviderProps {
  children: React.ReactNode;
}

// Animation timing constants
const INTRO_DURATION = 2000; // 2 seconds for cinematic zoom-in
const OUTRO_DELAY = 1000; // 1 second delay before zoom-out
const OUTRO_DURATION = 3000; // 3 seconds for zoom-out
const AUTO_RESET_DELAY = 3000; // 3 seconds after outro before auto-reset

export function PlaybackProvider({ children }: PlaybackProviderProps) {
  const playback = useAppStore((state) => state.playback);
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const cinematicPlayed = useAppStore((state) => state.cinematicPlayed);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setPlayback = useAppStore((state) => state.setPlayback);
  const pause = useAppStore((state) => state.pause);
  const setCinematicPlayed = useAppStore((state) => state.setCinematicPlayed);
  const setAnimationPhase = useAppStore((state) => state.setAnimationPhase);
  const resetPlayback = useAppStore((state) => state.resetPlayback);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const introTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const outroTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (introTimeoutRef.current) {
      clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }
    if (outroTimeoutRef.current) {
      clearTimeout(outroTimeoutRef.current);
      outroTimeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  // Handle play start - trigger intro animation if not played yet
  useEffect(() => {
    if (playback.isPlaying && !cinematicPlayed && playback.progress < 0.01) {
      // Start intro animation
      setAnimationPhase('intro');

      // After intro, start actual playback
      introTimeoutRef.current = setTimeout(() => {
        setCinematicPlayed(true);
        setAnimationPhase('playing');
      }, INTRO_DURATION);
    } else if (playback.isPlaying && cinematicPlayed && animationPhase === 'idle') {
      setAnimationPhase('playing');
    }
  }, [playback.isPlaying, cinematicPlayed, playback.progress, animationPhase, setCinematicPlayed, setAnimationPhase]);

  // Animation loop - only run when in 'playing' phase
  useEffect(() => {
    if (!playback.isPlaying || animationPhase !== 'playing') {
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
        // End of playback - start outro sequence
        pause();
        setPlayback({ currentTime: totalDuration, progress: 1 });
        setAnimationPhase('outro');

        // Schedule auto-reset after outro
        outroTimeoutRef.current = setTimeout(() => {
          setAnimationPhase('ended');

          // Auto-reset after delay
          resetTimeoutRef.current = setTimeout(() => {
            resetPlayback();
          }, AUTO_RESET_DELAY);
        }, OUTRO_DELAY + OUTRO_DURATION);
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
  }, [playback.isPlaying, playback.speed, playback.currentTime, animationPhase, calculateTotalDuration, pause, setPlayback, setAnimationPhase, resetPlayback]);

  // Update total duration when track or journey changes
  useEffect(() => {
    const totalDuration = calculateTotalDuration();
    setPlayback({ totalDuration });
  }, [journeySegments, activeTrack, calculateTotalDuration, setPlayback]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [clearAllTimeouts]);

  return <>{children}</>;
}

export { INTRO_DURATION, OUTRO_DELAY, OUTRO_DURATION };
