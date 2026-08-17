import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { analyzeRouteLandmarks } from '@/utils/routeLandmarks';
import { resolveRouteLandmarks } from '@/utils/resolveRouteLandmarks';
import { selectVisibleLandmarks } from '@/utils/landmarkVisibility';
import type { NearbyPlacesCoverage, RouteLandmark } from '@/types/landmarks';
import { projectCoordinateToJourney, projectCoordinateToTrack } from '@/utils/routeProjection';

export function useRouteLandmarks(): RouteLandmark[] {
  const userLandmarks = useAppStore((state) => state.userLandmarks);
  const showAutomaticLandmarks = useAppStore((state) => state.showAutomaticLandmarks);
  const enrichedLandmarks = useAppStore((state) => state.enrichedLandmarks);
  const nearbyPlacesEnabled = useAppStore((state) => state.nearbyPlacesEnabled);
  const setEnrichedLandmarks = useAppStore((state) => state.setEnrichedLandmarks);
  const setNearbyPlacesStatus = useAppStore((state) => state.setNearbyPlacesStatus);
  const nearbyPlaceTypes = useAppStore((state) => state.nearbyPlaceTypes);
  const playback = useAppStore((state) => state.playback);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const { computedJourney, activeTrack, totalDistance } = useComputedJourney();
  const routePoints = useMemo(() => computedJourney?.coordinates ?? activeTrack?.points ?? [], [activeTrack?.points, computedJourney?.coordinates]);
  const loadedRouteKeyRef = useRef<string | null>(null);
  useEffect(() => {
    // Start as soon as a GPX route is available. The layer itself reveals each
    // marker along the journey, so fetching while playback starts never makes
    // the whole route suddenly appear or delays the first replay.
    if (!nearbyPlacesEnabled || routePoints.length < 2) return;
    const controller = new AbortController();
    const points = routePoints.filter((_, index) => index === 0 || index === routePoints.length - 1 || index % Math.ceil(routePoints.length / 160) === 0)
      .map((point) => [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))]);
    const routeKey = JSON.stringify(points);
    if (loadedRouteKeyRef.current === routeKey) return;
    loadedRouteKeyRef.current = routeKey;
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
        setNearbyPlacesStatus(false, null, payload.coverage as NearbyPlacesCoverage | undefined);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          loadedRouteKeyRef.current = null;
          setNearbyPlacesStatus(false, error instanceof Error ? error.message : 'Could not find nearby places');
        }
      });
    return () => controller.abort();
  }, [activeTrack, computedJourney, nearbyPlacesEnabled, routePoints, setEnrichedLandmarks, setNearbyPlacesStatus, totalDistance]);
  const automatic = useMemo(() => analyzeRouteLandmarks(
    computedJourney?.coordinates ?? activeTrack?.points ?? [],
  ), [activeTrack?.points, computedJourney?.coordinates]);
  return useMemo(() => {
    const visibleNearbyPlaces = nearbyPlaceTypes === null
      ? enrichedLandmarks
      : enrichedLandmarks.filter((landmark) => nearbyPlaceTypes.includes(landmark.type));
    const merged = resolveRouteLandmarks([...(showAutomaticLandmarks ? automatic : []), ...visibleNearbyPlaces, ...userLandmarks]);
    return selectVisibleLandmarks(merged, {
      mode: cameraSettings.mode,
      preset: cameraSettings.followBehindPreset,
      progress: playback.progress,
      totalDistanceMeters: totalDistance,
    });
  }, [automatic, cameraSettings.followBehindPreset, cameraSettings.mode, enrichedLandmarks, nearbyPlaceTypes, playback.progress, showAutomaticLandmarks, totalDistance, userLandmarks]);
}
