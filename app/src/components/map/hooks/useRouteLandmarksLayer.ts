import { useEffect, type MutableRefObject } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { RouteLandmark } from '@/types/landmarks';
import {
  landmarkTextHaloWidth,
  landmarkTextOpacityExpression,
  landmarkTextSizeExpression,
} from '@/components/map/landmarkLabelStyle';
import {
  LANDMARK_GLYPH_KEYS,
  PINHEAD_PATHS,
  colorForLandmark,
  glyphForLandmark,
} from '@/components/map/landmarkGlyphs';

const SOURCE = 'route-landmarks';
const ICON = 'route-landmarks-icon';
const LABEL = 'route-landmarks-label';
const IMAGE_PREFIX = 'route-landmark-glyph-';

function data(landmarks: RouteLandmark[], selectedId: string | null): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: landmarks.map((landmark) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [landmark.lon, landmark.lat] },
    properties: {
      landmarkId: landmark.id,
      title: landmark.elevation && ['highest-point', 'high-point', 'summit'].includes(landmark.type) ? `${landmark.title}\n${Math.round(landmark.elevation).toLocaleString()} m` : landmark.title,
      importance: landmark.importance,
      icon: glyphForLandmark(landmark),
      color: landmark.color ?? colorForLandmark(landmark),
      opacity: landmark.source === 'automatic' ? 0.92 : 1,
      selected: landmark.id === selectedId,
    },
  })) };
}

function glyphImage(kind: string) {
  const canvas = document.createElement('canvas'); canvas.width = 36; canvas.height = 36;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, 36, 36); context.fillStyle = '#ffffff';
  context.scale(2.4, 2.4);
  context.fill(new Path2D(PINHEAD_PATHS[kind] ?? PINHEAD_PATHS.pin));
  return context.getImageData(0, 0, 36, 36);
}

interface UseRouteLandmarksLayerParams {
  isMapLoaded: boolean;
  labelFade?: boolean;
  labelScale?: number;
  landmarks: RouteLandmark[];
  mapRef: MutableRefObject<maplibregl.Map | null>;
  /** Called when a landmark icon or label is clicked on the map. */
  onSelectLandmark?: (landmarkId: string) => void;
  selectedLandmarkId?: string | null;
}

export function useRouteLandmarksLayer({
  isMapLoaded,
  labelFade = true,
  labelScale = 1,
  landmarks,
  mapRef,
  onSelectLandmark,
  selectedLandmarkId = null,
}: UseRouteLandmarksLayerParams) {
  useEffect(() => {
    const map = mapRef.current; if (!map || !isMapLoaded) return;
    LANDMARK_GLYPH_KEYS.forEach((kind) => {
      const imageId = `${IMAGE_PREFIX}${kind}`;
      if (!map.hasImage(imageId)) map.addImage(imageId, glyphImage(kind), { sdf: true });
    });
    if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: 'geojson', data: data([], null) });
    if (!map.getLayer(ICON)) map.addLayer({ id: ICON, type: 'symbol', source: SOURCE, layout: {
      // The selected landmark draws larger and always wins placement, so the
      // one being edited stays visible while its fields change.
      'icon-image': ['concat', IMAGE_PREFIX, ['get', 'icon']], 'icon-size': ['*', ['case', ['boolean', ['get', 'selected'], false], 1.35, 1], ['interpolate', ['linear'], ['zoom'], 7, 0.52, 9, 0.62, 15, 0.92]], 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'icon-allow-overlap': ['boolean', ['get', 'selected'], false], 'symbol-sort-key': ['get', 'importance'],
    }, paint: { 'icon-color': ['get', 'color'], 'icon-opacity': ['get', 'opacity'] } });
    if (!map.getLayer(LABEL)) map.addLayer({ id: LABEL, type: 'symbol', source: SOURCE, layout: {
      'text-field': ['get', 'title'], 'text-font': ['Open Sans Bold'], 'text-size': landmarkTextSizeExpression(labelScale), 'text-max-width': 11, 'text-offset': [0, 1.7], 'text-anchor': 'top', 'text-optional': true, 'text-pitch-alignment': 'viewport', 'symbol-sort-key': ['get', 'importance'],
    }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#030506', 'text-halo-width': landmarkTextHaloWidth(labelScale), 'text-halo-blur': 0.6, 'text-opacity': landmarkTextOpacityExpression(labelFade) } });
    (map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(data(landmarks, selectedLandmarkId));
  }, [isMapLoaded, labelFade, labelScale, landmarks, mapRef, selectedLandmarkId]);

  // The layer is only added once, so size and fade changes have to be pushed
  // onto the existing layer rather than waiting for a re-add.
  useEffect(() => {
    const map = mapRef.current; if (!map || !isMapLoaded || !map.getLayer(LABEL)) return;
    map.setLayoutProperty(LABEL, 'text-size', landmarkTextSizeExpression(labelScale));
    map.setPaintProperty(LABEL, 'text-halo-width', landmarkTextHaloWidth(labelScale));
    map.setPaintProperty(LABEL, 'text-opacity', landmarkTextOpacityExpression(labelFade));
  }, [isMapLoaded, labelFade, labelScale, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !onSelectLandmark) return;

    const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
      const landmarkId = event.features?.[0]?.properties?.landmarkId;
      if (typeof landmarkId !== 'string') return;
      onSelectLandmark(landmarkId);
    };
    const showPointer = () => { map.getCanvas().style.cursor = 'pointer'; };
    const clearPointer = () => { map.getCanvas().style.cursor = ''; };

    for (const layerId of [ICON, LABEL]) {
      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, showPointer);
      map.on('mouseleave', layerId, clearPointer);
    }

    return () => {
      for (const layerId of [ICON, LABEL]) {
        map.off('click', layerId, handleClick);
        map.off('mouseenter', layerId, showPointer);
        map.off('mouseleave', layerId, clearPointer);
      }
    };
  }, [isMapLoaded, mapRef, onSelectLandmark]);
}
