import type maplibregl from 'maplibre-gl';
import type { MapFilter } from '@/types';
import {
  STATIC_BASEMAP_LAYER_IDS,
  STATIC_FALLBACK_LAYER_IDS,
} from '@/components/map/mapStyle';

export interface BasemapFilterPaint {
  'raster-saturation': number;
  'raster-contrast': number;
  'raster-brightness-max': number;
}

// Applied to the imagery only (see MapFilter). Values are deliberately gentle:
// the point is to push the basemap back so the route reads first, not to make
// the terrain unreadable.
export const BASEMAP_FILTER_PAINT: Record<MapFilter, BasemapFilterPaint> = {
  none: { 'raster-saturation': 0, 'raster-contrast': 0, 'raster-brightness-max': 1 },
  muted: { 'raster-saturation': -0.55, 'raster-contrast': 0, 'raster-brightness-max': 0.92 },
  mono: { 'raster-saturation': -1, 'raster-contrast': 0.1, 'raster-brightness-max': 1 },
  noir: { 'raster-saturation': -1, 'raster-contrast': 0.35, 'raster-brightness-max': 0.7 },
};

/** Every raster basemap layer the filter has to stay in sync with. */
export const FILTERABLE_BASEMAP_LAYER_IDS = [
  ...STATIC_BASEMAP_LAYER_IDS,
  ...STATIC_FALLBACK_LAYER_IDS,
  'wayback',
  'fallback-wayback',
  'enhanced-hillshade',
] as const;

export function applyBasemapFilter(map: maplibregl.Map, filter: MapFilter) {
  const paint = BASEMAP_FILTER_PAINT[filter] ?? BASEMAP_FILTER_PAINT.none;

  FILTERABLE_BASEMAP_LAYER_IDS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    (Object.keys(paint) as (keyof BasemapFilterPaint)[]).forEach((property) => {
      map.setPaintProperty(layerId, property, paint[property]);
    });
  });
}
