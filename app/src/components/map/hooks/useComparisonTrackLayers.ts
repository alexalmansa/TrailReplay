import { useEffect, type MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import type { ComparisonTrack } from '@/types';

interface UseComparisonTrackLayersParams {
  comparisonTracks: ComparisonTrack[];
  isMapLoaded: boolean;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  progress: number;
}

export function useComparisonTrackLayers({
  comparisonTracks,
  isMapLoaded,
  mapRef,
  progress,
}: UseComparisonTrackLayersParams) {
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    ['comparison-trail-line', 'comparison-trail-completed', 'comparison-position-glow', 'comparison-track-label'].forEach((layerId) => {
      if (mapRef.current!.getLayer(layerId)) mapRef.current!.removeLayer(layerId);
    });
    ['comparison-trail', 'comparison-trail-completed', 'comparison-position', 'comparison-track-label'].forEach((sourceId) => {
      if (mapRef.current!.getSource(sourceId)) mapRef.current!.removeSource(sourceId);
    });

    if (comparisonTracks.length === 0) return;

    const comparisonTrack = comparisonTracks[0];
    const coords = comparisonTrack.track.points.map((point) => [point.lon, point.lat]);

    mapRef.current.addSource('comparison-trail', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });
    mapRef.current.addLayer({
      id: 'comparison-trail-line',
      type: 'line',
      source: 'comparison-trail',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': comparisonTrack.color, 'line-width': 4, 'line-opacity': 0.5 },
    });

    mapRef.current.addSource('comparison-trail-completed', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
    });
    mapRef.current.addLayer({
      id: 'comparison-trail-completed',
      type: 'line',
      source: 'comparison-trail-completed',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': comparisonTrack.color, 'line-width': 6 },
    });

    mapRef.current.addSource('comparison-position', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords[0] || [0, 0] } },
    });
    mapRef.current.addLayer({
      id: 'comparison-position-glow',
      type: 'circle',
      source: 'comparison-position',
      paint: {
        'circle-radius': 8,
        'circle-color': comparisonTrack.color,
        'circle-opacity': 0.6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    mapRef.current.addSource('comparison-track-label', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { label: comparisonTrack.name },
        geometry: { type: 'Point', coordinates: coords[0] || [0, 0] },
      },
    });
    mapRef.current.addLayer({
      id: 'comparison-track-label',
      type: 'symbol',
      source: 'comparison-track-label',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-offset': [0, -2],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': comparisonTrack.color,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    });
  }, [comparisonTracks, isMapLoaded, mapRef]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || comparisonTracks.length === 0) return;

    const comparisonTrack = comparisonTracks[0];
    if (!comparisonTrack.visible) return;

    const points = comparisonTrack.track.points;
    if (points.length === 0) return;

    const targetDistance = comparisonTrack.track.totalDistance * progress;
    let pointIndex = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].distance >= targetDistance) {
        pointIndex = i;
        break;
      }
      pointIndex = i;
    }

    const point = points[pointIndex];
    const currentCoord: [number, number] = [point.lon, point.lat];

    const completed: number[][] = [];
    for (const currentPoint of points) {
      if (currentPoint.distance <= targetDistance) {
        completed.push([currentPoint.lon, currentPoint.lat]);
      } else {
        break;
      }
    }

    if (mapRef.current.getSource('comparison-trail-completed') && completed.length > 1) {
      (mapRef.current.getSource('comparison-trail-completed') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completed },
      });
    }

    if (mapRef.current.getSource('comparison-position')) {
      (mapRef.current.getSource('comparison-position') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: currentCoord },
      });
    }

    if (mapRef.current.getSource('comparison-track-label')) {
      (mapRef.current.getSource('comparison-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: comparisonTrack.name },
        geometry: { type: 'Point', coordinates: currentCoord },
      });
    }
  }, [comparisonTracks, isMapLoaded, mapRef, progress]);
}
