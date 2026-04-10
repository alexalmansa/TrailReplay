import { useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { MapElevationProfile } from './MapElevationProfile';
import { useI18n } from '@/i18n/useI18n';
import { calculateDistance } from '@/utils/journeyUtils';
import { MAP_LAYERS } from './mapStyle';
import { useManualPicturePlacement } from './hooks/useManualPicturePlacement';
import { usePictureMarkers } from './hooks/usePictureMarkers';
import { useComparisonTrackLayers } from './hooks/useComparisonTrackLayers';
import { useBaseMapPresentation } from './hooks/useBaseMapPresentation';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useTrailLayerData } from './hooks/useTrailLayerData';
import { useTrailPlaybackCamera } from './hooks/useTrailPlaybackCamera';

interface TrailMapProps {
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
  onReadyChange?: (isReady: boolean) => void;
}

export function TrailMap(_props: TrailMapProps) {
  const { t } = useI18n();
  const internalMapContainerRef = useRef<HTMLDivElement>(null);
  const mapContainer = _props.mapContainerRef ?? internalMapContainerRef;
  const onReadyChange = _props.onReadyChange;
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const targetBearingRef = useRef<number>(0);
  const introZoomTriggeredRef = useRef<boolean>(false);
  const lastAnimationPhaseRef = useRef<string>('idle');
  const loadZoomDoneRef = useRef<boolean>(false);

  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const pictures = useAppStore((state) => state.pictures);
  const pendingPicturePlacements = useAppStore((state) => state.pendingPicturePlacements);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const addPicture = useAppStore((state) => state.addPicture);
  const removePendingPicturePlacement = useAppStore((state) => state.removePendingPicturePlacement);
  const comparisonTracks = useAppStore((state) => state.comparisonTracks);

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Use the computed journey hook for multi-track support
  const {
    currentPosition,
    currentBearing,
    currentIcon,
    currentSegment,
    completedCoordinates,
    allCoordinates,
    isInTransport,
    currentTrackColor,
    segmentTimings,
    elevationData,
    activeTrack,
    computedJourney,
  } = useComputedJourney();

  // Derive the current track name for the label
  const currentTrackName = currentSegment?.segment.type === 'track' && currentSegment.segment.trackId
    ? tracks.find((t) => t.id === currentSegment.segment.trackId)?.name
    : activeTrack?.name;
  const cameraMode = cameraSettings.mode;
  const followBehindPreset = cameraSettings.followBehindPreset;
  const handleMapLoadedChange = useCallback((isLoaded: boolean) => {
    setIsMapLoaded(isLoaded);
    if (!isLoaded) {
      loadZoomDoneRef.current = false;
    }
  }, []);

  const findNearestRoutePoint = useCallback((lat: number, lon: number) => {
    if (computedJourney && computedJourney.coordinates.length > 0) {
      let closestIndex = 0;
      let minDistanceKm = Infinity;

      computedJourney.coordinates.forEach((point, index) => {
        const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
        if (distanceKm < minDistanceKm) {
          minDistanceKm = distanceKm;
          closestIndex = index;
        }
      });

      const closestPoint = computedJourney.coordinates[closestIndex];
      if (!closestPoint) return null;

      return {
        lat: closestPoint.lat,
        lon: closestPoint.lon,
        progress:
          computedJourney.coordinates.length > 1
            ? closestIndex / (computedJourney.coordinates.length - 1)
            : playback.progress,
      };
    }

    const track = activeTrack || tracks[0];
    if (!track || track.points.length === 0) return null;

    let closestPoint = track.points[0];
    let minDistanceKm = Infinity;

    track.points.forEach((point) => {
      const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
      if (distanceKm < minDistanceKm) {
        minDistanceKm = distanceKm;
        closestPoint = point;
      }
    });

    return {
      lat: closestPoint.lat,
      lon: closestPoint.lon,
      progress: track.totalDistance > 0 ? closestPoint.distance / track.totalDistance : playback.progress,
    };
  }, [activeTrack, computedJourney, playback.progress, tracks]);

  useManualPicturePlacement({
    addPicture,
    findNearestRoutePoint,
    isMapLoaded,
    mapRef: map,
    pendingPicturePlacements,
    removePendingPicturePlacement,
    t,
  });

  usePictureMarkers({
    isMapLoaded,
    mapRef: map,
    pictures,
    setSelectedPictureId,
    showPictures: settings.showPictures,
  });

  useComparisonTrackLayers({
    comparisonTracks,
    isMapLoaded,
    mapRef: map,
    progress: playback.progress,
  });

  useBaseMapPresentation({
    currentTrackColor: currentTrackColor ?? null,
    currentTrackName: currentTrackName ?? null,
    isMapLoaded,
    mapRef: map,
    settings,
    trailStyle,
  });

  useMapInitialization({
    mapContainer,
    mapRef: map,
    onReadyChange,
    onSetMapLoaded: handleMapLoadedChange,
  });

  useTrailLayerData({
    activeTrack,
    allCoordinates,
    animationPhase,
    colorMode: trailStyle.colorMode,
    computedJourney,
    isMapLoaded,
    loadZoomDoneRef,
    mapRef: map,
    playbackProgress: playback.progress,
    segmentTimings,
    trailColor: trailStyle.trailColor,
  });

  useTrailPlaybackCamera({
    activeTrack,
    allCoordinates,
    animationPhase,
    cameraMode,
    completedCoordinates,
    computedJourney,
    currentBearing,
    currentIcon,
    currentPosition,
    currentSegment,
    currentTrackColor: currentTrackColor ?? null,
    currentTrackName: currentTrackName ?? null,
    elevationData,
    followBehindPreset,
    introZoomTriggeredRef,
    isInTransport,
    isMapLoaded,
    lastAnimationPhaseRef,
    mapRef: map,
    markerRef,
    playbackProgress: playback.progress,
    segmentTimings,
    setCameraPosition,
    smoothBearingRef,
    targetBearingRef,
    trailStyle: {
      colorMode: trailStyle.colorMode,
      currentIcon: trailStyle.currentIcon,
      markerColor: trailStyle.markerColor,
      markerSize: trailStyle.markerSize,
      showCircle: trailStyle.showCircle,
      showMarker: trailStyle.showMarker,
      showTrackLabels: trailStyle.showTrackLabels,
      trailColor: trailStyle.trailColor,
    },
  });

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--canvas)]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--evergreen)]">{t('map.loading')}</span>
          </div>
        </div>
      )}

      {/* Elevation Profile at bottom of map */}
      {isMapLoaded && (tracks.length > 0 || allCoordinates.length > 0) && (
        <MapElevationProfile />
      )}
    </div>
  );
}

export { MAP_LAYERS };
