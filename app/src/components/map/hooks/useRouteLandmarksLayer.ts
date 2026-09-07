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
  LANDMARK_ICON_LAYER_ID,
  LANDMARK_IMAGE_PREFIX,
  LANDMARK_LABEL_LAYER_ID,
  LANDMARK_SOURCE_ID,
  landmarkIconLayer,
  landmarkLabelLayer,
} from '@/components/map/landmarkLayers';
import {
  LANDMARK_GLYPH_KEYS,
  PINHEAD_PATHS,
  colorForLandmark,
  glyphForLandmark,
} from '@/components/map/landmarkGlyphs';

const SOURCE = LANDMARK_SOURCE_ID;
const ICON = LANDMARK_ICON_LAYER_ID;
const LABEL = LANDMARK_LABEL_LAYER_ID;
const IMAGE_PREFIX = LANDMARK_IMAGE_PREFIX;

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
    if (!map.getLayer(ICON)) map.addLayer(landmarkIconLayer());
    if (!map.getLayer(LABEL)) map.addLayer(landmarkLabelLayer(labelScale, labelFade));
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
