import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { analyzeRouteLandmarks } from '@/utils/routeLandmarks';
import { resolveRouteLandmarks } from '@/utils/resolveRouteLandmarks';
import { selectVisibleLandmarks } from '@/utils/landmarkVisibility';
import type { NearbyPlacesCoverage, RouteLandmark } from '@/types/landmarks';
import { projectCoordinateToTrack } from '@/utils/routeProjection';
import {
  buildLandmarkLookupBatches,
  landmarkTrackSignature,
  tracksNeedingLandmarkLookup,
} from '@/utils/landmarkLookup';
import type { GPXTrack } from '@/types';
import type { ComputedJourney } from '@/utils/journeyUtils';

type LandmarkApiPlace = Omit<RouteLandmark, 'progress' | 'routeDistanceMeters'>;
type LandmarkTrackCache = {
  signature: string;
  places: LandmarkApiPlace[];
  coverage: NearbyPlacesCoverage[];
};

function aggregateCoverage(
  entries: LandmarkTrackCache[],
): NearbyPlacesCoverage | null {
  const coverages = entries.flatMap((entry) => entry.coverage);
  if (coverages.length === 0) return null;
  const sources = new Set(coverages.map((coverage) => coverage.source));
  return {
    complete: coverages.every((coverage) => coverage.complete),
    source: sources.size === 1
      ? coverages[0].source
      : 'shared-cache-and-overpass',
    tiles: coverages.reduce((sum, coverage) => sum + coverage.tiles, 0),
    cacheHits: coverages.reduce((sum, coverage) => sum + coverage.cacheHits, 0),
    fetchedTiles: coverages.reduce((sum, coverage) => sum + coverage.fetchedTiles, 0),
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
    const timing = computedJourney?.segmentTimings.find(
      (segment) => segment.type === 'track' && segment.trackId === track.id,
    );
    const projected = cached.places.map((place) => {
      const match = projectCoordinateToTrack(track, place.lat, place.lon, 0);
      if (!match || match.distanceMeters > 1_500) return null;
      const progress = timing
        ? timing.progressStartRatio
          + match.progress * (timing.progressEndRatio - timing.progressStartRatio)
        : match.progress;
      const routeDistanceMeters = timing
        ? timing.startDistance + match.progress * (timing.endDistance - timing.startDistance)
        : match.progress * track.totalDistance;
      return { ...place, progress, routeDistanceMeters };
    }).filter((place): place is NonNullable<typeof place> => place !== null)
      .sort((left, right) => right.importance - left.importance)
      .slice(0, 16);
    for (const place of projected) unique.set(place.id, place);
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
  const setEnrichedLandmarks = useAppStore((state) => state.setEnrichedLandmarks);
  const setNearbyPlacesStatus = useAppStore((state) => state.setNearbyPlacesStatus);
  const groups = useAppStore((state) => state.enabledLandmarkGroups);
  const playback = useAppStore((state) => state.playback);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const tracks = useAppStore((state) => state.tracks);
  const { computedJourney, activeTrack, routeDistance, totalDistance } = useComputedJourney();
  const isExporting = useAppStore((state) => state.isExporting);
  const lookupCacheRef = useRef(new Map<string, LandmarkTrackCache>());
  useEffect(() => {
    if (!nearbyPlacesEnabled || isExporting) return;
    const lookupTracks = tracks.filter((track) => track.points.length >= 2);
    if (lookupTracks.length === 0) {
      setEnrichedLandmarks([]);
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
    setNearbyPlacesStatus(true);
    void Promise.allSettled(pendingTracks.map(async (track) => {
      const batches = buildLandmarkLookupBatches(track.points);
      const payloads = await Promise.all(batches.map(async (points) => {
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
    return () => controller.abort();
  }, [computedJourney, isExporting, nearbyPlacesEnabled, setEnrichedLandmarks, setNearbyPlacesStatus, tracks]);
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
      currentDistanceMeters: routeDistance,
    });
  }, [automatic, cameraSettings.followBehindPreset, cameraSettings.mode, enrichedLandmarks, groups, playback.progress, routeDistance, showAutomaticLandmarks, totalDistance, userLandmarks]);
}
