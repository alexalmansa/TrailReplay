import { useEffect } from 'react';
import type { Feature, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { getActivityIconMarkerHtml, isSvgActivityIcon } from '@/utils/activityIcons';
import { getHeartRateColor } from '@/utils/gpxParser';
import { buildSegmentLineFeatures } from '@/utils/trailColorFeatures';
import { buildColorZoneLineFeatures } from '@/utils/trailColorFeatures';
import type { TrailColorZone } from '@/types';
import { smoothBearing } from '@/components/map/cameraUtils';
import { getIntroCameraPose, getPlaybackCameraPose } from '@/utils/replayCameraPlan';

interface UseTrailPlaybackCameraParams {
  activeTrack: { points: Array<{ heartRate: number | null }> } | null | undefined;
  allCoordinates: number[][];
  cameraCoordinates: number[][];
  animationPhase: 'idle' | 'preloading' | 'intro' | 'playing' | 'outro' | 'ended';
  cameraMode: 'overview' | 'follow' | 'follow-behind';
  completedCoordinates: number[][];
  computedJourney: { coordinates: Array<{ heartRate: number | null }> } | null;
  currentBearing: number;
  currentIcon: string;
  currentPosition: { lat: number; lon: number } | null;
  currentSegment?: {
    segment: {
      segmentIndex?: number;
      startCoordIndex: number;
      endCoordIndex: number;
      transportMode?: string;
    };
    localProgress?: number;
  } | null;
  currentTrackColor: string | null;
  currentTrackName: string | null;
  elevationData: Array<{ elevation: number; progress?: number }>;
  followBehindZoomLevel: number;
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
  isExporting: boolean;
  trailStyle: {
    colorMode: 'fixed' | 'heartRate' | 'zones';
    colorZones: readonly TrailColorZone[];
    currentIcon: string;
    markerColor: string;
    markerSize: number;
    markerType: 'icon' | 'dot';
    showCircle: boolean;
    showMarker: boolean;
    showTrackLabels: boolean;
    trailColor: string;
  };
}

export function useTrailPlaybackCamera({
  activeTrack,
  allCoordinates,
  cameraCoordinates,
  animationPhase,
  cameraMode,
  completedCoordinates,
  computedJourney,
  currentBearing,
  currentIcon,
  currentPosition,
  currentSegment,
  currentTrackColor,
  currentTrackName,
  elevationData,
  followBehindZoomLevel,
  isExporting,
  isInTransport,
  isMapLoaded,
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
      : currentIcon || trailStyle.currentIcon;

    if (!shouldShowMarker) {
      markerRef.current?.remove();
      markerRef.current = null;
    } else {
      const markerColor = trailStyle.markerColor;
      let markerHtml: string;

      if (trailStyle.markerType === 'dot') {
        const dotSize = Math.round(14 * trailStyle.markerSize);
        markerHtml = `<div style="
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: ${markerColor};
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          flex-shrink: 0;
        "></div>`;
      } else {
        const fontSize = Math.round(28 * trailStyle.markerSize);
        const circleSize = Math.round(40 * trailStyle.markerSize);
        const iconColor = isSvgActivityIcon(icon) ? markerColor : currentColor;
        const iconHtml = getActivityIconMarkerHtml(icon, fontSize, iconColor);
        const glowBackground = isSvgActivityIcon(icon) ? 'rgba(22, 32, 40, 0.72)' : `${markerColor}40`;
        markerHtml = `
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
      }

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
      } else if (trailStyle.colorMode === 'zones') {
        // Keep the completed line to the marker's exact fractional coordinate.
        // `completedCoordinates` includes the next whole point followed by the
        // interpolated marker position, so deriving an index from its length
        // would draw the line ahead of the marker between GPS samples.
        const activeSegment = currentSegment?.segment;
        const localProgress = currentSegment?.localProgress;
        const completedBaseIndex = activeSegment && localProgress !== undefined
          ? activeSegment.startCoordIndex + (
              Math.max(0, Math.min(1, localProgress))
              * (activeSegment.endCoordIndex - activeSegment.startCoordIndex)
            )
          : playbackProgress * Math.max(0, allCoordinates.length - 1);
        const zoneFeatures = buildColorZoneLineFeatures({
          coordinates: allCoordinates,
          colorZones: trailStyle.colorZones,
          fallbackColor: trailStyle.trailColor,
          maxCoordIndex: completedBaseIndex,
          partialEndpoint: currentPosition ? [currentPosition.lon, currentPosition.lat] : null,
        });

        (mapRef.current.getSource('trail-completed') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: zoneFeatures,
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

    if (animationPhase === 'playing' && cameraMode !== 'overview') {
      const targetPose = getPlaybackCameraPose({
        cameraMode,
        coordinates: cameraCoordinates,
        elevationData,
        followBehindZoomLevel,
        progress: playbackProgress,
      });
      if (!targetPose) return;

      const currentZoom = mapRef.current.getZoom();
      const newZoom = currentZoom < targetPose.zoom
        ? Math.min(currentZoom + 0.1, targetPose.zoom)
        : Math.max(currentZoom - 0.1, targetPose.zoom);

      if (cameraMode === 'follow') {
        mapRef.current.easeTo({
          ...targetPose,
          center: [currentPosition.lon, currentPosition.lat],
          duration: 100,
        });
      } else {
        mapRef.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: newZoom,
          pitch: targetPose.pitch,
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
    allCoordinates,
    animationPhase,
    cameraMode,
    cameraCoordinates,
    completedCoordinates,
    computedJourney,
    currentBearing,
    currentIcon,
    currentPosition,
    currentSegment,
    currentTrackColor,
    currentTrackName,
    elevationData,
    followBehindZoomLevel,
    isInTransport,
    isMapLoaded,
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

    const introPose = getIntroCameraPose({
      cameraMode,
      coordinates: cameraCoordinates,
      elevationData,
      followBehindZoomLevel,
      progress: 0,
    });

    if (animationPhase === 'intro' && introPose) {
      mapRef.current.flyTo({
        ...introPose,
        duration: INTRO_DURATION,
        easing: (value) => 1 - Math.pow(1 - value, 3),
      });

      smoothBearingRef.current = introPose.bearing;
      targetBearingRef.current = introPose.bearing;
    } else if (animationPhase === 'outro' && cameraMode !== 'overview' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
      mapRef.current.fitBounds(bounds, {
        padding: 100,
        pitch: 45,
        bearing: 0,
        duration: OUTRO_DURATION,
        easing: (value) => 1 - Math.pow(1 - value, 2),
      } as maplibregl.FitBoundsOptions);
    } else if (animationPhase === 'idle' && !isExporting && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [
    allCoordinates,
    animationPhase,
    cameraMode,
    cameraCoordinates,
    elevationData,
    followBehindZoomLevel,
    isExporting,
    isMapLoaded,
    mapRef,
    smoothBearingRef,
    targetBearingRef,
  ]);
}
