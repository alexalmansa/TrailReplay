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
import { cameraReactivityFromStability, smoothBearing, smoothPitch, smoothZoom } from '@/components/map/cameraUtils';
import { getIntroCameraPose, getPlaybackCameraPose } from '@/utils/replayCameraPlan';

interface UseTrailPlaybackCameraParams {
  activeTrack: { color: string; points: Array<{ heartRate: number | null }> } | null | undefined;
  allCoordinates: number[][];
  cameraCoordinates: number[][];
  animationPhase: 'idle' | 'preloading' | 'intro' | 'playing' | 'outro' | 'ended';
  cameraMode: 'overview' | 'follow' | 'follow-behind';
  /** 0 = maximally stable/smooth camera, 1 = maximally reactive/tight tracking. */
  cameraStability: number;
  completedCoordinates: number[][];
  computedJourney: { coordinates: Array<{ heartRate: number | null }> } | null;
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
  isDeterministicExport: boolean;
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

export function resolvePlaybackMarkerColor(
  configuredMarkerColor: string,
  activeTrackColor: string | null | undefined,
  currentTrackColor: string | null | undefined,
): string {
  const markerFollowsTrackColors = !!activeTrackColor
    && configuredMarkerColor.toLowerCase() === activeTrackColor.toLowerCase();
  return markerFollowsTrackColors && currentTrackColor
    ? currentTrackColor
    : configuredMarkerColor;
}

export function updatePlaybackMarkerElement(
  element: HTMLElement,
  markerHtml: string,
  label: { color: string; text: string } | null,
) {
  element.innerHTML = markerHtml;
  if (!label) return;

  const labelElement = document.createElement('div');
  labelElement.className = 'tr-marker-label';
  labelElement.textContent = label.text;
  Object.assign(labelElement.style, {
    bottom: 'calc(100% + 8px)',
    color: label.color,
    fontSize: '12px',
    fontWeight: '700',
    left: '50%',
    lineHeight: '1.2',
    pointerEvents: 'none',
    position: 'absolute',
    textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
  });
  element.appendChild(labelElement);
}

export function useTrailPlaybackCamera({
  activeTrack,
  allCoordinates,
  cameraCoordinates,
  animationPhase,
  cameraMode,
  cameraStability,
  completedCoordinates,
  computedJourney,
  currentIcon,
  currentPosition,
  currentSegment,
  currentTrackColor,
  currentTrackName,
  elevationData,
  followBehindZoomLevel,
  isDeterministicExport,
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

    const shouldShowPlaybackAdornment = (trailStyle.showMarker || trailStyle.showTrackLabels) &&
      (animationPhase === 'playing' || (animationPhase === 'idle' && playbackProgress > 0));
    const currentColor = currentTrackColor || trailStyle.trailColor;
    const icon = isInTransport
      ? TRANSPORT_ICONS[currentSegment?.segment.transportMode || 'car'] || '🚗'
      : currentIcon || trailStyle.currentIcon;

    if (!shouldShowPlaybackAdornment) {
      markerRef.current?.remove();
      markerRef.current = null;
    } else {
      const markerColor = resolvePlaybackMarkerColor(
        trailStyle.markerColor,
        activeTrack?.color,
        currentTrackColor,
      );
      let markerHtml = '';

      if (trailStyle.showMarker && trailStyle.markerType === 'dot') {
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
      } else if (trailStyle.showMarker) {
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
        element.style.alignItems = 'center';
        element.style.display = 'flex';
        element.style.justifyContent = 'center';
        element.style.position = 'relative';
        element.style.zIndex = '100';
        updatePlaybackMarkerElement(
          element,
          markerHtml,
          trailStyle.showTrackLabels && currentTrackName
            ? { color: currentColor, text: currentTrackName }
            : null,
        );
        markerRef.current = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([currentPosition.lon, currentPosition.lat])
          .addTo(mapRef.current);
      } else {
        markerRef.current.setLngLat([currentPosition.lon, currentPosition.lat]);
        updatePlaybackMarkerElement(
          markerRef.current.getElement(),
          markerHtml,
          trailStyle.showTrackLabels && currentTrackName
            ? { color: currentColor, text: currentTrackName }
            : null,
        );
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

    if (animationPhase === 'playing' && cameraMode !== 'overview') {
      const targetPose = getPlaybackCameraPose({
        cameraMode,
        coordinates: cameraCoordinates,
        elevationData,
        followBehindZoomLevel,
        progress: playbackProgress,
      });
      if (!targetPose) return;

      // Follow the replay plan's evenly sampled forward heading. Raw GPX
      // bearings can jump at uneven samples and make tight turns feel abrupt.
      const reactivity = cameraReactivityFromStability(cameraStability);
      targetBearingRef.current = targetPose.bearing;
      smoothBearingRef.current = smoothBearing(
        smoothBearingRef.current,
        targetPose.bearing,
        undefined,
        undefined,
        reactivity,
      );

      const currentZoom = mapRef.current.getZoom();
      const newZoom = smoothZoom(currentZoom, targetPose.zoom, undefined, undefined, reactivity);
      const newPitch = smoothPitch(mapRef.current.getPitch(), targetPose.pitch, undefined, undefined, reactivity);

      // With 3D terrain the marker is drawn on the terrain surface, while the
      // camera aims at the centre point's elevation. MapLibre normally keeps
      // that elevation clamped to the terrain for us — but it stops doing so
      // for the rest of the session as soon as any `easeTo` has run with
      // terrain enabled (`_elevationFreeze` is only cleared for eases that
      // pass `freezeElevation`), and `jumpTo` never updates it at all. The
      // replay camera eases every frame and the export jumps every frame, so
      // the centre stays pinned at whatever elevation it last had while the
      // marker climbs away from it: on a summit the marker leaves the top of
      // the frame, and the error grows with altitude. Pass the elevation
      // explicitly with the rest of the pose. `queryTerrainElevation` already
      // includes the terrain exaggeration and returns null when terrain is
      // off, in which case we leave the elevation alone.
      const terrainElevation = mapRef.current.queryTerrainElevation([
        currentPosition.lon,
        currentPosition.lat,
      ]);
      const centerElevation = typeof terrainElevation === 'number' && Number.isFinite(terrainElevation)
        ? { elevation: terrainElevation }
        : {};

      // `easeTo` ignores an elevation passed in options - it derives its own
      // target from the terrain and interpolates toward it, which lags behind
      // on a continuous climb because every frame replaces the previous ease
      // before it finishes. Setting it here first makes the eased path start
      // from the correct height as well.
      if (centerElevation.elevation !== undefined
        && Math.abs(mapRef.current.transform.elevation - centerElevation.elevation) > 0.25) {
        mapRef.current.setCenterElevation(centerElevation.elevation);
      }

      // During deterministic export, camera interpolation must not run on its
      // own clock. The exporter advances playback one frame at a time and waits
      // for this exact pose to render before encoding it.
      if (isDeterministicExport) {
        mapRef.current.jumpTo({
          ...targetPose,
          ...centerElevation,
          center: [currentPosition.lon, currentPosition.lat],
          zoom: cameraMode === 'follow' ? targetPose.zoom : newZoom,
          pitch: cameraMode === 'follow' ? targetPose.pitch : newPitch,
          bearing: cameraMode === 'follow' ? targetPose.bearing : smoothBearingRef.current,
        });
      } else if (cameraMode === 'follow') {
        mapRef.current.easeTo({
          ...targetPose,
          ...centerElevation,
          center: [currentPosition.lon, currentPosition.lat],
          duration: 100,
        });
      } else {
        mapRef.current.easeTo({
          ...centerElevation,
          center: [currentPosition.lon, currentPosition.lat],
          zoom: newZoom,
          pitch: newPitch,
          bearing: smoothBearingRef.current,
          duration: 100,
          easing: (value: number) => value,
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
    cameraStability,
    cameraCoordinates,
    completedCoordinates,
    computedJourney,
    currentIcon,
    currentPosition,
    currentSegment,
    currentTrackColor,
    currentTrackName,
    elevationData,
    followBehindZoomLevel,
    isDeterministicExport,
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
        // A linear fly-in reaches the playback pose exactly at the end. The
        // old strong ease-out arrived visually early, which read as a pause
        // before the marker started moving.
        easing: (value) => value,
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
