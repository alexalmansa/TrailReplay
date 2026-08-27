import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { analyzeRouteLandmarks } from '@/utils/routeLandmarks';
import { resolveRouteLandmarks } from '@/utils/resolveRouteLandmarks';
import { selectVisibleLandmarks } from '@/utils/landmarkVisibility';
import type { GPXTrack } from '@/types';
import type { NearbyPlacesCoverage, RouteLandmark } from '@/types/landmarks';
import { projectCoordinateToTrack } from '@/utils/routeProjection';
import {
  buildLandmarkLookupBatches,
  landmarkTrackSignature,
  tracksNeedingLandmarkLookup,
} from '@/utils/landmarkLookup';
import type { ComputedJourney, SegmentTiming } from '@/utils/journeyUtils';

type LandmarkApiPlace = Omit<RouteLandmark, 'progress' | 'routeDistanceMeters'>;
type LandmarkTrackCache = {
  signature: string;
  places: LandmarkApiPlace[];
  coverage: NearbyPlacesCoverage[];
};

function aggregateCoverage(entries: LandmarkTrackCache[]): NearbyPlacesCoverage | null {
  const coverages = entries.flatMap((entry) => entry.coverage);
  if (coverages.length === 0) return null;
  const sources = new Set(coverages.map((coverage) => coverage.source));
  return {
    complete: coverages.every((coverage) => coverage.complete),
    source: sources.size === 1 ? coverages[0].source : 'shared-cache-and-overpass',
    tiles: coverages.reduce((sum, coverage) => sum + coverage.tiles, 0),
    cacheHits: coverages.reduce((sum, coverage) => sum + coverage.cacheHits, 0),
    fetchedTiles: coverages.reduce((sum, coverage) => sum + coverage.fetchedTiles, 0),
  };
}

function projectPlaceToTiming(
  place: LandmarkApiPlace,
  localProgress: number,
  timing: SegmentTiming,
): RouteLandmark {
  return {
    ...place,
    id: `${place.id}:${timing.segmentId}`,
    progress: timing.progressStartRatio
      + localProgress * (timing.progressEndRatio - timing.progressStartRatio),
    routeDistanceMeters: timing.startDistance
      + localProgress * (timing.endDistance - timing.startDistance),
  };
}

function projectCachedPlaces(
  tracks: GPXTrack[],
  cache: Map<string, LandmarkTrackCache>,
  computedJourney: ComputedJourney | null,
): RouteLandmark[] {
  const unique = new Map<string, RouteLandmark>();

  for (const track of tracks) {
    const cached = cache.get(track.id);
    if (!cached || cached.signature !== landmarkTrackSignature(track)) continue;
    const timings = computedJourney?.segmentTimings.filter(
      (segment) => segment.type === 'track' && segment.trackId === track.id,
    ) ?? [];
    const matches = cached.places
      .map((place) => ({ place, match: projectCoordinateToTrack(track, place.lat, place.lon, 0) }))
      .filter(({ match }) => Boolean(match && match.distanceMeters <= 1_500))
      .sort((left, right) => right.place.importance - left.place.importance)
      .slice(0, 16);

    for (const { place, match } of matches) {
      if (!match) continue;
      if (timings.length === 0) {
        unique.set(`${track.id}:${place.id}`, {
          ...place,
          progress: match.progress,
          routeDistanceMeters: match.progress * track.totalDistance,
        });
        continue;
      }
      for (const timing of timings) {
        const projected = projectPlaceToTiming(place, match.progress, timing);
        unique.set(projected.id, projected);
      }
    }
  }

  return [...unique.values()]
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 40);
}

export function useRouteLandmarks(): RouteLandmark[] {
  const userLandmarks = useAppStore((state) => state.userLandmarks);
  const showAutomaticLandmarks = useAppStore((state) => state.showAutomaticLandmarks);
  const enrichedLandmarks = useAppStore((state) => state.enrichedLandmarks);
  const nearbyPlacesEnabled = useAppStore((state) => state.nearbyPlacesEnabled);
  const nearbyPlaceTypes = useAppStore((state) => state.nearbyPlaceTypes);
  const setEnrichedLandmarks = useAppStore((state) => state.setEnrichedLandmarks);
  const setNearbyPlacesStatus = useAppStore((state) => state.setNearbyPlacesStatus);
  const playback = useAppStore((state) => state.playback);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const isExporting = useAppStore((state) => state.isExporting);
  const { computedJourney, activeTrack, routeDistance, totalDistance } = useComputedJourney();
  const lookupCacheRef = useRef(new Map<string, LandmarkTrackCache>());

  const lookupTracks = useMemo(() => {
    const journeyTrackIds = journeySegments
      .filter((segment): segment is Extract<typeof segment, { type: 'track' }> => segment.type === 'track')
      .map((segment) => segment.trackId);
    const routeTracks = journeyTrackIds.length > 0
      ? journeyTrackIds
        .map((trackId) => tracks.find((track) => track.id === trackId))
        .filter((track): track is GPXTrack => Boolean(track))
      : activeTrack ? [activeTrack] : [];
    return [...new Map(routeTracks.map((track) => [track.id, track])).values()]
      .filter((track) => track.points.length >= 2);
  }, [activeTrack, journeySegments, tracks]);

  useEffect(() => {
    if (!nearbyPlacesEnabled || isExporting) return;
    if (lookupTracks.length === 0) {
      setEnrichedLandmarks([]);
      setNearbyPlacesStatus(false, null, null);
      return;
    }

    const cachedSignatures = new Map(
      [...lookupCacheRef.current].map(([trackId, entry]) => [trackId, entry.signature]),
    );
    const pendingTracks = tracksNeedingLandmarkLookup(lookupTracks, cachedSignatures);
    if (pendingTracks.length === 0) {
      const cacheEntries = lookupTracks
        .map((track) => lookupCacheRef.current.get(track.id))
        .filter((entry): entry is LandmarkTrackCache => Boolean(entry));
      setEnrichedLandmarks(projectCachedPlaces(lookupTracks, lookupCacheRef.current, computedJourney));
      setNearbyPlacesStatus(false, null, aggregateCoverage(cacheEntries));
      return;
    }

    const controller = new AbortController();
    let settled = false;
    let timedOut = false;
    setNearbyPlacesStatus(true);

    void Promise.allSettled(pendingTracks.map(async (track) => {
      const payloads = await Promise.all(buildLandmarkLookupBatches(track.points).map(async (points) => {
        const response = await fetch('/api/landmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not find nearby places');
        return payload as { landmarks: LandmarkApiPlace[]; coverage?: NearbyPlacesCoverage };
      }));
      const places = new Map<string, LandmarkApiPlace>();
      for (const payload of payloads) {
        for (const place of payload.landmarks ?? []) places.set(place.id, place);
      }
      return {
        track,
        entry: {
          signature: landmarkTrackSignature(track),
          places: [...places.values()],
          coverage: payloads
            .map((payload) => payload.coverage)
            .filter((coverage): coverage is NearbyPlacesCoverage => Boolean(coverage)),
        },
      };
    })).then((results) => {
      settled = true;
      window.clearTimeout(timeout);
      if (controller.signal.aborted) return;
      let firstError: string | null = null;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          lookupCacheRef.current.set(result.value.track.id, result.value.entry);
        } else if (!firstError) {
          firstError = result.reason instanceof Error
            ? result.reason.message
            : 'Could not find nearby places';
        }
      }
      const cacheEntries = lookupTracks
        .map((track) => lookupCacheRef.current.get(track.id))
        .filter((entry): entry is LandmarkTrackCache => Boolean(entry));
      const landmarks = projectCachedPlaces(lookupTracks, lookupCacheRef.current, computedJourney);
      setEnrichedLandmarks(landmarks);
      setNearbyPlacesStatus(
        false,
        landmarks.length === 0 ? firstError : null,
        aggregateCoverage(cacheEntries),
      );
    });

    const timeout = window.setTimeout(() => {
      if (settled) return;
      timedOut = true;
      controller.abort();
      setNearbyPlacesStatus(false, 'Nearby places took too long to load. Please try again.');
    }, 12_000);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      if (!settled && !timedOut) setNearbyPlacesStatus(false);
    };
  }, [computedJourney, isExporting, lookupTracks, nearbyPlacesEnabled, setEnrichedLandmarks, setNearbyPlacesStatus]);

  const automatic = useMemo(() => analyzeRouteLandmarks(
    computedJourney?.coordinates ?? activeTrack?.points ?? [],
  ), [activeTrack?.points, computedJourney?.coordinates]);

  return useMemo(() => {
    const visibleNearbyPlaces = nearbyPlaceTypes === null
      ? enrichedLandmarks
      : enrichedLandmarks.filter((landmark) => nearbyPlaceTypes.includes(landmark.type));
    const merged = resolveRouteLandmarks([
      ...(showAutomaticLandmarks ? automatic : []),
      ...visibleNearbyPlaces,
      ...userLandmarks,
    ]);
    return selectVisibleLandmarks(merged, {
      mode: cameraSettings.mode,
      preset: cameraSettings.followBehindPreset,
      progress: playback.progress,
      totalDistanceMeters: totalDistance,
      currentDistanceMeters: routeDistance,
    });
  }, [automatic, cameraSettings.followBehindPreset, cameraSettings.mode, enrichedLandmarks, nearbyPlaceTypes, playback.progress, routeDistance, showAutomaticLandmarks, totalDistance, userLandmarks]);
}
