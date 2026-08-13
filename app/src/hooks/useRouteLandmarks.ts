import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { analyzeRouteLandmarks } from '@/utils/routeLandmarks';
import { resolveRouteLandmarks } from '@/utils/resolveRouteLandmarks';
import { selectVisibleLandmarks } from '@/utils/landmarkVisibility';
import type { RouteLandmark } from '@/types/landmarks';
import { projectCoordinateToJourney, projectCoordinateToTrack } from '@/utils/routeProjection';

export function useRouteLandmarks(): RouteLandmark[] {
  const userLandmarks = useAppStore((state) => state.userLandmarks);
  const showAutomaticLandmarks = useAppStore((state) => state.showAutomaticLandmarks);
  const enrichedLandmarks = useAppStore((state) => state.enrichedLandmarks);
  const nearbyPlacesEnabled = useAppStore((state) => state.nearbyPlacesEnabled);
  const setEnrichedLandmarks = useAppStore((state) => state.setEnrichedLandmarks);
  const setNearbyPlacesStatus = useAppStore((state) => state.setNearbyPlacesStatus);
  const groups = useAppStore((state) => state.enabledLandmarkGroups);
  const playback = useAppStore((state) => state.playback);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const { computedJourney, activeTrack, totalDistance } = useComputedJourney();
  const isExporting = useAppStore((state) => state.isExporting);
  const routePoints = useMemo(() => computedJourney?.coordinates ?? activeTrack?.points ?? [], [activeTrack?.points, computedJourney?.coordinates]);
  useEffect(() => {
    // A completed replay can retain its playing flag briefly while the outro
    // settles. It is safe to enrich then, but never during an active frame.
    if (!nearbyPlacesEnabled || isExporting || (playback.isPlaying && playback.progress < 1) || routePoints.length < 2) return;
    const controller = new AbortController();
    const points = routePoints.filter((_, index) => index === 0 || index === routePoints.length - 1 || index % Math.ceil(routePoints.length / 160) === 0)
      .map((point) => [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))]);
    setNearbyPlacesStatus(true);
    fetch('/api/landmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points }), signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not find nearby places');
        const landmarks = (payload.landmarks as Array<Omit<RouteLandmark, 'progress' | 'routeDistanceMeters'>>).map((place) => {
          const match = computedJourney
            ? projectCoordinateToJourney(computedJourney, place.lat, place.lon, 0)
            : activeTrack ? projectCoordinateToTrack(activeTrack, place.lat, place.lon, 0) : null;
          // Preserve the OSM feature's real-world position for map rendering.
          // The route projection only supplies replay timing and proximity.
          return match && match.distanceMeters <= 1_500
            ? { ...place, progress: match.progress, routeDistanceMeters: match.progress * totalDistance }
            : null;
        }).filter((place): place is NonNullable<typeof place> => place !== null)
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 24);
        setEnrichedLandmarks(landmarks);
        setNearbyPlacesStatus(false);
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setNearbyPlacesStatus(false, error instanceof Error ? error.message : 'Could not find nearby places'); });
    return () => controller.abort();
  }, [activeTrack, computedJourney, isExporting, nearbyPlacesEnabled, playback.isPlaying, playback.progress, routePoints, setEnrichedLandmarks, setNearbyPlacesStatus, totalDistance]);
  const automatic = useMemo(() => analyzeRouteLandmarks(
    computedJourney?.coordinates ?? activeTrack?.points ?? [],
  ), [activeTrack?.points, computedJourney?.coordinates]);
  return useMemo(() => {
    const merged = resolveRouteLandmarks([...(showAutomaticLandmarks ? automatic : []), ...enrichedLandmarks, ...userLandmarks]);
    const enabled = groups.length ? merged.filter((landmark) => groups.includes(landmark.type) || landmark.source === 'user') : merged;
    return selectVisibleLandmarks(enabled, {
      mode: cameraSettings.mode,
      preset: cameraSettings.followBehindPreset,
      progress: playback.progress,
      totalDistanceMeters: totalDistance,
    });
  }, [automatic, cameraSettings.followBehindPreset, cameraSettings.mode, enrichedLandmarks, groups, playback.progress, showAutomaticLandmarks, totalDistance, userLandmarks]);
}
