import { useEffect } from 'react';
import type { Feature, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { getActivityIconMarkerHtml, isSvgActivityIcon } from '@/utils/activityIcons';
import { getHeartRateColor } from '@/utils/gpxParser';
import { buildSegmentLineFeatures } from '@/utils/trailColorFeatures';
import {
  calculateTerrainAwareAdjustments,
  smoothBearing,
  TERRAIN_CAMERA_SETTINGS,
} from '@/components/map/cameraUtils';

interface UseTrailPlaybackCameraParams {
  activeTrack: { points: Array<{ heartRate: number | null }> } | null | undefined;
  allCoordinates: number[][];
  animationPhase: 'idle' | 'intro' | 'playing' | 'outro' | 'ended';
  cameraMode: 'overview' | 'follow' | 'follow-behind';
  completedCoordinates: number[][];
  computedJourney: { coordinates: Array<{ heartRate: number | null }> } | null;
  currentBearing: number;
  currentPosition: { lat: number; lon: number } | null;
  currentSegment?: { segment: { segmentIndex?: number; transportMode?: string } } | null;
  currentTrackColor: string | null;
  currentTrackName: string | null;
  elevationData: Array<{ elevation: number; progress?: number }>;
  followBehindPreset: 'very-close' | 'close' | 'medium' | 'far';
  isInTransport: boolean;
  isMapLoaded: boolean;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  markerRef: React.MutableRefObject<maplibregl.Marker | null>;
  playbackProgress: number;
  segmentTimings: Array<{
    segmentIndex: number;
    type: 'track' | 'transport';
    startCoordIndex: number;
    endCoordIndex: number;
    color?: string;
  }>;
  setCameraPosition: (position: {
    lat: number;
    lon: number;
    zoom: number;
    pitch: number;
    bearing: number;
  }) => void;
  smoothBearingRef: React.MutableRefObject<number>;
  targetBearingRef: React.MutableRefObject<number>;
  introZoomTriggeredRef: React.MutableRefObject<boolean>;
  lastAnimationPhaseRef: React.MutableRefObject<string>;
  trailStyle: {
    colorMode: 'fixed' | 'heartRate';
    currentIcon: string;
    markerColor: string;
    markerSize: number;
    showCircle: boolean;
    showMarker: boolean;
    showTrackLabels: boolean;
    trailColor: string;
  };
}

export function useTrailPlaybackCamera({
  activeTrack,
  allCoordinates,
  animationPhase,
  cameraMode,
  completedCoordinates,
  computedJourney,
  currentBearing,
  currentPosition,
  currentSegment,
  currentTrackColor,
  currentTrackName,
  elevationData,
  followBehindPreset,
  introZoomTriggeredRef,
  isInTransport,
  isMapLoaded,
  lastAnimationPhaseRef,
  mapRef,
  markerRef,
  playbackProgress,
  segmentTimings,
  setCameraPosition,
  smoothBearingRef,
  targetBearingRef,
  trailStyle,
}: UseTrailPlaybackCameraParams) {
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !currentPosition) return;

    targetBearingRef.current = currentBearing;
    smoothBearingRef.current = smoothBearing(smoothBearingRef.current, currentBearing, 0.02);

    const shouldShowMarker = trailStyle.showMarker &&
      (animationPhase === 'playing' || (animationPhase === 'idle' && playbackProgress > 0));
    const currentColor = currentTrackColor || trailStyle.trailColor;
    const icon = isInTransport
      ? TRANSPORT_ICONS[currentSegment?.segment.transportMode || 'car'] || '🚗'
      : trailStyle.currentIcon;

    if (!shouldShowMarker) {
      markerRef.current?.remove();
      markerRef.current = null;
    } else {
      const fontSize = Math.round(28 * trailStyle.markerSize);
      const circleSize = Math.round(40 * trailStyle.markerSize);
      const markerColor = trailStyle.markerColor;
      const iconColor = isSvgActivityIcon(icon) ? markerColor : currentColor;
      const iconHtml = getActivityIconMarkerHtml(icon, fontSize, iconColor);
      const glowBackground = isSvgActivityIcon(icon) ? 'rgba(22, 32, 40, 0.72)' : `${markerColor}40`;
      const markerHtml = `
        ${trailStyle.showCircle ? `<div style="
          position: absolute;
          width: ${circleSize}px;
          height: ${circleSize}px;
          background: ${glowBackground};
          border: 2px solid ${markerColor};
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
        "></div>` : ''}
        ${iconHtml}
      `;

      if (!markerRef.current) {
        const element = document.createElement('div');
        element.className = 'tr-marker';
        element.style.zIndex = '100';
        element.innerHTML = markerHtml;
        markerRef.current = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([currentPosition.lon, currentPosition.lat])
          .addTo(mapRef.current);
      } else {
        markerRef.current.setLngLat([currentPosition.lon, currentPosition.lat]);
        markerRef.current.getElement().innerHTML = markerHtml;
      }
    }

    if (completedCoordinates.length > 0 && mapRef.current.getSource('trail-completed')) {
      if (trailStyle.colorMode === 'heartRate') {
        const features: Array<Feature<LineString, { color: string }>> = [];
        const heartRatePoints = activeTrack && !computedJourney
          ? activeTrack.points
          : computedJourney?.coordinates ?? [];

        for (let index = 0; index < completedCoordinates.length - 1; index++) {
          const heartRate = heartRatePoints[index]?.heartRate;
          features.push({
            type: 'Feature',
            properties: { color: heartRate ? getHeartRateColor(heartRate, 180) : trailStyle.trailColor },
            geometry: {
              type: 'LineString',
              coordinates: [completedCoordinates[index], completedCoordinates[index + 1]],
            },
          });
        }

        (mapRef.current.getSource('trail-completed') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features,
        });
      } else {
        const completedBaseIndex = Math.max(0, Math.min(allCoordinates.length - 1, completedCoordinates.length - 2));
        const coloredFeatures = buildSegmentLineFeatures({
          coordinates: allCoordinates,
          segmentTimings,
          fallbackColor: trailStyle.trailColor,
          maxCoordIndex: completedBaseIndex,
          partialEndpoint: currentPosition ? [currentPosition.lon, currentPosition.lat] : null,
          partialSegmentIndex: currentSegment?.segment.segmentIndex ?? null,
        });

        (mapRef.current.getSource('trail-completed') as maplibregl.GeoJSONSource).setData(
          coloredFeatures.length > 0
            ? {
                type: 'FeatureCollection',
                features: coloredFeatures,
              }
            : {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: completedCoordinates },
              }
        );
      }
    }

    if (trailStyle.showTrackLabels && mapRef.current.getSource('main-track-label')) {
      (mapRef.current.getSource('main-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: currentTrackName || '' },
        geometry: { type: 'Point', coordinates: [currentPosition.lon, currentPosition.lat] },
      });
    }

    const presets = {
      'very-close': { zoom: 16, pitch: 55 },
      'close': { zoom: 15, pitch: 45 },
      'medium': { zoom: 14, pitch: 35 },
      'far': { zoom: 11, pitch: 30 },
    };
    const preset = presets[followBehindPreset] || presets.medium;

    if (animationPhase === 'idle' && lastAnimationPhaseRef.current !== 'idle') {
      introZoomTriggeredRef.current = false;
    }
    lastAnimationPhaseRef.current = animationPhase;

    if (animationPhase === 'intro' && cameraMode !== 'overview' && !introZoomTriggeredRef.current) {
      introZoomTriggeredRef.current = true;
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.min(preset.zoom, currentZoom + 3);

      mapRef.current.easeTo({
        center: [currentPosition.lon, currentPosition.lat],
        zoom: targetZoom,
        pitch: cameraMode === 'follow-behind' ? preset.pitch : 0,
        bearing: cameraMode === 'follow-behind' ? currentBearing || 0 : 0,
        duration: 2000,
        easing: (value: number) => 1 - Math.pow(1 - value, 3),
      });
    } else if (animationPhase === 'playing' && cameraMode !== 'overview') {
      const currentZoom = mapRef.current.getZoom();
      const newZoom = currentZoom < preset.zoom
        ? Math.min(currentZoom + 0.1, preset.zoom)
        : Math.max(currentZoom - 0.1, preset.zoom);

      if (cameraMode === 'follow') {
        mapRef.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: 14,
          pitch: 0,
          bearing: 0,
          duration: 100,
        });
      } else {
        mapRef.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: newZoom,
          pitch: preset.pitch,
          bearing: smoothBearingRef.current,
          duration: 100,
          easing: (value: number) => value * (2 - value),
        });
      }
    }

    setCameraPosition({
      lat: currentPosition.lat,
      lon: currentPosition.lon,
      zoom: mapRef.current.getZoom(),
      pitch: mapRef.current.getPitch(),
      bearing: mapRef.current.getBearing(),
    });
  }, [
    activeTrack,
    animationPhase,
    cameraMode,
    completedCoordinates,
    computedJourney,
    currentBearing,
    currentPosition,
    currentSegment,
    currentTrackColor,
    currentTrackName,
    followBehindPreset,
    introZoomTriggeredRef,
    isInTransport,
    isMapLoaded,
    lastAnimationPhaseRef,
    mapRef,
    markerRef,
    playbackProgress,
    segmentTimings,
    setCameraPosition,
    smoothBearingRef,
    targetBearingRef,
    trailStyle,
  ]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    if (cameraMode === 'overview' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 500 });
    }
  }, [allCoordinates, cameraMode, isMapLoaded, mapRef]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const introPresets = {
      'very-close': { zoom: 17, pitch: 60 },
      'close': { zoom: 16, pitch: 55 },
      'medium': { zoom: 15, pitch: 50 },
      'far': { zoom: 14, pitch: 45 },
    };
    const preset = introPresets[followBehindPreset] || introPresets.medium;

    if (animationPhase === 'intro' && allCoordinates.length > 0) {
      const startPoint = allCoordinates[0];
      const lookAheadPoint = allCoordinates[Math.min(10, allCoordinates.length - 1)];
      if (!startPoint || !lookAheadPoint) return;

      const lat1 = (startPoint[1] * Math.PI) / 180;
      const lat2 = (lookAheadPoint[1] * Math.PI) / 180;
      const lon1 = (startPoint[0] * Math.PI) / 180;
      const lon2 = (lookAheadPoint[0] * Math.PI) / 180;
      const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
      const initialBearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      const startElevation = elevationData.length > 0 ? elevationData[0].elevation : 0;
      const { zoomAdjust, pitchAdjust } = calculateTerrainAwareAdjustments(startElevation, elevationData, 0);

      mapRef.current.flyTo({
        center: startPoint as [number, number],
        zoom: Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_ZOOM,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_ZOOM, preset.zoom - zoomAdjust)
        ),
        pitch: Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_PITCH,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_PITCH, preset.pitch - pitchAdjust)
        ),
        bearing: initialBearing,
        duration: INTRO_DURATION,
        easing: (value) => 1 - Math.pow(1 - value, 3),
      });

      smoothBearingRef.current = initialBearing;
      targetBearingRef.current = initialBearing;
    } else if (animationPhase === 'outro' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
      mapRef.current.fitBounds(bounds, {
        padding: 100,
        pitch: 45,
        bearing: 0,
        duration: OUTRO_DURATION,
        easing: (value) => 1 - Math.pow(1 - value, 2),
      } as maplibregl.FitBoundsOptions);
    } else if (animationPhase === 'idle' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [
    allCoordinates,
    animationPhase,
    elevationData,
    followBehindPreset,
    isMapLoaded,
    mapRef,
    smoothBearingRef,
    targetBearingRef,
  ]);
}
