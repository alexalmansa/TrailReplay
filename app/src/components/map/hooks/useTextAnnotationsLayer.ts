import { useEffect, type MutableRefObject } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { TextAnnotation, UnitSystem } from '@/types';
import { convertElevation } from '@/utils/units';

const SOURCE_ID = 'route-annotations';
const ACTIVE_SOURCE_ID = 'route-annotations-active';
const MARKER_LAYER_ID = 'route-annotations-marker';
const HALO_LAYER_ID = 'route-annotations-halo';
const CARD_LAYER_ID = 'route-annotations-card';
const CARD_IMAGE_ID = 'route-annotations-card-image';

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  if (expanded.length !== 6) {
    return `rgba(243, 177, 51, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function emptyFeatureCollection(): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function buildAnnotationsFeatureCollection(
  annotations: TextAnnotation[],
  activeAnnotationId: string | null,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: annotations.map((annotation) => ({
      type: 'Feature',
      properties: {
        id: annotation.id,
        isActive: annotation.id === activeAnnotationId,
        color: annotation.color,
        haloColor: withAlpha(annotation.color, annotation.id === activeAnnotationId ? 0.24 : 0.16),
      },
      geometry: {
        type: 'Point',
        coordinates: [annotation.lon, annotation.lat],
      },
    })),
  };
}

function buildActiveAnnotationFeatureCollection(annotation: TextAnnotation | null): FeatureCollection<Point> {
  if (!annotation) {
    return emptyFeatureCollection();
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: annotation.id,
        },
        geometry: {
          type: 'Point',
          coordinates: [annotation.lon, annotation.lat],
        },
      },
    ],
  };
}

function createAnnotationCardImage(annotation: TextAnnotation, unitSystem: UnitSystem) {
  const scale = 2;
  const width = 320;
  const height = 116;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);

  const radius = 20;
  const shadowBlur = 24;
  const shadowY = 16;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.36)';
  context.shadowBlur = shadowBlur;
  context.shadowOffsetY = shadowY;
  context.fillStyle = 'rgba(11, 15, 17, 0.96)';
  roundRect(context, 0, 0, width, height - 12, radius);
  context.fill();
  context.restore();

  context.save();
  context.fillStyle = annotation.color;
  roundRect(context, 0, 0, width, 10 + radius, radius);
  context.rect(0, 10, width, radius);
  context.fill();
  context.restore();

  context.save();
  context.fillStyle = annotation.color;
  context.beginPath();
  context.moveTo((width / 2) - 18, height - 12);
  context.lineTo(width / 2, height);
  context.lineTo((width / 2) + 18, height - 12);
  context.closePath();
  context.fill();
  context.restore();

  const title = annotation.title.trim() || 'Annotation';
  const detail = annotation.subtitle?.trim()
    || (annotation.elevation !== undefined
      ? `${Math.round(convertElevation(annotation.elevation, unitSystem)).toLocaleString()} ${unitSystem === 'metric' ? 'm' : 'ft'}`
      : `${Math.round(annotation.progress * 100)}%`);

  context.textAlign = 'center';
  context.fillStyle = '#ffffff';
  context.font = '800 30px Inter, sans-serif';
  context.textBaseline = 'middle';
  context.fillText(fitText(context, title, width - 36), width / 2, 48);

  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  context.font = '700 20px Inter, sans-serif';
  context.fillText(fitText(context, detail, width - 36), width / 2, 78);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 0 && context.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}…`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

interface UseTextAnnotationsLayerParams {
  activeAnnotationId: string | null;
  annotations: TextAnnotation[];
  isMapLoaded: boolean;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  unitSystem: UnitSystem;
}

export function useTextAnnotationsLayer({
  activeAnnotationId,
  annotations,
  isMapLoaded,
  mapRef,
  unitSystem,
}: UseTextAnnotationsLayerParams) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
    }

    if (!map.getSource(ACTIVE_SOURCE_ID)) {
      map.addSource(ACTIVE_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
    }

    if (!map.getLayer(HALO_LAYER_ID)) {
      map.addLayer({
        id: HALO_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isActive'], false], 14, 9],
          'circle-color': ['get', 'haloColor'],
          'circle-stroke-width': 0,
          'circle-pitch-alignment': 'map',
          'circle-opacity': ['case', ['boolean', ['get', 'isActive'], false], 1, 0.9],
        },
      });
    }

    if (!map.getLayer(MARKER_LAYER_ID)) {
      map.addLayer({
        id: MARKER_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isActive'], false], 7, 5],
          'circle-color': '#101417',
          'circle-stroke-width': ['case', ['boolean', ['get', 'isActive'], false], 3, 2],
          'circle-stroke-color': ['get', 'color'],
          'circle-pitch-alignment': 'map',
          'circle-opacity': 1,
        },
      });
    }

    if (!map.getLayer(CARD_LAYER_ID)) {
      map.addLayer({
        id: CARD_LAYER_ID,
        type: 'symbol',
        source: ACTIVE_SOURCE_ID,
        layout: {
          'icon-image': CARD_IMAGE_ID,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-offset': [0, -18],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.34,
            12, 0.4,
            14, 0.48,
            16, 0.56,
          ],
          'icon-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport',
        },
        paint: {
          'icon-opacity': 1,
        },
      });
    }

    const markerSource = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    markerSource?.setData(buildAnnotationsFeatureCollection(annotations, activeAnnotationId));

    const activeAnnotation = activeAnnotationId
      ? annotations.find((annotation) => annotation.id === activeAnnotationId) ?? null
      : null;

    const activeSource = map.getSource(ACTIVE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    activeSource?.setData(buildActiveAnnotationFeatureCollection(activeAnnotation));

    if (activeAnnotation) {
      const imageData = createAnnotationCardImage(activeAnnotation, unitSystem);
      if (imageData) {
        if (map.hasImage(CARD_IMAGE_ID)) {
          map.updateImage(CARD_IMAGE_ID, imageData);
        } else {
          map.addImage(CARD_IMAGE_ID, imageData);
        }
      }
    }

    return () => {
    };
  }, [
    activeAnnotationId,
    annotations,
    isMapLoaded,
    mapRef,
    unitSystem,
  ]);
}
