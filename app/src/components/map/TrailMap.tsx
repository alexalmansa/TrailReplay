import { useRef, useCallback, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { MapElevationProfile } from './MapElevationProfile';
import { useI18n } from '@/i18n/useI18n';
import { MAP_LAYERS } from './mapStyle';
import {
  getFollowBehindCameraTarget,
  getFollowBehindZoomLevelFromZoom,
  getNearestFollowBehindPreset,
} from '@/utils/followBehindCamera';
import { useManualPicturePlacement } from './hooks/useManualPicturePlacement';
import { usePictureMarkers } from './hooks/usePictureMarkers';
import { useTextAnnotationsLayer } from './hooks/useTextAnnotationsLayer';
import { useComparisonTrackLayers } from './hooks/useComparisonTrackLayers';
import { useBaseMapPresentation } from './hooks/useBaseMapPresentation';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useTrailLayerData } from './hooks/useTrailLayerData';
import { useTrailPlaybackCamera } from './hooks/useTrailPlaybackCamera';
import { projectCoordinateToJourney, projectCoordinateToTrack } from '@/utils/routeProjection';
import type { CropPreviewMetrics } from '@/utils/crop';

interface TrailMapProps {
  activeTextAnnotationId?: string | null;
  exportFrame?: CropPreviewMetrics | null;
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
  onReadyChange?: (isReady: boolean) => void;
}

const ZOOM_BUTTON_HINT_STORAGE_KEY = 'trailreplay-follow-behind-zoom-buttons-hint-seen';
const ZOOM_BUTTON_STEP = 1;

export function TrailMap(_props: TrailMapProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
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
  const textAnnotations = useAppStore((state) => state.textAnnotations);
  const pendingPicturePlacements = useAppStore((state) => state.pendingPicturePlacements);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setCameraSettings = useAppStore((state) => state.setCameraSettings);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const addPicture = useAppStore((state) => state.addPicture);
  const removePendingPicturePlacement = useAppStore((state) => state.removePendingPicturePlacement);
  const comparisonTracks = useAppStore((state) => state.comparisonTracks);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showZoomButtonsHint, setShowZoomButtonsHint] = useState(false);
  const [hasSeenZoomButtonsHint, setHasSeenZoomButtonsHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(ZOOM_BUTTON_HINT_STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  });

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
  const followBehindZoomLevel = cameraSettings.followBehindZoomLevel;
  const handleMapLoadedChange = useCallback((isLoaded: boolean) => {
    setIsMapLoaded(isLoaded);
    if (!isLoaded) {
      loadZoomDoneRef.current = false;
    }
  }, []);

  const findNearestRoutePoint = useCallback((lat: number, lon: number) => {
    if (computedJourney && computedJourney.coordinates.length > 0) {
      return projectCoordinateToJourney(computedJourney, lat, lon, playback.progress);
    }

    const track = activeTrack || tracks[0];
    if (!track || track.points.length === 0) return null;

    return projectCoordinateToTrack(track, lat, lon, playback.progress);
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

  useTextAnnotationsLayer({
    activeAnnotationId: _props.activeTextAnnotationId ?? null,
    annotations: textAnnotations,
    isMapLoaded,
    mapRef: map,
    unitSystem: settings.unitSystem,
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
    followBehindZoomLevel,
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

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const container = map.current.getContainer();
    const zoomInButton = container.querySelector('.maplibregl-ctrl-zoom-in');
    const zoomOutButton = container.querySelector('.maplibregl-ctrl-zoom-out');

    if (!(zoomInButton instanceof HTMLButtonElement) || !(zoomOutButton instanceof HTMLButtonElement)) {
      return;
    }

    const interceptZoomButton = (event: Event, direction: 1 | -1) => {
      const isAnimating = animationPhase === 'intro' || animationPhase === 'playing';
      if (cameraMode !== 'follow-behind' || !isAnimating) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const currentZoom = map.current?.getZoom()
        ?? getFollowBehindCameraTarget(followBehindZoomLevel, 'playback').zoom;
      const nextLevel = getFollowBehindZoomLevelFromZoom(
        currentZoom + (direction * ZOOM_BUTTON_STEP),
        'playback',
      );

      setCameraSettings({
        followBehindPreset: getNearestFollowBehindPreset(nextLevel),
        followBehindZoomLevel: nextLevel,
      });
    };

    const handleZoomInClick = (event: Event) => interceptZoomButton(event, 1);
    const handleZoomOutClick = (event: Event) => interceptZoomButton(event, -1);

    zoomInButton.addEventListener('click', handleZoomInClick, true);
    zoomOutButton.addEventListener('click', handleZoomOutClick, true);

    return () => {
      zoomInButton.removeEventListener('click', handleZoomInClick, true);
      zoomOutButton.removeEventListener('click', handleZoomOutClick, true);
    };
  }, [animationPhase, cameraMode, followBehindZoomLevel, isMapLoaded, setCameraSettings]);

  useEffect(() => {
    if (isMobile || cameraMode !== 'follow-behind' || hasSeenZoomButtonsHint) return;

    const isAnimating = animationPhase === 'intro' || animationPhase === 'playing';
    if (!isAnimating) return;

    setShowZoomButtonsHint(true);
    setHasSeenZoomButtonsHint(true);

    try {
      window.localStorage.setItem(ZOOM_BUTTON_HINT_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures; the hint will just reappear on the next load.
    }
  }, [animationPhase, cameraMode, hasSeenZoomButtonsHint, isMobile]);

  useEffect(() => {
    if (!showZoomButtonsHint) return;

    const timeoutId = window.setTimeout(() => {
      setShowZoomButtonsHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showZoomButtonsHint]);

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

      {!isMobile && showZoomButtonsHint && isMapLoaded && allCoordinates.length > 0 && (
        <div className="absolute right-4 top-20 z-20 max-w-56 rounded-2xl border border-white/12 bg-[rgba(9,14,19,0.88)] px-3 py-2.5 text-xs leading-relaxed text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          {t('map.zoomButtonsHint')}
        </div>
      )}

      {/* Elevation Profile at bottom of map */}
      {isMapLoaded && (tracks.length > 0 || allCoordinates.length > 0) && (
        <MapElevationProfile exportFrame={_props.exportFrame ?? null} />
      )}
    </div>
  );
}

export { MAP_LAYERS };
