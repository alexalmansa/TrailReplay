import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { analyzeRouteLandmarks } from '@/utils/routeLandmarks';
import { resolveRouteLandmarks } from '@/utils/resolveRouteLandmarks';
import { selectVisibleLandmarks } from '@/utils/landmarkVisibility';
import type { GPXPoint } from '@/types';
import type { NearbyPlacesCoverage, RouteLandmark } from '@/types/landmarks';
import { projectCoordinateToJourney, projectCoordinateToTrack } from '@/utils/routeProjection';

function sampleRoutePoints(points: GPXPoint[]): number[][] {
  const stride = Math.ceil(points.length / 160);
  return points
    .filter((_, index) => index === 0 || index === points.length - 1 || index % stride === 0)
    .map((point) => [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))]);
}

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
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const { computedJourney, activeTrack, totalDistance } = useComputedJourney();
  const nearbyPlaceRoutes = useMemo(() => {
    const journeyTrackIds = journeySegments
      .filter((segment): segment is Extract<typeof segment, { type: 'track' }> => segment.type === 'track')
      .map((segment) => segment.trackId);
    const routeTracks = journeyTrackIds.length > 0
      ? journeyTrackIds.map((trackId) => tracks.find((track) => track.id === trackId)).filter((track): track is NonNullable<typeof track> => Boolean(track))
      : activeTrack ? [activeTrack] : [];

    // Repeated segments of the same file share the same nearby places; only
    // query it once while still projecting the matches onto the full journey.
    return [...new Map(routeTracks.map((track) => [track.id, track.points])).values()];
  }, [activeTrack, journeySegments, tracks]);
  const loadedRouteKeyRef = useRef<string | null>(null);
  useEffect(() => {
    // Start as soon as a GPX route is available. The layer itself reveals each
    // marker along the journey, so fetching while playback starts never makes
    // the whole route suddenly appear or delays the first replay.
    if (!nearbyPlacesEnabled) {
      // Disabling clears `enrichedLandmarks` (landmarksSlice), but this ref
      // would otherwise still remember the route as "already loaded" — so a
      // later re-enable for the same route would skip fetching and leave
      // the just-cleared list empty forever.
      loadedRouteKeyRef.current = null;
      return;
    }
    const controller = new AbortController();
    // Query each imported GPX independently. Joining distant tracks into one
    // corridor would either omit their new area or exceed the API's bounds.
    const routes = nearbyPlaceRoutes.map(sampleRoutePoints).filter((points) => points.length >= 2);
    if (routes.length === 0) return;
    const routeKey = JSON.stringify(routes);
    if (loadedRouteKeyRef.current === routeKey) return;
    loadedRouteKeyRef.current = routeKey;
    setNearbyPlacesStatus(true);
    let settled = false;
    let timedOut = false;
    Promise.all(routes.map(async (points) => {
      const response = await fetch('/api/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not find nearby places');
      return payload;
    }))
      .then((payloads) => {
        const uniquePlaces = new Map<string, Omit<RouteLandmark, 'progress' | 'routeDistanceMeters'>>();
        payloads.forEach((payload) => {
          (payload.landmarks as Array<Omit<RouteLandmark, 'progress' | 'routeDistanceMeters'>>)
            .forEach((place) => uniquePlaces.set(place.id, place));
        });
        const landmarks = [...uniquePlaces.values()].map((place) => {
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
        const coverageItems = payloads
          .map((payload) => payload.coverage as NearbyPlacesCoverage | undefined)
          .filter((coverage): coverage is NearbyPlacesCoverage => Boolean(coverage));
        const coverage = coverageItems.length === payloads.length && coverageItems.length > 0
          ? {
              complete: coverageItems.every((item) => item.complete),
              source: coverageItems[0].source,
              tiles: coverageItems.reduce((total, item) => total + item.tiles, 0),
              cacheHits: coverageItems.reduce((total, item) => total + item.cacheHits, 0),
              fetchedTiles: coverageItems.reduce((total, item) => total + item.fetchedTiles, 0),
            }
          : undefined;
        settled = true;
        setEnrichedLandmarks(landmarks);
        setNearbyPlacesStatus(false, null, coverage);
      })
      .catch((error: unknown) => {
        settled = true;
        if (timedOut) {
          loadedRouteKeyRef.current = null;
          setNearbyPlacesStatus(false, 'Nearby places took too long to load. Please try again.');
        } else if (!controller.signal.aborted) {
          loadedRouteKeyRef.current = null;
          setNearbyPlacesStatus(false, error instanceof Error ? error.message : 'Could not find nearby places');
        }
      });
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12_000);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      // React can re-run this effect while the same route is still loading.
      // Let the next invocation start a fresh request rather than inheriting a
      // stale loading state from the aborted request.
      if (!settled && loadedRouteKeyRef.current === routeKey) {
        loadedRouteKeyRef.current = null;
        setNearbyPlacesStatus(false);
      }
    };
  }, [activeTrack, computedJourney, nearbyPlaceRoutes, nearbyPlacesEnabled, setEnrichedLandmarks, setNearbyPlacesStatus, totalDistance]);
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
