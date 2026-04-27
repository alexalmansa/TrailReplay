import { useEffect } from 'react';
import type { Feature, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import { getHeartRateColor } from '@/utils/gpxParser';
import { buildSegmentLineFeatures } from '@/utils/trailColorFeatures';

const INITIAL_FIT_BOUNDS_DELAY_MS = 100;
const INITIAL_ZOOM_OUT_DELAY_MS = 2000;
const INITIAL_ZOOM_OUT_STEPS = 4;
const INITIAL_ZOOM_OUT_STEP_DELAY_MS = 50;

function simulateInitialZoomOut(map: maplibregl.Map) {
  const container = map.getContainer();
  const canvas = container.querySelector('canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;

  canvas.dispatchEvent(new MouseEvent('mouseenter', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    view: window,
  }));

  canvas.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    view: window,
  }));

  for (let index = 0; index < INITIAL_ZOOM_OUT_STEPS; index++) {
    window.setTimeout(() => {
      canvas.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        deltaY: 100,
        deltaMode: 0,
        view: window,
      }));
    }, index * INITIAL_ZOOM_OUT_STEP_DELAY_MS);
  }
}

interface UseTrailLayerDataParams {
  activeTrack: { points: Array<{ heartRate: number | null }> } | null | undefined;
  allCoordinates: number[][];
  animationPhase: string;
  computedJourney: { coordinates: Array<{ heartRate: number | null }> } | null;
  isMapLoaded: boolean;
  loadZoomDoneRef: React.MutableRefObject<boolean>;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  playbackProgress: number;
  segmentTimings: Array<{
    segmentIndex: number;
    type: 'track' | 'transport';
    startCoordIndex: number;
    endCoordIndex: number;
    progressStartRatio: number;
    progressEndRatio: number;
    color?: string;
  }>;
  trailColor: string;
  colorMode: 'fixed' | 'heartRate';
}

export function useTrailLayerData({
  activeTrack,
  allCoordinates,
  animationPhase,
  colorMode,
  computedJourney,
  isMapLoaded,
  loadZoomDoneRef,
  mapRef,
  playbackProgress,
  segmentTimings,
  trailColor,
}: UseTrailLayerDataParams) {
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const timeoutIds: number[] = [];

    if (colorMode === 'heartRate' && allCoordinates.length > 0 && mapRef.current.getSource('trail-line')) {
      const features: Array<Feature<LineString, { color: string }>> = [];
      const heartRatePoints = activeTrack && !computedJourney
        ? activeTrack.points
        : computedJourney?.coordinates ?? [];

      for (let index = 0; index < allCoordinates.length - 1; index++) {
        const heartRate = heartRatePoints[index]?.heartRate;
        features.push({
          type: 'Feature',
          properties: { color: heartRate ? getHeartRateColor(heartRate, 180) : trailColor },
          geometry: {
            type: 'LineString',
            coordinates: [allCoordinates[index], allCoordinates[index + 1]],
          },
        });
      }

      (mapRef.current.getSource('trail-line') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      });
    } else if (allCoordinates.length > 0 && mapRef.current.getSource('trail-line')) {
      const coloredFeatures = buildSegmentLineFeatures({
        coordinates: allCoordinates,
        segmentTimings,
        fallbackColor: trailColor,
      });

      (mapRef.current.getSource('trail-line') as maplibregl.GeoJSONSource).setData(
        coloredFeatures.length > 0
          ? {
              type: 'FeatureCollection',
              features: coloredFeatures,
            }
          : {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: allCoordinates },
            }
      );
    }

    if (segmentTimings.length > 0 && mapRef.current.getSource('transport-line')) {
      const transportCoordinates: number[][][] = [];

      segmentTimings.forEach((timing) => {
        if (timing.type !== 'transport') return;

        const segmentCoordinates: number[][] = [];
        const startIndex = Math.floor(timing.progressStartRatio * allCoordinates.length);
        const endIndex = Math.ceil(timing.progressEndRatio * allCoordinates.length);

        for (let index = startIndex; index <= endIndex && index < allCoordinates.length; index++) {
          segmentCoordinates.push(allCoordinates[index]);
        }

        if (segmentCoordinates.length > 1) {
          transportCoordinates.push(segmentCoordinates);
        }
      });

      (mapRef.current.getSource('transport-line') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiLineString', coordinates: transportCoordinates },
      });
    }

    if (allCoordinates.length > 0 && animationPhase === 'idle' && playbackProgress === 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));

      const fitBounds = () => {
        if (!mapRef.current) return;
        mapRef.current.fitBounds(bounds, {
          padding: 80,
          duration: 800,
          maxZoom: 12,
          pitch: 0,
          bearing: 0,
        });
      };

      if (!loadZoomDoneRef.current) {
        loadZoomDoneRef.current = true;
        timeoutIds.push(window.setTimeout(fitBounds, INITIAL_FIT_BOUNDS_DELAY_MS));
        timeoutIds.push(window.setTimeout(() => {
          if (!mapRef.current) return;
          simulateInitialZoomOut(mapRef.current);
        }, INITIAL_ZOOM_OUT_DELAY_MS));
      } else {
        timeoutIds.push(window.setTimeout(fitBounds, INITIAL_FIT_BOUNDS_DELAY_MS));
      }
    }

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [
    activeTrack,
    allCoordinates,
    animationPhase,
    colorMode,
    computedJourney,
    isMapLoaded,
    loadZoomDoneRef,
    mapRef,
    playbackProgress,
    segmentTimings,
    trailColor,
  ]);
}
